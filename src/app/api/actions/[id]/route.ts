import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/services/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { status, notes, subject, content, recipientContact } = body;

    if (status !== "APPROVED" && status !== "REJECTED") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid status: Must be APPROVED or REJECTED",
        },
        { status: 400 },
      );
    }

    const draft = await prisma.actionDraft.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: { invoice: true },
    });

    if (!draft) {
      return NextResponse.json(
        { success: false, message: "Action draft not found" },
        { status: 404 },
      );
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const draftRecord = await tx.actionDraft.update({
        where: { id: draft.id },
        data: {
          status,
          ...(subject ? { subject: String(subject).trim() } : {}),
          ...(content ? { content: String(content).trim() } : {}),
          ...(recipientContact
            ? { recipientContact: String(recipientContact).trim() }
            : {}),
          approvedBy: status === "APPROVED" ? session.user.id : null,
          approvedAt: status === "APPROVED" ? now : null,
          executedAt: status === "APPROVED" ? now : null,
        },
      });

      if (status === "APPROVED" && draft.invoiceId) {
        await tx.invoice.update({
          where: { id: draft.invoiceId },
          data: { lastReminderSentAt: now },
        });
      }

      return draftRecord;
    });

    await recordAuditLog({
      userId: session.user.id,
      actor: "USER",
      actionType: status === "APPROVED" ? "DRAFT_APPROVED" : "DRAFT_REJECTED",
      entityType: "ActionDraft",
      entityId: draft.id,
      details: {
        draftId: draft.id,
        invoiceNumber: draft.invoice.invoiceNumber,
        recipient: draft.recipientName,
        status,
        notes: notes || null,
      },
      status: "SUCCESS",
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message:
        status === "APPROVED"
          ? "Reminder draft approved and dispatched."
          : "Reminder draft rejected.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { success: false, message: `Failed to update action draft: ${message}` },
      { status: 500 },
    );
  }
}
