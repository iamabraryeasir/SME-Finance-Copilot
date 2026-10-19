import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateBusinessProfile } from "@/services/business-profile";

export function createUpcomingReceivablesTool(sessionUserId: string) {
  return tool(
    async (input) => {
      const userId = sessionUserId || input.userId;
      if (!userId) {
        return JSON.stringify({ error: "Unauthorized: Missing user context." });
      }

      try {
        const days = Math.min(Math.max(input.daysHorizon ?? 7, 1), 60);
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);
        const horizonDate = new Date(today.getTime() + days * 86400000);

        // Fetch user business profile for conservative late payment buffer
        const profile = await getOrCreateBusinessProfile(userId);
        const lateBufferDays = profile.latePaymentAssumptionDays ?? 3;

        const receivables = await prisma.invoice.findMany({
          where: {
            userId,
            type: "RECEIVABLE",
            status: { in: ["PENDING", "PARTIALLY_PAID"] },
            remainingAmount: { gt: 0 },
            dueDate: {
              gte: new Date(todayStr),
              lte: horizonDate,
            },
          },
          orderBy: { dueDate: "asc" },
          select: {
            id: true,
            invoiceNumber: true,
            counterparty: true,
            remainingAmount: true,
            dueDate: true,
            currency: true,
          },
        });

        const formattedReceivables = receivables.map((r) => {
          const agreedDateStr = r.dueDate.toISOString().slice(0, 10);
          const conservativeDate = new Date(
            r.dueDate.getTime() + lateBufferDays * 86400000,
          );
          return {
            id: r.id,
            invoiceNumber: r.invoiceNumber,
            customerName: r.counterparty,
            expectedAmount: r.remainingAmount,
            agreedDueDate: agreedDateStr,
            conservativeReceiptDate: conservativeDate
              .toISOString()
              .slice(0, 10),
            currency: r.currency,
          };
        });

        const totalExpectedInflow = formattedReceivables.reduce(
          (sum, r) => sum + r.expectedAmount,
          0,
        );

        return JSON.stringify({
          daysHorizon: days,
          totalExpectedInflow,
          count: formattedReceivables.length,
          conservativeBufferAppliedDays: lateBufferDays,
          receivables: formattedReceivables,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal error";
        return JSON.stringify({
          error: `Failed to retrieve upcoming receivables: ${message}`,
        });
      }
    },
    {
      name: "get_upcoming_receivables",
      description:
        "Retrieves expected customer invoice collections maturing within N days horizon. Includes conservative late receipt modeling.",
      schema: z.object({
        userId: z
          .string()
          .optional()
          .describe("User ID of the SME owner (defaults to session)"),
        daysHorizon: z
          .number()
          .optional()
          .describe(
            "Number of future days to inspect (default 7 days, max 60)",
          ),
      }),
    },
  );
}
