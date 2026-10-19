import type { AuditAction, AuditActor, AuditStatus } from "@prisma/client";
import type { NextRequest } from "next/server";
import { ApiResponse, isNextBailout } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id || session.user.role !== "admin") {
      return ApiResponse.forbidden(
        "Access denied: System administrator role required.",
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Number.parseInt(searchParams.get("limit") || "30", 10),
      100,
    );
    const offset = Math.max(
      Number.parseInt(searchParams.get("offset") || "0", 10),
      0,
    );
    const actor = (searchParams.get("actor") as AuditActor) || undefined;
    const actionType =
      (searchParams.get("actionType") as AuditAction) || undefined;
    const status = (searchParams.get("status") as AuditStatus) || undefined;
    const search = searchParams.get("search")?.toLowerCase() || "";

    const whereClause: {
      actor?: AuditActor;
      actionType?: AuditAction;
      status?: AuditStatus;
      OR?: Array<
        | { user: { email: { contains: string; mode: "insensitive" } } }
        | { user: { name: { contains: string; mode: "insensitive" } } }
        | { entityType: { contains: string; mode: "insensitive" } }
      >;
    } = {};

    if (actor && actor !== ("ALL" as unknown)) whereClause.actor = actor;
    if (actionType && actionType !== ("ALL" as unknown))
      whereClause.actionType = actionType;
    if (status && status !== ("ALL" as unknown)) whereClause.status = status;

    if (search) {
      whereClause.OR = [
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { entityType: { contains: search, mode: "insensitive" } },
      ];
    }

    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where: whereClause }),
    ]);

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.user.name,
      userEmail: log.user.email,
      actor: log.actor,
      actionType: log.actionType,
      entityType: log.entityType,
      entityId: log.entityId,
      details: log.details as Record<string, unknown>,
      status: log.status,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
    }));

    return ApiResponse.success(
      {
        logs: formattedLogs,
        totalCount,
        limit,
        offset,
      },
      "Global audit logs retrieved successfully.",
    );
  } catch (error) {
    if (isNextBailout(error)) throw error;
    console.error("[Admin Audit API Error]:", error);
    return ApiResponse.internal("Failed to retrieve global audit logs.");
  }
}
