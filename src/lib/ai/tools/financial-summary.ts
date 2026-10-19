import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateBusinessProfile } from "@/services/business-profile";
import { get30DayForecast } from "@/services/forecast";

export function createFinancialSummaryTool(sessionUserId: string) {
  return tool(
    async (input) => {
      const userId = sessionUserId || input.userId;
      if (!userId) {
        return JSON.stringify({ error: "Unauthorized: Missing user context." });
      }

      try {
        const todayStr = new Date().toISOString().slice(0, 10);

        // 1. Fetch user business profile settings
        const profile = await getOrCreateBusinessProfile(userId);
        const currency = profile.currency || "BDT";
        const openingBalance = profile.openingBalance ?? 0;
        const minReserve = profile.minReserveThreshold ?? 30000;

        // 2. Aggregate Receivables (AR)
        const receivables = await prisma.invoice.findMany({
          where: {
            userId,
            type: "RECEIVABLE",
            status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] },
            remainingAmount: { gt: 0 },
          },
          select: { remainingAmount: true, dueDate: true, status: true },
        });

        const totalReceivables = receivables.reduce(
          (sum, i) => sum + i.remainingAmount,
          0,
        );
        const overdueReceivables = receivables
          .filter(
            (i) =>
              i.status === "OVERDUE" ||
              new Date(i.dueDate).toISOString().slice(0, 10) < todayStr,
          )
          .reduce((sum, i) => sum + i.remainingAmount, 0);

        // 3. Aggregate Payables (AP)
        const payables = await prisma.invoice.findMany({
          where: {
            userId,
            type: "PAYABLE",
            status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] },
            remainingAmount: { gt: 0 },
          },
          select: { remainingAmount: true, dueDate: true },
        });

        const totalPayables = payables.reduce(
          (sum, i) => sum + i.remainingAmount,
          0,
        );

        // 4. Count active financial alerts
        const activeAlertsCount = await prisma.financialAlert.count({
          where: { userId, status: "ACTIVE" },
        });

        // 5. Query 30-day forecast engine
        const forecast = await get30DayForecast(userId);

        return JSON.stringify({
          currency,
          symbol: currency === "USD" ? "$" : "৳",
          currentVerifiedBalance: openingBalance,
          minReserveThreshold: minReserve,
          totalOutstandingReceivables: totalReceivables,
          overdueReceivables,
          totalOutstandingPayables: totalPayables,
          activeAlertsCount,
          forecast30Day: {
            lowestProjectedBalance: forecast.summary.minProjectedBalance,
            lowestBalanceDate: forecast.summary.minBalanceDate,
            hasProjectedDeficit: forecast.summary.deficitDaysCount > 0,
            deficitDaysCount: forecast.summary.deficitDaysCount,
            firstDeficitDate: forecast.summary.firstDeficitDate,
            firstReserveBreachDate: forecast.summary.firstReserveBreachDate,
          },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal error";
        return JSON.stringify({
          error: `Failed to compute financial summary: ${message}`,
        });
      }
    },
    {
      name: "get_financial_summary",
      description:
        "Fetches real-time financial KPI metrics for the SME, including current cash balance, total receivables (AR), overdue invoices, total supplier payables (AP), minimum projected balance, and active alerts count.",
      schema: z.object({
        userId: z
          .string()
          .optional()
          .describe("User ID of the SME owner (defaults to session)"),
      }),
    },
  );
}
