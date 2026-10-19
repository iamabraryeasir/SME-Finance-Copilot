import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export function createUpcomingPayablesTool(sessionUserId: string) {
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

        // 1. Retrieve maturing supplier invoices
        const payables = await prisma.invoice.findMany({
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

        // 2. Retrieve scheduled recurring overhead commitments
        const recurringSchedules = await prisma.recurringSchedule.findMany({
          where: {
            userId,
            isActive: true,
          },
          select: {
            id: true,
            title: true,
            category: true,
            amount: true,
            dayOfMonth: true,
            currency: true,
          },
        });

        const scheduledOverhead: Array<{
          id: string;
          title: string;
          category: string;
          amount: number;
          dueDate: string;
          currency: string;
        }> = [];

        // Check if any recurring schedule triggers within the horizon window
        for (let d = 0; d <= days; d++) {
          const targetDay = new Date(today.getTime() + d * 86400000);
          const dayNum = targetDay.getDate();
          const targetDateStr = targetDay.toISOString().slice(0, 10);

          for (const sched of recurringSchedules) {
            if (sched.dayOfMonth === dayNum) {
              scheduledOverhead.push({
                id: `recurring-${sched.id}-${targetDateStr}`,
                title: sched.title,
                category: sched.category,
                amount: sched.amount,
                dueDate: targetDateStr,
                currency: sched.currency,
              });
            }
          }
        }

        const formattedSupplierPayables = payables.map((p) => ({
          id: p.id,
          invoiceNumber: p.invoiceNumber,
          counterparty: p.counterparty,
          amount: p.remainingAmount,
          dueDate: p.dueDate.toISOString().slice(0, 10),
          category: "SUPPLIER_PAYABLE",
          currency: p.currency,
        }));

        const allObligations = [
          ...formattedSupplierPayables,
          ...scheduledOverhead,
        ].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

        const totalPayableLiability = allObligations.reduce(
          (sum, item) => sum + item.amount,
          0,
        );

        return JSON.stringify({
          daysHorizon: days,
          totalPayableLiability,
          count: allObligations.length,
          supplierInvoicesCount: formattedSupplierPayables.length,
          recurringOverheadCount: scheduledOverhead.length,
          obligations: allObligations,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal error";
        return JSON.stringify({
          error: `Failed to retrieve upcoming payables: ${message}`,
        });
      }
    },
    {
      name: "get_upcoming_payables",
      description:
        "Retrieves scheduled supplier invoices and fixed overhead obligations (Rent, Payroll, Utilities, Loans) maturing within N days horizon. Calculates total cash outflow liability.",
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
