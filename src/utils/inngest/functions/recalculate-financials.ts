import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { evaluateAndSyncFinancialAlerts } from "@/services/alerts";
import { calculate30DayCashForecast } from "@/services/forecast";
import { calculateTenantFinancialSummary } from "@/services/invoice";
import { inngest } from "@/utils/inngest/client";
import { invoiceLedgerMutatedEvent } from "@/utils/inngest/events";

export const recalculateFinancials = inngest.createFunction(
  {
    id: "recalculate-financials",
    name: "Recalculate Financial Metrics, Forecast & Risk Alerts",
    retries: 2,
    triggers: [invoiceLedgerMutatedEvent],
  },
  async ({ event, step }) => {
    const { userId, action, affectedCount, source } = event.data;

    // Step 1: Deterministic financial summary aggregation
    const summary = await step.run("aggregate-tenant-metrics", async () => {
      return await calculateTenantFinancialSummary(userId);
    });

    // Step 2: Refresh Upstash Redis KPI cache (1 hour TTL)
    await step.run("update-redis-summary-cache", async () => {
      if (redis) {
        try {
          await redis.set(
            `user:${userId}:financial_summary`,
            JSON.stringify(summary),
            { ex: 3600 },
          );
        } catch (err) {
          console.warn("Failed to update Redis summary cache:", err);
        }
      }
      return { cached: Boolean(redis) };
    });

    // Step 3: Deterministic 30-day cash flow forecast recalculation & Redis cache
    const forecast = await step.run(
      "recalculate-and-cache-forecast",
      async () => {
        return await calculate30DayCashForecast(userId);
      },
    );

    // Step 4: Rule-based risk alerts evaluation & PostgreSQL sync
    const alertsResult = await step.run(
      "evaluate-and-sync-alerts",
      async () => {
        return await evaluateAndSyncFinancialAlerts(userId);
      },
    );

    // Step 5: Record immutable audit log entry
    await step.run("record-audit-trail", async () => {
      await prisma.auditLog.create({
        data: {
          userId,
          actor: "SYSTEM",
          actionType: "FORECAST_RUN",
          entityType: "FinancialSummary",
          status: "SUCCESS",
          details: {
            event: "recalculate_financials_and_alerts",
            mutationAction: action,
            affectedCount,
            source,
            summary,
            forecastEndingCash: forecast.summary.endingCash,
            minProjectedBalance: forecast.summary.minProjectedBalance,
            activeAlertsCount: alertsResult.evaluatedCount,
          },
        },
      });
      return { logged: true };
    });

    return {
      success: true,
      summary,
      forecastSummary: forecast.summary,
      alertsEvaluated: alertsResult.evaluatedCount,
    };
  },
);
