import { prisma } from "@/lib/prisma";
import { getOrCreateBusinessProfile } from "@/services/business-profile";
import { calculate30DayCashForecast } from "@/services/forecast";

export interface EvaluatedAlertRule {
  title: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category:
    | "CASH_DEFICIT"
    | "BELOW_RESERVE"
    | "OVERDUE_RECEIVABLE"
    | "UPCOMING_PAYABLE"
    | "UNUSUAL_EXPENSE";
  impactAmount: number;
  relevantDate: Date;
  suggestedAction: string;
  supportingData: Record<string, unknown>;
  dedupKey: string;
}

/**
 * Deterministically evaluates all 5 core financial risk rules against the verified ledger
 * and 30-day projection, synchronizing the FinancialAlert table idempotently.
 * Zero LLM hallucinations.
 */
export async function evaluateAndSyncFinancialAlerts(userId: string) {
  if (!userId) {
    throw new Error("Tenant isolation violation: userId is required");
  }

  const profile = await getOrCreateBusinessProfile(userId);
  const currency = profile.currency || "BDT";
  const symbol = currency === "BDT" ? "৳" : "$";
  const minReserve = profile.minReserveThreshold ?? 50000;
  const alertWindowDays = profile.upcomingPaymentAlertDays ?? 3;

  // 1. Run deterministic 30-day cash forecast
  const forecast = await calculate30DayCashForecast(userId, {
    skipCache: true,
  });
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const evaluatedRules: EvaluatedAlertRule[] = [];

  // =========================================================================
  // RULE 1: Projected Cash Deficit (Negative Balance) -> CRITICAL
  // =========================================================================
  if (forecast.summary.firstDeficitDate) {
    const deficitDate = new Date(forecast.summary.firstDeficitDate);
    const daysUntil = Math.max(
      1,
      Math.ceil((deficitDate.getTime() - today.getTime()) / 86400000),
    );
    const deficitAmount = Math.abs(forecast.summary.minProjectedBalance);

    evaluatedRules.push({
      title: `Projected Cash Deficit in ${daysUntil} Day${daysUntil > 1 ? "s" : ""}`,
      description: `Closing balance is projected to plummet to -${symbol}${deficitAmount.toLocaleString()} on ${forecast.summary.minBalanceDate}. You will experience negative cash flow without immediate intervention.`,
      severity: "CRITICAL",
      category: "CASH_DEFICIT",
      impactAmount: deficitAmount,
      relevantDate: deficitDate,
      suggestedAction:
        "Accelerate overdue receivable collections immediately or negotiate deferred payment terms with major suppliers.",
      supportingData: {
        firstDeficitDate: forecast.summary.firstDeficitDate,
        minProjectedBalance: forecast.summary.minProjectedBalance,
        deficitDaysCount: forecast.summary.deficitDaysCount,
        startingCash: forecast.summary.startingCash,
      },
      dedupKey: `DEFICIT_${forecast.summary.firstDeficitDate}`,
    });
  }

  // =========================================================================
  // RULE 2: Balance Falls Below Safety Reserve Buffer -> HIGH
  // =========================================================================
  if (
    forecast.summary.firstReserveBreachDate &&
    forecast.summary.minProjectedBalance >= 0
  ) {
    const breachDate = new Date(forecast.summary.firstReserveBreachDate);
    const daysUntil = Math.max(
      1,
      Math.ceil((breachDate.getTime() - today.getTime()) / 86400000),
    );
    const reserveShortfall =
      Math.round((minReserve - forecast.summary.minProjectedBalance) * 100) /
      100;

    evaluatedRules.push({
      title: `Projected Safety Reserve Breach in ${daysUntil} Day${daysUntil > 1 ? "s" : ""}`,
      description: `Cash balance drops to ${symbol}${forecast.summary.minProjectedBalance.toLocaleString()} on ${forecast.summary.minBalanceDate}, falling ${symbol}${reserveShortfall.toLocaleString()} below your required safety buffer (${symbol}${minReserve.toLocaleString()}).`,
      severity: "HIGH",
      category: "BELOW_RESERVE",
      impactAmount: reserveShortfall,
      relevantDate: breachDate,
      suggestedAction:
        "Pause non-essential capital purchases and discretionary expenditures to maintain your emergency liquidity reserve.",
      supportingData: {
        breachDate: forecast.summary.firstReserveBreachDate,
        minBalance: forecast.summary.minProjectedBalance,
        minReserveThreshold: minReserve,
        reserveShortfall,
      },
      dedupKey: `RESERVE_${forecast.summary.firstReserveBreachDate}`,
    });
  }

  // =========================================================================
  // RULE 3: Overdue Customer Invoices -> HIGH (>14 days) or MEDIUM (<=14 days)
  // =========================================================================
  const overdueReceivables = await prisma.invoice.findMany({
    where: {
      userId,
      type: "RECEIVABLE",
      remainingAmount: { gt: 0 },
      OR: [
        { status: "OVERDUE" },
        {
          dueDate: { lt: new Date(todayStr) },
          status: { in: ["PENDING", "PARTIALLY_PAID"] },
        },
      ],
    },
    select: {
      id: true,
      invoiceNumber: true,
      counterparty: true,
      remainingAmount: true,
      dueDate: true,
      status: true,
    },
    orderBy: { dueDate: "asc" },
  });

  if (overdueReceivables.length > 0) {
    const criticalOverdue: typeof overdueReceivables = [];
    const moderateOverdue: typeof overdueReceivables = [];

    const todayMs = today.getTime();

    for (const inv of overdueReceivables) {
      const daysOverdue = Math.max(
        1,
        Math.floor((todayMs - new Date(inv.dueDate).getTime()) / 86400000),
      );
      if (daysOverdue > 14) {
        criticalOverdue.push(inv);
      } else {
        moderateOverdue.push(inv);
      }
    }

    if (criticalOverdue.length > 0) {
      const totalAmount = criticalOverdue.reduce(
        (acc, i) => acc + i.remainingAmount,
        0,
      );
      const roundedTotal = Math.round(totalAmount * 100) / 100;

      evaluatedRules.push({
        title: `${criticalOverdue.length} Severe Overdue Customer Invoice${criticalOverdue.length > 1 ? "s" : ""} (>14 Days)`,
        description: `Unpaid customer invoices totaling ${symbol}${roundedTotal.toLocaleString()} are past due by more than two weeks, increasing default risk.`,
        severity: "HIGH",
        category: "OVERDUE_RECEIVABLE",
        impactAmount: roundedTotal,
        relevantDate: criticalOverdue[0].dueDate,
        suggestedAction:
          "Issue formal reminder notices or phone counterparties to secure payment dates immediately.",
        supportingData: {
          invoices: criticalOverdue.map((i) => ({
            id: i.id,
            invoiceNumber: i.invoiceNumber,
            counterparty: i.counterparty,
            amount: i.remainingAmount,
            dueDate: i.dueDate.toISOString().slice(0, 10),
          })),
        },
        dedupKey: `OVERDUE_CRITICAL_${criticalOverdue
          .map((i) => i.id)
          .slice(0, 3)
          .join("_")}`,
      });
    }

    if (moderateOverdue.length > 0) {
      const totalAmount = moderateOverdue.reduce(
        (acc, i) => acc + i.remainingAmount,
        0,
      );
      const roundedTotal = Math.round(totalAmount * 100) / 100;

      evaluatedRules.push({
        title: `${moderateOverdue.length} Overdue Customer Invoice${moderateOverdue.length > 1 ? "s" : ""}`,
        description: `Customer receivables totaling ${symbol}${roundedTotal.toLocaleString()} are recently past due.`,
        severity: "MEDIUM",
        category: "OVERDUE_RECEIVABLE",
        impactAmount: roundedTotal,
        relevantDate: moderateOverdue[0].dueDate,
        suggestedAction:
          "Prepare polite payment reminders for customer billing departments.",
        supportingData: {
          invoices: moderateOverdue.map((i) => ({
            id: i.id,
            invoiceNumber: i.invoiceNumber,
            counterparty: i.counterparty,
            amount: i.remainingAmount,
            dueDate: i.dueDate.toISOString().slice(0, 10),
          })),
        },
        dedupKey: `OVERDUE_MODERATE_${moderateOverdue
          .map((i) => i.id)
          .slice(0, 3)
          .join("_")}`,
      });
    }
  }

  // =========================================================================
  // RULE 4: Large Supplier Payment Due <= Alert Horizon (e.g. 48h - 72h) -> MEDIUM
  // =========================================================================
  const horizonDate = new Date(today.getTime() + alertWindowDays * 86400000);

  const upcomingPayables = await prisma.invoice.findMany({
    where: {
      userId,
      type: "PAYABLE",
      status: { in: ["PENDING", "PARTIALLY_PAID"] },
      remainingAmount: { gt: 0 },
      dueDate: {
        gte: new Date(todayStr),
        lte: horizonDate,
      },
    },
    select: {
      id: true,
      invoiceNumber: true,
      counterparty: true,
      remainingAmount: true,
      dueDate: true,
    },
    orderBy: { dueDate: "asc" },
  });

  for (const payable of upcomingPayables) {
    const isSignificant =
      payable.remainingAmount >= minReserve * 0.5 ||
      payable.remainingAmount >= (forecast.summary.startingCash || 1) * 0.2;

    if (isSignificant) {
      const dueStr = payable.dueDate.toISOString().slice(0, 10);
      const daysUntil = Math.max(
        0,
        Math.ceil((new Date(dueStr).getTime() - today.getTime()) / 86400000),
      );

      evaluatedRules.push({
        title: `Supplier Payment Due in ${daysUntil === 0 ? "Today" : `${daysUntil}d`}: ${payable.counterparty}`,
        description: `Upcoming supplier obligation ${payable.invoiceNumber} of ${symbol}${payable.remainingAmount.toLocaleString()} is due on ${dueStr}.`,
        severity: "MEDIUM",
        category: "UPCOMING_PAYABLE",
        impactAmount: payable.remainingAmount,
        relevantDate: payable.dueDate,
        suggestedAction:
          "Verify bank balance has sufficient liquidity to disburse supplier funds without bouncing.",
        supportingData: {
          invoiceId: payable.id,
          invoiceNumber: payable.invoiceNumber,
          counterparty: payable.counterparty,
          amount: payable.remainingAmount,
          dueDate: dueStr,
        },
        dedupKey: `UPCOMING_PAYABLE_${payable.id}`,
      });
    }
  }

  // =========================================================================
  // RULE 5: Unusual Expense vs Historical Baseline -> LOW
  // =========================================================================
  if (profile.expenseBaselineMonthly && profile.expenseBaselineMonthly > 0) {
    const threshold = profile.expenseBaselineMonthly * 0.5; // Single expense > 50% of monthly baseline
    const largeExpenses = await prisma.invoice.findMany({
      where: {
        userId,
        type: "PAYABLE",
        totalAmount: { gte: threshold },
        createdAt: { gte: new Date(today.getTime() - 30 * 86400000) },
      },
      select: {
        id: true,
        invoiceNumber: true,
        counterparty: true,
        totalAmount: true,
        createdAt: true,
      },
      take: 2,
    });

    for (const exp of largeExpenses) {
      evaluatedRules.push({
        title: `Unusual Expense Detected: ${exp.counterparty}`,
        description: `Supplier bill ${exp.invoiceNumber} of ${symbol}${exp.totalAmount.toLocaleString()} exceeds 50% of your typical monthly expense baseline (${symbol}${profile.expenseBaselineMonthly.toLocaleString()}).`,
        severity: "LOW",
        category: "UNUSUAL_EXPENSE",
        impactAmount: exp.totalAmount,
        relevantDate: exp.createdAt,
        suggestedAction:
          "Review invoice line items and ensure goods or services were fully verified by procurement.",
        supportingData: {
          invoiceId: exp.id,
          invoiceNumber: exp.invoiceNumber,
          counterparty: exp.counterparty,
          amount: exp.totalAmount,
          baselineMonthly: profile.expenseBaselineMonthly,
        },
        dedupKey: `UNUSUAL_EXPENSE_${exp.id}`,
      });
    }
  }

  // =========================================================================
  // 2. Synchronize with PostgreSQL FinancialAlert table idempotently
  // =========================================================================
  const activeAlertsInDb = await prisma.financialAlert.findMany({
    where: {
      userId,
      status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
    },
  });

  const matchedDbAlertIds = new Set<string>();

  for (const rule of evaluatedRules) {
    // Check if matching active alert already exists
    const existing = activeAlertsInDb.find(
      (a) =>
        a.category === rule.category &&
        a.title === rule.title &&
        !matchedDbAlertIds.has(a.id),
    );

    if (existing) {
      matchedDbAlertIds.add(existing.id);
      // Update with latest metrics
      await prisma.financialAlert.update({
        where: { id: existing.id },
        data: {
          impactAmount: rule.impactAmount,
          relevantDate: rule.relevantDate,
          description: rule.description,
          supportingData: rule.supportingData as object,
        },
      });
    } else {
      // Create new active alert
      const created = await prisma.financialAlert.create({
        data: {
          userId,
          title: rule.title,
          description: rule.description,
          severity: rule.severity,
          category: rule.category,
          impactAmount: rule.impactAmount,
          relevantDate: rule.relevantDate,
          status: "ACTIVE",
          suggestedAction: rule.suggestedAction,
          supportingData: rule.supportingData as object,
        },
      });

      // Audit log on critical/high triggers
      if (rule.severity === "CRITICAL" || rule.severity === "HIGH") {
        await prisma.auditLog.create({
          data: {
            userId,
            actor: "SYSTEM",
            actionType: "ALERT_TRIGGER",
            entityType: "FinancialAlert",
            entityId: created.id,
            status: "SUCCESS",
            details: {
              severity: rule.severity,
              category: rule.category,
              title: rule.title,
              impactAmount: rule.impactAmount,
            },
          },
        });
      }
    }
  }

  // Auto-resolve previous alerts that are no longer triggering
  for (const dbAlert of activeAlertsInDb) {
    if (!matchedDbAlertIds.has(dbAlert.id)) {
      await prisma.financialAlert.update({
        where: { id: dbAlert.id },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
        },
      });
    }
  }

  return {
    evaluatedCount: evaluatedRules.length,
    activeAlerts: evaluatedRules,
  };
}

