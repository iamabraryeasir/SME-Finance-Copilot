import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/services/audit";

export function createReminderDraftTool(sessionUserId: string) {
  return tool(
    async (input) => {
      const userId = sessionUserId || input.userId;
      if (!userId) {
        return JSON.stringify({ error: "Unauthorized: Missing user context." });
      }

      try {
        // 1. Fetch and verify invoice
        const invoice = await prisma.invoice.findFirst({
          where: {
            id: input.invoiceId,
            userId,
            type: "RECEIVABLE",
          },
        });

        if (!invoice) {
          return JSON.stringify({
            error: `Invoice ${input.invoiceId} not found or is not a customer receivable.`,
          });
        }

        if (invoice.remainingAmount <= 0) {
          return JSON.stringify({
            error: `Invoice ${invoice.invoiceNumber} is already fully paid.`,
          });
        }

        const symbol = invoice.currency === "USD" ? "$" : "৳";
        const dueDateStr = invoice.dueDate.toISOString().slice(0, 10);
        const amountFormatted = `${symbol}${invoice.remainingAmount.toLocaleString(
          undefined,
          {
            minimumFractionDigits: 2,
          },
        )}`;

        const tone = input.tone || "POLITE";
        const channel = input.channel || "EMAIL";

        // 2. Anti-hallucination factual template synthesis
        let subject = "";
        let body = "";

        if (tone === "URGENT") {
          subject = `URGENT: Outstanding Balance for Invoice ${invoice.invoiceNumber} (${amountFormatted})`;
          body = `Dear ${invoice.counterparty} Billing Team,\n\nOur records indicate that Invoice ${invoice.invoiceNumber} for ${amountFormatted} was due on ${dueDateStr} and remains unpaid.\n\nDue to the significant delay, please disburse this payment immediately or provide proof of remittance.\n\nThank you for your prompt attention.\n\nAccounts Receivable`;
        } else if (tone === "FIRM") {
          subject = `Overdue Notice: Invoice ${invoice.invoiceNumber} (${amountFormatted})`;
          body = `Dear ${invoice.counterparty} Accounts Team,\n\nThis is a follow-up regarding Invoice ${invoice.invoiceNumber} in the amount of ${amountFormatted}, which was due on ${dueDateStr}.\n\nPlease let us know when we can expect this transfer to clear our account.\n\nBest regards,\nAccounts Receivable`;
        } else {
          // POLITE
          subject = `Friendly Reminder: Invoice ${invoice.invoiceNumber} (${amountFormatted})`;
          body = `Dear ${invoice.counterparty},\n\nWe hope this message finds you well. This is a gentle reminder that Invoice ${invoice.invoiceNumber} for ${amountFormatted} was due on ${dueDateStr}.\n\nIf payment has already been sent, please disregard this notice. Otherwise, your timely settlement is greatly appreciated.\n\nWarm regards,\nFinance Department`;
        }

        const recipientContact =
          invoice.counterpartyEmail ||
          invoice.counterpartyPhone ||
          "billing@customer.com";

        // 3. Create ActionDraft record strictly as PENDING_APPROVAL
        const draft = await prisma.actionDraft.create({
          data: {
            userId,
            invoiceId: invoice.id,
            actionType: "INVOICE_REMINDER",
            channel: channel === "TELEGRAM" ? "TELEGRAM" : "EMAIL",
            recipientName: invoice.counterparty,
            recipientContact,
            subject,
            content: body,
            status: "PENDING_APPROVAL",
          },
        });

        // 4. Log creation in AuditLog
        await recordAuditLog({
          userId,
          actor: "AGENT",
          actionType: "DRAFT_CREATED",
          entityType: "ActionDraft",
          entityId: draft.id,
          details: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.remainingAmount,
            tone,
            channel,
            status: "PENDING_APPROVAL",
          },
          status: "PENDING_APPROVAL",
        });

        return JSON.stringify({
          success: true,
          message:
            "Follow-up reminder draft generated successfully. It is staged with status PENDING_APPROVAL awaiting explicit human confirmation before transmission.",
          draft: {
            draftId: draft.id,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            recipientName: draft.recipientName,
            recipientContact: draft.recipientContact,
            subject: draft.subject,
            content: draft.content,
            channel: draft.channel,
            status: draft.status,
          },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal error";
        return JSON.stringify({
          error: `Failed to create reminder draft: ${message}`,
        });
      }
    },
    {
      name: "create_reminder_draft",
      description:
        "Drafts a factual overdue invoice reminder for customer payment. Creates an ActionDraft record in PENDING_APPROVAL state. Never transmits messages without explicit user approval.",
      schema: z.object({
        userId: z
          .string()
          .optional()
          .describe("User ID of the SME owner (defaults to session)"),
        invoiceId: z.string().describe("UUID of the target receivable invoice"),
        tone: z
          .enum(["POLITE", "FIRM", "URGENT"])
          .optional()
          .describe(
            "Communication tone: POLITE (routine), FIRM (overdue >14d), URGENT (critical)",
          ),
        channel: z
          .enum(["EMAIL", "TELEGRAM"])
          .optional()
          .describe("Target communication delivery channel"),
      }),
    },
  );
}
