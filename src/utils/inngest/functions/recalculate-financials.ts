import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { calculateTenantFinancialSummary } from "@/services/invoice";
import { inngest } from "@/utils/inngest/client";
import { invoiceLedgerMutatedEvent } from "@/utils/inngest/events";

export const recalculateFinancials = inngest.createFunction(
  {
    id: "recalculate-financials",
    name: "Recalculate Financial Metrics & Update Cache",
    retries: 2,
    triggers: [invoiceLedgerMutatedEvent],
  },
  async ({ event, step }) => {
    const { userId, action, affectedCount, source } = event.data;

    // Step 1: Deterministic financial metric calculation
    const summary = await step.run("aggregate-tenant-metrics", async () => {
      return await calculateTenantFinancialSummary(userId);
    });

    // Step 2: Refresh Upstash Redis cache (1 hour TTL)
    await step.run("update-redis-cache", async () => {
      if (redis) {
        try {
          await redis.set(
            `user:${userId}:financial_summary`,
            JSON.stringify(summary),
            { ex: 3600 },
          );
        } catch (err) {
          console.warn("Failed to update Redis cache:", err);
        }
      }
      return { cached: Boolean(redis) };
    });

    // Step 3: Record audit log entry
    await step.run("record-audit-trail", async () => {
      await prisma.auditLog.create({
        data: {
          userId,
          actor: "SYSTEM",
          actionType: "INGESTION",
          entityType: "FinancialSummary",
          status: "SUCCESS",
          details: {
            event: "recalculate_financials",
            mutationAction: action,
            affectedCount,
            source,
            summary,
          },
        },
      });
      return { logged: true };
    });

    return { success: true, summary };
  },
);
