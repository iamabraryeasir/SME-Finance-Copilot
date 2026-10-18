import { calculate30DayCashForecast } from "@/services/forecast";
import type { SimulateScenarioInput } from "@/validations/simulation";

export interface ComparativeDayBucket {
  date: string;
  dayIndex: number;
  dayOfWeek: string;
  baselineClosingBalance: number;
  simulatedClosingBalance: number;
  simulatedOutflows: number;
  delta: number;
  isSimulatedDeficit: boolean;
  isSimulatedBelowReserve: boolean;
}

export interface SimulationResult {
  currency: string;
  verdict: "SAFE" | "RESERVE_BREACH" | "UNSAFE_DEFICIT";
  isAffordable: boolean;
  preservesSafetyReserve: boolean;
  simulatedExpense: {
    amount: number;
    date: string;
    dayIndex: number;
    title: string;
    category: string;
  };
  metrics: {
    baselineMinBalance: number;
    baselineMinBalanceDate: string;
    simulatedMinBalance: number;
    simulatedMinBalanceDate: string;
    deltaMinBalance: number;
    minReserveThreshold: number;
    simulatedDeficitDaysCount: number;
    firstSimulatedDeficitDate: string | null;
    firstSimulatedReserveBreachDate: string | null;
  };
  recommendation: string;
  comparativeBuckets: ComparativeDayBucket[];
}

/**
 * Runs a deterministic what-if scenario affordability simulation against the 30-day timeline.
 * Mathematical anti-hallucination guarantee: Zero LLM arithmetic.
 */
export async function simulateAffordabilityScenario(
  userId: string,
  input: SimulateScenarioInput,
): Promise<SimulationResult> {
  if (!userId) {
    throw new Error("Tenant isolation violation: userId is required");
  }

  // 1. Fetch baseline 30-day forecast
  const baseline = await calculate30DayCashForecast(userId, {
    overrideLateDelayDays: input.overrideLateDelayDays,
    skipCache: true,
  });

  const currency = baseline.summary.currency;
  const minReserve = baseline.summary.minReserveThreshold;
  const expenseAmount = Math.round(input.expenseAmount * 100) / 100;

  // 2. Resolve simulated execution date and dayIndex (1..30)
  let targetDayIndex: number;
  let targetDate: string;

  if (input.dayIndex && input.dayIndex >= 1 && input.dayIndex <= 30) {
    targetDayIndex = input.dayIndex;
    targetDate = baseline.dailyBuckets[targetDayIndex - 1].date;
  } else if (input.expenseDate) {
    const foundIdx = baseline.dailyBuckets.findIndex(
      (b) => b.date === input.expenseDate,
    );
    if (foundIdx !== -1) {
      targetDayIndex = foundIdx + 1;
      targetDate = input.expenseDate;
    } else {
      // Default to Day 1 if date is outside 30-day window
      targetDayIndex = 1;
      targetDate = baseline.dailyBuckets[0].date;
    }
  } else {
    // Default: Day 1
    targetDayIndex = 1;
    targetDate = baseline.dailyBuckets[0].date;
  }

  // 3. Recalculate daily balances with the simulated expense injected
  const comparativeBuckets: ComparativeDayBucket[] = [];
  let simulatedMinBalance = Infinity;
  let simulatedMinBalanceDate = targetDate;
  let firstSimulatedDeficitDate: string | null = null;
  let firstSimulatedReserveBreachDate: string | null = null;
  let simulatedDeficitDaysCount = 0;

  let cumulativeSimulatedDelta = 0;

  for (const bucket of baseline.dailyBuckets) {
    if (bucket.dayIndex >= targetDayIndex) {
      cumulativeSimulatedDelta = expenseAmount;
    }

    const simulatedClosing =
      Math.round((bucket.closingBalance - cumulativeSimulatedDelta) * 100) /
      100;
    const isSimulatedDeficit = simulatedClosing < 0;
    const isSimulatedBelowReserve = simulatedClosing < minReserve;

    if (isSimulatedDeficit) {
      simulatedDeficitDaysCount++;
      if (!firstSimulatedDeficitDate) {
        firstSimulatedDeficitDate = bucket.date;
      }
    }

    if (isSimulatedBelowReserve && !firstSimulatedReserveBreachDate) {
      firstSimulatedReserveBreachDate = bucket.date;
    }

    if (simulatedClosing < simulatedMinBalance) {
      simulatedMinBalance = simulatedClosing;
      simulatedMinBalanceDate = bucket.date;
    }

    comparativeBuckets.push({
      date: bucket.date,
      dayIndex: bucket.dayIndex,
      dayOfWeek: bucket.dayOfWeek,
      baselineClosingBalance: bucket.closingBalance,
      simulatedClosingBalance: simulatedClosing,
      simulatedOutflows:
        bucket.dayIndex === targetDayIndex
          ? Math.round((bucket.outflows + expenseAmount) * 100) / 100
          : bucket.outflows,
      delta: cumulativeSimulatedDelta,
      isSimulatedDeficit,
      isSimulatedBelowReserve,
    });
  }

  // 4. Determine Verdict & Recommendation
  const isAffordable = simulatedMinBalance >= 0;
  const preservesSafetyReserve = simulatedMinBalance >= minReserve;

  let verdict: "SAFE" | "RESERVE_BREACH" | "UNSAFE_DEFICIT";
  let recommendation: string;

  const symbol = currency === "BDT" ? "৳" : "$";

  if (!isAffordable) {
    verdict = "UNSAFE_DEFICIT";
    const lowestStr = Math.abs(simulatedMinBalance).toLocaleString();
    recommendation = `Unsafe: This ${symbol}${expenseAmount.toLocaleString()} purchase triggers a critical cash deficit of -${symbol}${lowestStr} on ${simulatedMinBalanceDate}. Defer this expense or secure receivable financing before proceeding.`;
  } else if (!preservesSafetyReserve) {
    verdict = "RESERVE_BREACH";
    const lowestStr = simulatedMinBalance.toLocaleString();
    recommendation = `Caution: Affordable without bankruptcy, but your balance dips to ${symbol}${lowestStr} on ${simulatedMinBalanceDate}, breaching your configured minimum safety buffer of ${symbol}${minReserve.toLocaleString()}.`;
  } else {
    verdict = "SAFE";
    const lowestStr = simulatedMinBalance.toLocaleString();
    const margin = Math.round((simulatedMinBalance - minReserve) * 100) / 100;
    recommendation = `Safe to proceed: Your lowest cash balance remains ${symbol}${lowestStr} on ${simulatedMinBalanceDate}, safely retaining ${symbol}${margin.toLocaleString()} above your required reserve.`;
  }

  return {
    currency,
    verdict,
    isAffordable,
    preservesSafetyReserve,
    simulatedExpense: {
      amount: expenseAmount,
      date: targetDate,
      dayIndex: targetDayIndex,
      title: input.expenseTitle || "Simulated Purchase",
      category: input.category || "SUPPLIER_PAYMENT",
    },
    metrics: {
      baselineMinBalance: baseline.summary.minProjectedBalance,
      baselineMinBalanceDate: baseline.summary.minBalanceDate,
      simulatedMinBalance,
      simulatedMinBalanceDate,
      deltaMinBalance:
        Math.round(
          (simulatedMinBalance - baseline.summary.minProjectedBalance) * 100,
        ) / 100,
      minReserveThreshold: minReserve,
      simulatedDeficitDaysCount,
      firstSimulatedDeficitDate,
      firstSimulatedReserveBreachDate,
    },
    recommendation,
    comparativeBuckets,
  };
}
