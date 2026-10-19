import { tool } from "@langchain/core/tools";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export function createFinancialAlertsTool(sessionUserId: string) {
  return tool(
    async (input) => {
      const userId = sessionUserId || input.userId;
      if (!userId) {
        return JSON.stringify({ error: "Unauthorized: Missing user context." });
      }

      try {
        const where: Prisma.FinancialAlertWhereInput = {
          userId,
          status: input.status ?? "ACTIVE",
          ...(input.severity ? { severity: input.severity } : {}),
          ...(input.category ? { category: input.category } : {}),
        };

        const alerts = await prisma.financialAlert.findMany({
          where,
          orderBy: [
            { severity: "asc" }, // Enum order or handled by application
            { relevantDate: "asc" },
          ],
          take: 20,
        });

        // Severity weight sorting
        const severityRank: Record<string, number> = {
          CRITICAL: 1,
          HIGH: 2,
          MEDIUM: 3,
          LOW: 4,
        };

        const sortedAlerts = [...alerts].sort(
          (a, b) =>
            (severityRank[a.severity] ?? 5) - (severityRank[b.severity] ?? 5),
        );

        return JSON.stringify({
          count: sortedAlerts.length,
          alerts: sortedAlerts.map((a) => ({
            id: a.id,
            title: a.title,
            description: a.description,
            severity: a.severity,
            category: a.category,
            impactAmount: a.impactAmount,
            relevantDate: a.relevantDate?.toISOString().slice(0, 10) || null,
            suggestedAction: a.suggestedAction,
            status: a.status,
            supportingData: a.supportingData,
          })),
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal error";
        return JSON.stringify({
          error: `Failed to retrieve alerts: ${message}`,
        });
      }
    },
    {
      name: "get_financial_alerts",
      description:
        "Retrieves active financial risk alerts (cash deficits, reserve breaches, overdue receivables, upcoming supplier liabilities, unusual expenses) with structured root-cause attribution.",
      schema: z.object({
        userId: z
          .string()
          .optional()
          .describe("User ID of the SME owner (defaults to session)"),
        severity: z
          .enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"])
          .optional()
          .describe("Filter alerts by severity level"),
        category: z
          .enum([
            "CASH_DEFICIT",
            "BELOW_RESERVE",
            "OVERDUE_RECEIVABLE",
            "UPCOMING_PAYABLE",
            "UNUSUAL_EXPENSE",
          ])
          .optional()
          .describe(
            "Filter by risk category (CASH_DEFICIT, BELOW_RESERVE, OVERDUE_RECEIVABLE, UPCOMING_PAYABLE, UNUSUAL_EXPENSE)",
          ),
        status: z
          .enum(["ACTIVE", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"])
          .optional()
          .describe("Alert status (defaults to ACTIVE)"),
      }),
    },
  );
}
