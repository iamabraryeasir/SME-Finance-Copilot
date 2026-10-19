import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { get30DayForecast } from "@/services/forecast";
import { simulateAffordabilityScenario } from "@/services/simulation";
import type { DailyCashBucket } from "@/types/forecast";

export function createForecastBalanceTool(sessionUserId: string) {
  return tool(
    async (input) => {
      const userId = sessionUserId || input.userId;
      if (!userId) {
        return JSON.stringify({ error: "Unauthorized: Missing user context." });
      }

      try {
        // 1. Fetch deterministic baseline forecast
        const baseline = await get30DayForecast(userId);

        // 2. If hypothetical expense is provided, run scenario simulation
        if (input.hypotheticalExpense && input.hypotheticalExpense.amount > 0) {
          const sim = await simulateAffordabilityScenario(userId, {
            expenseAmount: input.hypotheticalExpense.amount,
            expenseDate: input.hypotheticalExpense.date,
            expenseTitle:
              input.hypotheticalExpense.title ||
              "Hypothetical Business Purchase",
            category: "SUPPLIER_PAYMENT",
          });

          return JSON.stringify({
            mode: "AFFORDABILITY_SIMULATION",
            currency: sim.currency,
            verdict: sim.verdict, // SAFE | RESERVE_BREACH | UNSAFE_DEFICIT
            isAffordable: sim.isAffordable,
            preservesSafetyReserve: sim.preservesSafetyReserve,
            recommendation: sim.recommendation,
            simulatedExpense: sim.simulatedExpense,
            impactMetrics: {
              baselineLowestBalance: sim.metrics.baselineMinBalance,
              baselineLowestDate: sim.metrics.baselineMinBalanceDate,
              simulatedLowestBalance: sim.metrics.simulatedMinBalance,
              simulatedLowestDate: sim.metrics.simulatedMinBalanceDate,
              deltaMinBalance: sim.metrics.deltaMinBalance,
              safetyReserveBuffer: sim.metrics.minReserveThreshold,
              firstSimulatedDeficitDate: sim.metrics.firstSimulatedDeficitDate,
              firstSimulatedReserveBreachDate:
                sim.metrics.firstSimulatedReserveBreachDate,
            },
          });
        }

        // Return baseline 30-day forecast overview
        return JSON.stringify({
          mode: "BASELINE_30_DAY_RUNWAY",
          currency: baseline.summary.currency,
          symbol: baseline.summary.currency === "USD" ? "$" : "৳",
          startingBalance: baseline.summary.startingCash,
          minReserveThreshold: baseline.summary.minReserveThreshold,
          summary: {
            minProjectedBalance: baseline.summary.minProjectedBalance,
            minBalanceDate: baseline.summary.minBalanceDate,
            hasDeficit: baseline.summary.deficitDaysCount > 0,
            deficitDaysCount: baseline.summary.deficitDaysCount,
            firstDeficitDate: baseline.summary.firstDeficitDate,
            firstReserveBreachDate: baseline.summary.firstReserveBreachDate,
            totalProjectedInflows: baseline.summary.totalProjectedInflow,
            totalProjectedOutflows: baseline.summary.totalProjectedOutflow,
            netCashChange: baseline.summary.netProjectedCashFlow,
          },
          dailyTrajectorySample: baseline.dailyBuckets
            .filter(
              (_: DailyCashBucket, idx: number) => idx % 5 === 0 || idx === 29,
            )
            .map((b: DailyCashBucket) => ({
              day: b.dayIndex,
              date: b.date,
              balance: b.closingBalance,
              isDeficit: b.isDeficit,
              isBelowReserve: b.isBelowReserve,
            })),
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal error";
        return JSON.stringify({
          error: `Failed to compute forecast: ${message}`,
        });
      }
    },
    {
      name: "forecast_cash_balance",
      description:
        "Runs deterministic 30-day cash flow projection or tests what-if affordability scenarios (e.g. 'Can I afford to spend ৳150,000 next Thursday?'). Returns mathematical verdict and lowest balance milestone.",
      schema: z.object({
        userId: z
          .string()
          .optional()
          .describe("User ID of the SME owner (defaults to session)"),
        days: z
          .number()
          .optional()
          .describe("Forecast duration horizon (default 30 days)"),
        hypotheticalExpense: z
          .object({
            amount: z
              .number()
              .min(0.01)
              .describe("Hypothetical expense or purchase amount"),
            date: z
              .string()
              .optional()
              .describe("Execution date in YYYY-MM-DD format"),
            title: z
              .string()
              .optional()
              .describe("Name of the hypothetical item or service"),
          })
          .optional()
          .describe("Optional what-if scenario testing parameters"),
      }),
    },
  );
}