/**
 * Retrieves alerts for a tenant with optional filtering.
 */
export async function getFinancialAlerts(
  userId: string,
  options: {
    status?: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED" | "ALL";
    severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "ALL";
  } = {},
) {
  if (!userId) {
    throw new Error("Tenant isolation violation: userId is required");
  }

  const where: Record<string, unknown> = { userId };

  if (options.status && options.status !== "ALL") {
    where.status = options.status;
  } else if (!options.status) {
    where.status = { in: ["ACTIVE", "ACKNOWLEDGED"] };
  }

  if (options.severity && options.severity !== "ALL") {
    where.severity = options.severity;
  }

  const alerts = await prisma.financialAlert.findMany({
    where,
    orderBy: [
      { status: "asc" },
      { severity: "asc" }, // Enum ordering or custom sort
      { relevantDate: "asc" },
    ],
  });

  // Calculate severity summary counts
  const allActive = await prisma.financialAlert.findMany({
    where: { userId, status: { in: ["ACTIVE", "ACKNOWLEDGED"] } },
    select: { severity: true },
  });

  const severityCounts = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    TOTAL: allActive.length,
  };

  for (const a of allActive) {
    if (a.severity in severityCounts) {
      severityCounts[a.severity as keyof typeof severityCounts]++;
    }
  }

  return {
    alerts,
    counts: severityCounts,
  };
}

/**
 * Acknowledges or dismisses an alert.
 */
export async function updateAlertStatus(
  userId: string,
  alertId: string,
  newStatus: "ACKNOWLEDGED" | "DISMISSED" | "RESOLVED",
) {
  if (!userId) {
    throw new Error("Tenant isolation violation: userId is required");
  }

  const alert = await prisma.financialAlert.findFirst({
    where: { id: alertId, userId },
  });

  if (!alert) {
    throw new Error("Financial alert not found");
  }

  return prisma.financialAlert.update({
    where: { id: alertId },
    data: {
      status: newStatus,
      ...(newStatus === "RESOLVED" ? { resolvedAt: new Date() } : {}),
    },
  });
}
