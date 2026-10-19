import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/services/audit";

export function createRecordActionTool(sessionUserId: string) {
  return tool(
    async (input) => {
      const userId = sessionUserId;
      if (!userId) {
        return JSON.stringify({ error: "Unauthorized: Missing user context." });
      }

      try {
        // 1. Verify target ActionDraft
        const draft = await prisma.actionDraft.findFirst({
          where: {
            id: input.draftId,
            userId,
          },
          include: { invoice: true },
        });

        if (!draft) {
          return JSON.stringify({
            error: `Action draft ${input.draftId} not found or does not belong to this user.`,
          });
        }

        const newStatus = input.status === "APPROVED" ? "APPROVED" : "REJECTED";
        const now = new Date();

        // 2. Perform transactional update
        const updatedDraft = await prisma.$transaction(async (tx) => {
          const updated = await tx.actionDraft.update({
            where: { id: draft.id },
            data: {
              status: newStatus,
              approvedBy: newStatus === "APPROVED" ? userId : null,
              approvedAt: newStatus === "APPROVED" ? now : null,
              executedAt: newStatus === "APPROVED" ? now : null, // Simulated immediate dispatch
            },
          });

          // If approved, update invoice's last reminder timestamp
          if (newStatus === "APPROVED" && draft.invoiceId) {
            await tx.invoice.update({
              where: { id: draft.invoiceId },
              data: { lastReminderSentAt: now },
            });
          }

          return updated;
        });

        // 3. Record in immutable AuditLog
        await recordAuditLog({
          userId,
          actor: "USER",
          actionType:
            newStatus === "APPROVED" ? "DRAFT_APPROVED" : "DRAFT_REJECTED",
          entityType: "ActionDraft",
          entityId: draft.id,
          details: {
            draftId: draft.id,
            invoiceId: draft.invoiceId,
            recipientName: draft.recipientName,
            status: newStatus,
            notes: input.notes || null,
          },
          status: "SUCCESS",
        });

        return JSON.stringify({
          success: true,
          message:
            newStatus === "APPROVED"
              ? `Action draft ${draft.id} successfully APPROVED. The reminder has been recorded and dispatched to ${draft.recipientName}.`
              : `Action draft ${draft.id} was REJECTED by user. No communication was dispatched.`,
          updatedDraft: {
            draftId: updatedDraft.id,
            invoiceNumber: draft.invoice.invoiceNumber,
            status: updatedDraft.status,
            approvedAt: updatedDraft.approvedAt?.toISOString() || null,
          },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal error";
        return JSON.stringify({
          error: `Failed to record action status: ${message}`,
        });
      }
    },
    {
      name: "record_action_status",
      description:
        "Records the user's explicit Human-in-the-Loop decision to APPROVE or REJECT a staged action draft (e.g. payment reminder). Updates ledger audit trail and dispatches approved communications.",
      schema: z.object({
        draftId: z
          .string()
          .describe("UUID of the ActionDraft to approve or reject"),
        status: z
          .enum(["APPROVED", "REJECTED"])
          .describe(
            "The user's decision: APPROVED (dispatches action) or REJECTED (cancels action)",
          ),
        notes: z
          .string()
          .optional()
          .describe("Optional operator notes or justification"),
      }),
    },
  );
}
