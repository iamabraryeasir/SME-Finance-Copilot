import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/services/audit";
import { getOrCreateBusinessProfile } from "@/services/business-profile";
import { calculate30DayCashForecast } from "@/services/forecast";

export interface PrioritizedReceivable {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  remainingAmount: number;
  totalAmount: number;
  dueDate: string;
  daysOverdue: number;
  priorityScore: number;
  urgencyLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  urgencyReason: string;
  activeDraftId: string | null;
  draftStatus: string | null;
}

export interface OutreachPlanResult {
  deficitProjected: boolean;
  firstDeficitDate: string | null;
  deficitAmount: number;
  prioritizedReceivables: PrioritizedReceivable[];
  createdDrafts: Array<{
    id: string;
    invoiceNumber: string;
    recipientName: string;
    subject: string;
    amount: number;
    status: string;
  }>;
}

/**
 * Deterministically ranks overdue receivables based on aging, nominal amount,
 * and upcoming cash runway deficits. Zero mental arithmetic or LLM hallucination.
 */
export async function prioritizeOverdueReceivables(
  userId: string,
): Promise<PrioritizedReceivable[]> {
  if (!userId) {
    throw new Error("Tenant isolation violation: userId is required");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Fetch all overdue / unpaid receivable invoices
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      userId,
      type: "RECEIVABLE",
      status: { in: ["OVERDUE", "PENDING", "PARTIALLY_PAID"] },
      dueDate: { lt: today },
      remainingAmount: { gt: 0 },
    },
    orderBy: { dueDate: "asc" },
  });

  if (overdueInvoices.length === 0) {
    return [];
  }

  // 2. Fetch cash runway forecast to determine deficit urgency
  const forecast = await calculate30DayCashForecast(userId, {
    skipCache: false,
  });
  const hasDeficit = !!forecast.summary.firstDeficitDate;
  const deficitAmount = Math.abs(forecast.summary.minProjectedBalance);
  let deficitInDays = 999;

  if (forecast.summary.firstDeficitDate) {
    const deficitDate = new Date(forecast.summary.firstDeficitDate);
    deficitInDays = Math.max(
      0,
      Math.ceil((deficitDate.getTime() - today.getTime()) / 86400000),
    );
  }

  // 3. Fetch any existing ActionDrafts for these invoices
  const invoiceIds = overdueInvoices.map((inv) => inv.id);
  const existingDrafts = await prisma.actionDraft.findMany({
    where: {
      userId,
      invoiceId: { in: invoiceIds },
    },
    orderBy: { createdAt: "desc" },
  });

  const draftMap = new Map<string, (typeof existingDrafts)[0]>();
  for (const draft of existingDrafts) {
    if (!draftMap.has(draft.invoiceId)) {
      draftMap.set(draft.invoiceId, draft);
    }
  }

  // 4. Calculate deterministic priority score
  // Formula: Score = (Days Overdue * 1.5) + (Amount / 10,000 * 2.0) + Deficit Urgency Boost
  const results: PrioritizedReceivable[] = overdueInvoices.map((inv) => {
    const invDueDate = new Date(inv.dueDate);
    const daysOverdue = Math.max(
      1,
      Math.ceil((today.getTime() - invDueDate.getTime()) / 86400000),
    );

    let deficitBoost = 0;
    let urgencyReason = `${daysOverdue} days overdue`;

    if (hasDeficit && deficitInDays <= 14) {
      if (inv.remainingAmount >= deficitAmount * 0.5) {
        deficitBoost = 50;
        urgencyReason += ` • Vital to avert projected deficit in ${deficitInDays} days`;
      } else if (inv.remainingAmount >= deficitAmount * 0.2) {
        deficitBoost = 30;
        urgencyReason += ` • Significantly reduces upcoming cash gap`;
      }
    }

    let agingBoost = 0;
    if (daysOverdue > 60) {
      agingBoost = 40;
    } else if (daysOverdue > 30) {
      agingBoost = 20;
    }

    const priorityScore = Math.round(
      daysOverdue * 1.5 +
        (inv.remainingAmount / 10000) * 2.0 +
        deficitBoost +
        agingBoost,
    );

    let urgencyLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" = "LOW";
    if (priorityScore >= 80 || (hasDeficit && deficitBoost >= 30)) {
      urgencyLevel = "CRITICAL";
    } else if (priorityScore >= 50) {
      urgencyLevel = "HIGH";
    } else if (priorityScore >= 25) {
      urgencyLevel = "MEDIUM";
    }

    const linkedDraft = draftMap.get(inv.id);

    return {
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.counterparty,
      customerEmail: inv.counterpartyEmail || null,
      customerPhone: inv.counterpartyPhone || null,
      remainingAmount: inv.remainingAmount,
      totalAmount: inv.totalAmount,
      dueDate: invDueDate.toISOString().slice(0, 10),
      daysOverdue,
      priorityScore,
      urgencyLevel,
      urgencyReason,
      activeDraftId: linkedDraft?.id || null,
      draftStatus: linkedDraft?.status || null,
    };
  });

  // Sort descending by priorityScore
  return results.sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Automatically creates actionable, staged reminder drafts (PENDING_APPROVAL)
 * for the top overdue debtors, enforcing strict HITL boundaries.
 */
