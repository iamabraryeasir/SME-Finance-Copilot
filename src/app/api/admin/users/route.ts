import type { Prisma } from "@prisma/client";
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
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10),
    );
    const limit = Math.max(
      1,
      Math.min(100, Number.parseInt(searchParams.get("limit") || "10", 10)),
    );
    const skip = (page - 1) * limit;

    // Filter out the requesting admin itself and any other system admins
    const where: Prisma.UserWhereInput = {
      id: { not: session.user.id },
      role: { not: "admin" },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              {
                businessProfile: {
                  companyName: { contains: search, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    };

    const [totalCount, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          role: true,
          banned: true,
          banReason: true,
          createdAt: true,
          updatedAt: true,
          businessProfile: {
            select: {
              companyName: true,
              currency: true,
              openingBalance: true,
              minReserveThreshold: true,
            },
          },
          telegramAccount: {
            select: {
              id: true,
              telegramUsername: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              invoices: true,
              transactions: true,
              alerts: true,
              documentUploads: true,
              conversations: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const formattedUsers = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: u.emailVerified,
      role: u.role || "user",
      banned: Boolean(u.banned),
      banReason: u.banReason || null,
      joinedAt: u.createdAt.toISOString(),
      companyName: u.businessProfile?.companyName || "Unconfigured SME",
      currency: u.businessProfile?.currency || "BDT",
      openingBalance: u.businessProfile?.openingBalance ?? 0,
      minReserveThreshold: u.businessProfile?.minReserveThreshold ?? 0,
      isTelegramLinked: Boolean(u.telegramAccount),
      telegramUsername: u.telegramAccount?.telegramUsername || null,
      stats: {
        invoicesCount: u._count.invoices,
        transactionsCount: u._count.transactions,
        alertsCount: u._count.alerts,
        documentsCount: u._count.documentUploads,
        conversationsCount: u._count.conversations,
      },
    }));

    return ApiResponse.success(
      {
        users: formattedUsers,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
      "Users directory retrieved successfully.",
    );
  } catch (error) {
    if (isNextBailout(error)) throw error;
    console.error("[Admin Users API Error]:", error);
    return ApiResponse.internal("Failed to retrieve users directory.");
  }
}
