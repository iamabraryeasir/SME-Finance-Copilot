import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiResponse, isNextBailout } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const BanUserSchema = z.object({
  banned: z.boolean(),
  reason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id || session.user.role !== "admin") {
      return ApiResponse.forbidden(
        "Access denied: System administrator role required.",
      );
    }

    const { id: targetUserId } = await params;

    // Disallow an admin from banning themselves
    if (targetUserId === session.user.id) {
      return ApiResponse.badRequest(
        "You cannot ban your own administrator account.",
      );
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = BanUserSchema.safeParse(body);

    if (!parseResult.success) {
      return ApiResponse.badRequest(
        "Invalid request payload. 'banned' boolean is required.",
      );
    }

    const { banned, reason } = parseResult.data;

    // Verify user exists and is not a protected admin
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        banned: true,
      },
    });

    if (!targetUser) {
      return ApiResponse.notFound("User not found.");
    }

    if (targetUser.role === "admin") {
      return ApiResponse.forbidden("Administrator accounts cannot be banned.");
    }

    // Update user banned state and ban reason
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        banned,
        banReason: banned ? reason || "Administrative sanction" : null,
        banExpires: banned
          ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000)
          : null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        banned: true,
        banReason: true,
      },
    });

    // If banning, immediately terminate and purge all active sessions for immediate lockout
    if (banned) {
      await prisma.session.deleteMany({
        where: { userId: targetUserId },
      });
    }

    // Record immutable audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        actor: "USER",
        actionType: "SETTINGS_UPDATED",
        entityType: "User",
        entityId: targetUserId,
        status: "SUCCESS",
        details: {
          subAction: banned ? "ADMIN_BAN_USER" : "ADMIN_UNBAN_USER",
          adminEmail: session.user.email,
          targetEmail: targetUser.email,
          targetName: targetUser.name,
          banned,
          reason: reason || null,
        },
      },
    });

    return ApiResponse.success(
      updatedUser,
      banned
        ? `User ${targetUser.email} has been banned and their active sessions revoked.`
        : `User ${targetUser.email} has been unbanned.`,
    );
  } catch (error) {
    if (isNextBailout(error)) throw error;
    console.error("[Admin Ban User API Error]:", error);
    return ApiResponse.internal("Failed to update user ban status.");
  }
}