export async function generateOutreachPlan(
  userId: string,
  topCount = 3,
): Promise<OutreachPlanResult> {
  const ranked = await prioritizeOverdueReceivables(userId);
  const profile = await getOrCreateBusinessProfile(userId);
  const currency = profile.currency || "BDT";
  const symbol = currency === "BDT" ? "৳" : "$";
  const businessName = profile.companyName || "Our Company";

  const forecast = await calculate30DayCashForecast(userId, {
    skipCache: false,
  });

  const createdDrafts: OutreachPlanResult["createdDrafts"] = [];

  // Consider the top N invoices that do not have an active pending/approved draft
  const targetInvoices = ranked
    .filter(
      (r) =>
        !r.draftStatus ||
        r.draftStatus === "REJECTED" ||
        r.draftStatus === "FAILED",
    )
    .slice(0, topCount);

  for (const item of targetInvoices) {
    const formattedAmount = `${symbol}${item.remainingAmount.toLocaleString()}`;
    let tone = "polite";
    let subject = `Payment Reminder: Invoice ${item.invoiceNumber} for ${businessName}`;
    let body = "";

    if (item.daysOverdue <= 7) {
      tone = "polite reminder";
      subject = `Gentle Reminder: Invoice ${item.invoiceNumber} is Overdue`;
      body = `Dear ${item.customerName},\n\nWe hope this message finds you well. This is a gentle reminder that Invoice ${item.invoiceNumber} for ${formattedAmount} was due on ${item.dueDate} (${item.daysOverdue} days ago).\n\nPlease let us know if payment has already been initiated or if you need any assistance with settlement details.\n\nWarm regards,\n${businessName} Accounts Team`;
    } else if (item.daysOverdue <= 30) {
      tone = "firm reminder";
      subject = `Urgent Follow-Up: Overdue Invoice ${item.invoiceNumber} (${formattedAmount})`;
      body = `Dear ${item.customerName},\n\nWe are following up regarding Invoice ${item.invoiceNumber} for ${formattedAmount}, which is now ${item.daysOverdue} days past due (Due Date: ${item.dueDate}).\n\nTo ensure uninterrupted business relations and account standing, please settle this outstanding balance at your earliest convenience.\n\nThank you for your prompt attention.\n\nSincerely,\n${businessName} Finance Department`;
    } else {
      tone = "formal escalation";
      subject = `Final Notice: Outstanding Balance on Invoice ${item.invoiceNumber}`;
      body = `Dear ${item.customerName},\n\nDespite previous reminders, Invoice ${item.invoiceNumber} for ${formattedAmount} remains unsettled and is now ${item.daysOverdue} days overdue.\n\nPlease process this payment immediately or contact us within 2 business days to agree upon a payment schedule.\n\nSincerely,\n${businessName} Management`;
    }

    const draft = await prisma.actionDraft.create({
      data: {
        userId,
        invoiceId: item.invoiceId,
        actionType: "INVOICE_REMINDER",
        channel: item.customerEmail ? "EMAIL" : "TELEGRAM",
        recipientName: item.customerName,
        recipientContact:
          item.customerEmail ||
          item.customerPhone ||
          "Pending customer contact",
        subject,
        content: body,
        status: "PENDING_APPROVAL",
      },
    });

    await recordAuditLog({
      userId,
      actor: "AGENT",
      actionType: "DRAFT_CREATED",
      entityType: "ActionDraft",
      entityId: draft.id,
      details: {
        invoiceNumber: item.invoiceNumber,
        recipient: item.customerName,
        amount: item.remainingAmount,
        daysOverdue: item.daysOverdue,
        tone,
      },
    });

    createdDrafts.push({
      id: draft.id,
      invoiceNumber: item.invoiceNumber,
      recipientName: item.customerName,
      subject: draft.subject,
      amount: item.remainingAmount,
      status: draft.status,
    });
  }

  return {
    deficitProjected: !!forecast.summary.firstDeficitDate,
    firstDeficitDate: forecast.summary.firstDeficitDate,
    deficitAmount: Math.abs(forecast.summary.minProjectedBalance),
    prioritizedReceivables: ranked,
    createdDrafts,
  };
}

