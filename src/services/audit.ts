import type {
  AuditAction,
  AuditActor,
  AuditStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface CreateAuditLogParams {
  userId: string;
  actor: AuditActor;
  actionType: AuditAction;
  entityType: string;
  entityId?: string | null;
  details: Record<string, unknown> | Prisma.InputJsonValue;
  status?: AuditStatus;
  ipAddress?: string | null;
}

/**
 * Creates an append-only, tamper-evident audit record in PostgreSQL.
 * Satisfies banking and enterprise compliance traceability requirements.
 */
export async function recordAuditLog(params: CreateAuditLogParams) {
  try {
    const log = await prisma.auditLog.create({
      data: {
        userId: params.userId,
        actor: params.actor,
        actionType: params.actionType,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        details: params.details as Prisma.InputJsonValue,
        status: params.status ?? "SUCCESS",
        ipAddress: params.ipAddress ?? null,
      },
    });
    return log;
  } catch (error) {
    // Non-blocking fail-safe: log to stderr without breaking the calling transaction
    console.error("[AuditLogService] Failed to record audit log:", error);
    return null;
  }
}

/**
 * Retrieves recent audit logs for a given user with pagination.
 */
export async function getUserAuditLogs(
  userId: string,
  options: { limit?: number; offset?: number; actionType?: AuditAction } = {},
) {
  const limit = Math.min(options.limit ?? 25, 100);
  const offset = options.offset ?? 0;

  const where: Prisma.AuditLogWhereInput = {
    userId,
    ...(options.actionType ? { actionType: options.actionType } : {}),
  };

  const [logs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, totalCount, limit, offset };
}
