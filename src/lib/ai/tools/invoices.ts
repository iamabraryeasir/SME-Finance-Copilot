import { tool } from "@langchain/core/tools";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export function createInvoicesTool(sessionUserId: string) {
  return tool(
    async (input) => {
      const userId = sessionUserId || input.userId;
      if (!userId) {
        return JSON.stringify({ error: "Unauthorized: Missing user context." });
      }

      try {
        const limit = Math.min(input.limit ?? 10, 50);

        const where: Prisma.InvoiceWhereInput = {
          userId,
          ...(input.type ? { type: input.type } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.counterparty
            ? {
                counterparty: {
                  contains: input.counterparty,
                  mode: "insensitive",
                },
              }
            : {}),
          ...(input.onlyOutstanding ? { remainingAmount: { gt: 0 } } : {}),
        };

        const [invoices, totalCount] = await Promise.all([
          prisma.invoice.findMany({
            where,
            orderBy: [{ dueDate: "asc" }, { remainingAmount: "desc" }],
            take: limit,
            select: {
              id: true,
              invoiceNumber: true,
              counterparty: true,
              counterpartyEmail: true,
              type: true,
              totalAmount: true,
              paidAmount: true,
              remainingAmount: true,
              currency: true,
              issueDate: true,
              dueDate: true,
              status: true,
              lastReminderSentAt: true,
            },
          }),
          prisma.invoice.count({ where }),
        ]);

        const formattedInvoices = invoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          counterparty: inv.counterparty,
          counterpartyEmail: inv.counterpartyEmail,
          type: inv.type,
          totalAmount: inv.totalAmount,
          paidAmount: inv.paidAmount,
          remainingAmount: inv.remainingAmount,
          currency: inv.currency,
          issueDate: inv.issueDate.toISOString().slice(0, 10),
          dueDate: inv.dueDate.toISOString().slice(0, 10),
          status: inv.status,
          lastReminderSentAt: inv.lastReminderSentAt?.toISOString() || null,
        }));

        return JSON.stringify({
          invoices: formattedInvoices,
          returnedCount: formattedInvoices.length,
          totalMatchingCount: totalCount,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal error";
        return JSON.stringify({
          error: `Failed to search invoices: ${message}`,
        });
      }
    },
    {
      name: "get_invoices",
      description:
        "Searches and filters invoices with pagination. Use to look up accounts receivable (customer debts) or accounts payable (supplier bills) by status, type, or counterparty name.",
      schema: z.object({
        userId: z
          .string()
          .optional()
          .describe("User ID of the SME owner (defaults to session)"),
        type: z
          .enum(["RECEIVABLE", "PAYABLE"])
          .optional()
          .describe(
            "Filter by RECEIVABLE (customer invoices) or PAYABLE (supplier bills)",
          ),
        status: z
          .enum(["PENDING", "PARTIALLY_PAID", "OVERDUE", "PAID", "CANCELLED"])
          .optional()
          .describe("Filter by invoice settlement status"),
        counterparty: z
          .string()
          .optional()
          .describe(
            "Search by customer or supplier name (case-insensitive substring)",
          ),
        onlyOutstanding: z
          .boolean()
          .optional()
          .describe("If true, only returns invoices with remainingAmount > 0"),
        limit: z
          .number()
          .optional()
          .describe("Max number of records to return (default 10, max 50)"),
      }),
    },
  );
}