/**
 * Human-in-the-Loop Approval for an action draft.
 * Executes simulated dispatch and logs audit trail.
 */
export async function approveActionDraft(draftId: string, userId: string) {
  const draft = await prisma.actionDraft.findFirst({
    where: { id: draftId, userId },
    include: { invoice: true },
  });

  if (!draft) {
    throw new Error("Action draft not found or unauthorized");
  }

  const now = new Date();

  // 1. Mark approved
  await prisma.actionDraft.update({
    where: { id: draft.id },
    data: {
      status: "APPROVED",
      approvedBy: userId,
      approvedAt: now,
    },
  });

  await recordAuditLog({
    userId,
    actor: "USER",
    actionType: "DRAFT_APPROVED",
    entityType: "ActionDraft",
    entityId: draft.id,
    details: {
      invoiceNumber: draft.invoice.invoiceNumber,
      recipient: draft.recipientName,
      channel: draft.channel,
    },
  });

  // 2. Simulated Dispatch (For MVP: Mark SENT immediately)
  const dispatched = await prisma.actionDraft.update({
    where: { id: draft.id },
    data: {
      status: "SENT",
      executedAt: new Date(),
    },
  });

  await recordAuditLog({
    userId,
    actor: "SYSTEM",
    actionType: "DISPATCH",
    entityType: "ActionDraft",
    entityId: draft.id,
    details: {
      channel: draft.channel,
      recipientContact: draft.recipientContact,
      status: "DELIVERED_SIMULATED",
    },
  });

  return dispatched;
}

/**
 * Human-in-the-Loop Rejection for an action draft.
 */
export async function rejectActionDraft(
  draftId: string,
  userId: string,
  reason?: string,
) {
  const draft = await prisma.actionDraft.findFirst({
    where: { id: draftId, userId },
    include: { invoice: true },
  });

  if (!draft) {
    throw new Error("Action draft not found or unauthorized");
  }

  const updated = await prisma.actionDraft.update({
    where: { id: draft.id },
    data: {
      status: "REJECTED",
      dispatchError: reason || "Rejected by user",
    },
  });

  await recordAuditLog({
    userId,
    actor: "USER",
    actionType: "DRAFT_REJECTED",
    entityType: "ActionDraft",
    entityId: draft.id,
    details: {
      invoiceNumber: draft.invoice.invoiceNumber,
      recipient: draft.recipientName,
      reason: reason || "User rejected draft without specific notes",
    },
  });

  return updated;
}
