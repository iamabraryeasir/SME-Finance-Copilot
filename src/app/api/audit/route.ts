import type { AuditAction, AuditActor } from "@prisma/client";
import { NextResponse } from "next/server";
import { isNextBailout } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { getUserAuditLogs } from "@/services/audit";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          statusCode: 401,
          message: "Unauthorized: Active session required",
          data: null,
          errors: ["Missing or expired session"],
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      Number.parseInt(searchParams.get("limit") || "25", 10),
      100,
    );
    const offset = Math.max(
      Number.parseInt(searchParams.get("offset") || "0", 10),
      0,
    );
    const actionType =
      (searchParams.get("actionType") as AuditAction) || undefined;
    const actor = (searchParams.get("actor") as AuditActor) || undefined;

    const result = await getUserAuditLogs(session.user.id, {
      limit,
      offset,
      actionType,
      actor,
    });

    return NextResponse.json({
      success: true,
      statusCode: 200,
      message: "Audit logs retrieved successfully",
      data: result,
      errors: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    if (isNextBailout(error)) throw error;
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[AuditAPI Error]:", error);
    return NextResponse.json(
      {
        success: false,
        statusCode: 500,
        message: "Failed to fetch audit logs",
        data: null,
        errors: [message],
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
