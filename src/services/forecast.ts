import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { getOrCreateBusinessProfile } from "@/services/business-profile";
import { projectRecurringCommitments } from "@/services/recurring";
import type {
  CashForecastResult,
  DailyCashBucket,
  ForecastInflowItem,
  ForecastOutflowItem,
  ForecastSummary,
} from "@/types/forecast";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface ForecastCalculationOptions {
  overrideStartingCash?: number;
  overrideLateDelayDays?: number;
  overrideStartDate?: Date;
  skipCache?: boolean;
}

/**
 * Calculates a verified, deterministic 30-day daily cash balance forecast.
 * Formula: Balance(t) = Balance(t-1) + Inflows(t) - Outflows(t)
 *
 * Operates purely mathematically in TypeScript with zero LLM text generation.
 */
export async function calculate30DayCashForecast(
  userId: string,
  options: ForecastCalculationOptions = {},
): Promise<CashForecastResult> {
  if (!userId) {
    throw new Error("Tenant isolation violation: userId is required");
  }

  // 1. Fetch user business profile & financial settings
  const profile = await getOrCreateBusinessProfile(userId);
  const currency = profile.currency || "BDT";
  const lateDelayDays =
    options.overrideLateDelayDays ?? profile.latePaymentAssumptionDays ?? 7;
  const minReserveThreshold = profile.minReserveThreshold ?? 50000;

  // 2. Determine starting cash balance
  let startingCash =
    options.overrideStartingCash ?? profile.openingBalance ?? 0;

  // Reconcile with verified cash transactions if no manual starting cash override is provided
  if (
    options.overrideStartingCash === undefined &&
    profile.openingBalanceDate
  ) {
    const historicalTxs = await prisma.transaction.findMany({
      where: {
        userId,
        isProjected: false,
        transactionDate: { gte: profile.openingBalanceDate },
      },
      select: { type: true, amount: true },
    });

    for (const tx of historicalTxs) {
      if (tx.type === "INFLOW") {
        startingCash += tx.amount;
      } else {
        startingCash -= tx.amount;
      }
    }
  }

  startingCash = Math.round(startingCash * 100) / 100;

  // 3. Define 30-day projection horizon
  const today = options.overrideStartDate
    ? new Date(options.overrideStartDate.toISOString().slice(0, 10))
    : new Date(new Date().toISOString().slice(0, 10));

  const dayDates: string[] = [];
  const dateToBucketMap = new Map<string, number>(); // date string -> dayIndex (1..30)

  for (let i = 1; i <= 30; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    dayDates.push(dateStr);
    dateToBucketMap.set(dateStr, i);
  }

  const startDate = new Date(today.getTime() + 1 * 86400000);
  const endDate = new Date(today.getTime() + 30 * 86400000);
  const day1DateStr = dayDates[0];

  // 4. Retrieve unpaid invoices (AR and AP)
  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] },
      remainingAmount: { gt: 0 },
    },
    select: {
      id: true,
      invoiceNumber: true,
      counterparty: true,
      type: true,
      remainingAmount: true,
      dueDate: true,
      status: true,
    },
  });

  // Bucketed inflow & outflow collections: dayIndex (1..30) -> items array
  const dailyInflowsMap = new Map<number, ForecastInflowItem[]>();
  const dailyOutflowsMap = new Map<number, ForecastOutflowItem[]>();

  for (let i = 1; i <= 30; i++) {
    dailyInflowsMap.set(i, []);
    dailyOutflowsMap.set(i, []);
  }

  const todayStr = today.toISOString().slice(0, 10);

  for (const inv of invoices) {
    const rawDueStr = inv.dueDate.toISOString().slice(0, 10);
    const isOverdue = rawDueStr < todayStr || inv.status === "OVERDUE";

    if (inv.type === "RECEIVABLE") {
      // Inflow: apply conservative late payment delay buffer
      let projectedDateStr: string;
      let isDelayed = false;

      if (isOverdue) {
        // Overdue receivables are conservatively projected onto Day 1 or Day 1 + buffer
        projectedDateStr = day1DateStr;
        isDelayed = true;
      } else {
        const rawDueMs = new Date(rawDueStr).getTime();
        const projectedMs = rawDueMs + lateDelayDays * 86400000;
        projectedDateStr = new Date(projectedMs).toISOString().slice(0, 10);
        isDelayed = lateDelayDays > 0;
      }

      // Check if projected receipt date falls into our 30-day window
      const dayIdx = dateToBucketMap.get(projectedDateStr);
      if (dayIdx !== undefined) {
        const items = dailyInflowsMap.get(dayIdx);
        if (items) {
          items.push({
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            counterparty: inv.counterparty,
            amount: Math.round(inv.remainingAmount * 100) / 100,
            originalDueDate: rawDueStr,
            projectedDate: projectedDateStr,
            isDelayed,
            status: inv.status,
          });
        }
      }
    } else {
      // Outflow: AP supplier bill
      let projectedDateStr: string;

      if (isOverdue) {
        // Overdue payable is an immediate Day 1 obligation
        projectedDateStr = day1DateStr;
      } else {
        projectedDateStr = rawDueStr;
      }

      const dayIdx = dateToBucketMap.get(projectedDateStr);
      if (dayIdx !== undefined) {
        const items = dailyOutflowsMap.get(dayIdx);
        if (items) {
          items.push({
            type: "INVOICE_PAYABLE",
            id: inv.id,
            reference: inv.invoiceNumber,
            counterpartyOrCategory: inv.counterparty,
            amount: Math.round(inv.remainingAmount * 100) / 100,
            dueDate: projectedDateStr,
          });
        }
      }
    }
  }

  // 5. Retrieve active Recurring Schedules (Rent, Payroll, Loans)
  const activeSchedules = await prisma.recurringSchedule.findMany({
    where: { userId, isActive: true },
  });

  const projectedCommitments = projectRecurringCommitments(
    activeSchedules,
    startDate,
    endDate,
  );

  for (const commitment of projectedCommitments) {
    const dayIdx = dateToBucketMap.get(commitment.date);
    if (dayIdx !== undefined) {
      const items = dailyOutflowsMap.get(dayIdx);
      if (items) {
        items.push({
          type: "RECURRING_COMMITMENT",
          id: commitment.scheduleId,
          reference: commitment.title,
          counterpartyOrCategory: commitment.category,
          amount: commitment.amount,
          dueDate: commitment.date,
        });
      }
    }
  }

  // 6. Compute 30-day daily balance progression
  const dailyBuckets: DailyCashBucket[] = [];
  let runningBalance = startingCash;
  let totalProjectedInflow = 0;
  let totalProjectedOutflow = 0;

  let minProjectedBalance = startingCash;
  let minBalanceDate = dayDates[0];
  let minBalanceDayIndex = 1;
  let firstReserveBreachDate: string | null = null;
  let firstDeficitDate: string | null = null;
  let deficitDaysCount = 0;

  for (let i = 1; i <= 30; i++) {
    const dateStr = dayDates[i - 1];
    const dateObj = new Date(dateStr);
    const dayOfWeek = DAY_NAMES[dateObj.getUTCDay()];

    const dayOpeningBalance = runningBalance;
    const dayInflowItems = dailyInflowsMap.get(i) || [];
    const dayOutflowItems = dailyOutflowsMap.get(i) || [];

    const dayInflows = dayInflowItems.reduce(
      (acc, item) => acc + item.amount,
      0,
    );
    const dayOutflows = dayOutflowItems.reduce(
      (acc, item) => acc + item.amount,
      0,
    );

    const roundedInflows = Math.round(dayInflows * 100) / 100;
    const roundedOutflows = Math.round(dayOutflows * 100) / 100;

    totalProjectedInflow += roundedInflows;
    totalProjectedOutflow += roundedOutflows;

    const dayClosingBalance =
      Math.round((dayOpeningBalance + roundedInflows - roundedOutflows) * 100) /
      100;

    runningBalance = dayClosingBalance;

    const isBelowReserve = dayClosingBalance < minReserveThreshold;
    const isDeficit = dayClosingBalance < 0;

    if (isDeficit) {
      deficitDaysCount++;
      if (!firstDeficitDate) {
        firstDeficitDate = dateStr;
      }
    }

    if (isBelowReserve && !firstReserveBreachDate) {
      firstReserveBreachDate = dateStr;
    }

    if (dayClosingBalance < minProjectedBalance || i === 1) {
      minProjectedBalance = dayClosingBalance;
      minBalanceDate = dateStr;
      minBalanceDayIndex = i;
    }

    dailyBuckets.push({
      date: dateStr,
      dayIndex: i,
      dayOfWeek,
      openingBalance: dayOpeningBalance,
      inflows: roundedInflows,
      inflowItems: dayInflowItems,
      outflows: roundedOutflows,
      outflowItems: dayOutflowItems,
      closingBalance: dayClosingBalance,
      isBelowReserve,
      isDeficit,
    });
  }

  const summary: ForecastSummary = {
    currency,
    startingCash,
    endingCash: runningBalance,
    minProjectedBalance,
    minBalanceDate,
    minBalanceDayIndex,
    totalProjectedInflow: Math.round(totalProjectedInflow * 100) / 100,
    totalProjectedOutflow: Math.round(totalProjectedOutflow * 100) / 100,
    netProjectedCashFlow:
      Math.round((totalProjectedInflow - totalProjectedOutflow) * 100) / 100,
    minReserveThreshold,
    firstReserveBreachDate,
    firstDeficitDate,
    deficitDaysCount,
    latePaymentAssumptionDays: lateDelayDays,
    generatedAt: new Date().toISOString(),
  };

  const result: CashForecastResult = {
    summary,
    dailyBuckets,
  };

  // 7. Update Upstash Redis Cache (TTL: 1 hour)
  if (redis && !options.skipCache) {
    try {
      await redis.set(`user:${userId}:forecast_30d`, JSON.stringify(result), {
        ex: 3600,
      });
    } catch (err) {
      console.warn("Failed to set Redis forecast cache:", err);
    }
  }

  return result;
}

/**
 * Retrieves the 30-day forecast from Upstash Redis cache when fresh,
 * or recalculates deterministically on cache miss.
 */
export async function getCachedForecast(
  userId: string,
  forceFresh = false,
): Promise<CashForecastResult> {
  if (!forceFresh && redis) {
    try {
      const cached = await redis.get<string | CashForecastResult>(
        `user:${userId}:forecast_30d`,
      );
      if (cached) {
        return typeof cached === "string" ? JSON.parse(cached) : cached;
      }
    } catch (err) {
      console.warn("Redis read warning in getCachedForecast:", err);
    }
  }

  return calculate30DayCashForecast(userId);
}
