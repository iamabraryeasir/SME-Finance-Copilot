import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateOutreachPlan,
  prioritizeOverdueReceivables,
} from "@/services/action-planner";

/**
 * GET /api/actions
 * Lists all pending action drafts and prioritized overdue receivables for the authenticated user.
 */
export async function GET() {
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

    const userId = session.user.id;

    // Fetch active action drafts
    const pendingDrafts = await prisma.actionDraft.findMany({
      where: {
        userId,
        status: "PENDING_APPROVAL",
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            counterparty: true,
            remainingAmount: true,
            dueDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch prioritized overdue list
    const prioritizedReceivables = await prioritizeOverdueReceivables(userId);

    return NextResponse.json({
      success: true,
      data: {
        pendingDrafts,
        prioritizedReceivables,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { success: false, message: `Failed to fetch actions: ${message}` },
      { status: 500 },
    );
  }
}

/**
 * POST /api/actions/plan
 * Deterministically generates reminder drafts for top overdue receivables.
 */
export async function POST(req: Request) {
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

    const body = await req.json().catch(() => ({}));
    const topCount = typeof body.topCount === "number" ? body.topCount : 3;

    const plan = await generateOutreachPlan(session.user.id, topCount);

    return NextResponse.json({
      success: true,
      data: plan,
      message: `Generated ${plan.createdDrafts.length} outreach draft(s) awaiting approval.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      {
        success: false,
        message: `Failed to generate outreach plan: ${message}`,
      },
      { status: 500 },
    );
  }
}
