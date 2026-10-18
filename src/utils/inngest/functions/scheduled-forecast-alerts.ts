import { prisma } from "@/lib/prisma";
import { evaluateAndSyncFinancialAlerts } from "@/services/alerts";
import { calculate30DayCashForecast } from "@/services/forecast";
import { inngest } from "@/utils/inngest/client";

/**
 * Nightly scheduled worker running at 00:00 UTC every day.
 * Advances daily forecasts, expires elapsed days, re-evaluates all 5 risk alert rules,
 * and refreshes Upstash Redis forecast caches for all active SME tenants.
 */
export const scheduledForecastAlerts = inngest.createFunction(
  {
    id: "nightly-forecast-and-alerts-cron",
    name: "Nightly 30-Day Forecast & Risk Alerts Refresh",
    retries: 2,
    concurrency: {
      limit: 2,
    },
    triggers: [{ cron: "0 0 * * *" }],
  },
  async ({ step }) => {
    // Step 1: Discover all active business profile tenants
    const userIds = await step.run("fetch-active-tenants", async () => {
      const profiles = await prisma.businessProfile.findMany({
        select: { userId: true },
      });
      return profiles.map((p) => p.userId);
    });

    const results: Array<{
      userId: string;
      endingCash: number;
      minBalance: number;
      alertsCount: number;
    }> = [];

    // Step 2: Iterate and process each tenant independently
    for (const userId of userIds) {
      await step.run(`process-tenant-${userId}`, async () => {
        // Re-run 30-day deterministic forecast & refresh Redis
        const forecast = await calculate30DayCashForecast(userId);

        // Evaluate and synchronize the 5 risk alert rules in PostgreSQL
        const alertsResult = await evaluateAndSyncFinancialAlerts(userId);

        // Record audit entry
        await prisma.auditLog.create({
          data: {
            userId,
            actor: "SYSTEM",
            actionType: "FORECAST_RUN",
            entityType: "FinancialAlert",
            status: "SUCCESS",
            details: {
              job: "nightly_cron_refresh",
              minProjectedBalance: forecast.summary.minProjectedBalance,
              endingCash: forecast.summary.endingCash,
              alertsCount: alertsResult.evaluatedCount,
            },
          },
        });

        results.push({
          userId,
          endingCash: forecast.summary.endingCash,
          minBalance: forecast.summary.minProjectedBalance,
          alertsCount: alertsResult.evaluatedCount,
        });
      });
    }

    return {
      success: true,
      tenantsProcessed: userIds.length,
      timestamp: new Date().toISOString(),
    };
  },
);
