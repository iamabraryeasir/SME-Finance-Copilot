import { prisma } from "@/lib/prisma";
import type { UpdateBusinessProfileInput } from "@/validations/business-profile";

/**
 * Retrieves the business profile for a specific user tenant.
 */
export async function getBusinessProfile(userId: string) {
  if (!userId)
    throw new Error("Tenant isolation violation: userId is required");

  return prisma.businessProfile.findUnique({
    where: { userId },
  });
}

/**
 * Retrieves or automatically initializes a default business profile for a new user.
 */
export async function getOrCreateBusinessProfile(
  userId: string,
  fallbackCompanyName?: string,
) {
  if (!userId)
    throw new Error("Tenant isolation violation: userId is required");

  const existing = await prisma.businessProfile.findUnique({
    where: { userId },
  });

  if (existing) return existing;

  // Fetch user name for polite default company naming
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  const defaultCompanyName =
    fallbackCompanyName ||
    (user?.name ? `${user.name}'s Business` : "My SME Enterprise");

  return prisma.businessProfile.create({
    data: {
      userId,
      companyName: defaultCompanyName,
      currency: "BDT",
      openingBalance: 0,
      openingBalanceDate: new Date(),
      minReserveThreshold: 50000,
      latePaymentAssumptionDays: 7,
      upcomingPaymentAlertDays: 3,
      expenseBaselineMonthly: null,
    },
  });
}

/**
 * Updates business profile settings within a tenant boundary and records an audit log entry.
 */
export async function updateBusinessProfile(
  userId: string,
  input: UpdateBusinessProfileInput,
  actor: "USER" | "AGENT" | "SYSTEM" | "TELEGRAM" = "USER",
  ipAddress?: string,
) {
  if (!userId)
    throw new Error("Tenant isolation violation: userId is required");

  // Fetch current profile to calculate change delta for the audit log
  const current = await getOrCreateBusinessProfile(userId);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.businessProfile.update({
      where: { userId },
      data: {
        companyName: input.companyName,
        currency: input.currency,
        openingBalance: input.openingBalance,
        openingBalanceDate: input.openingBalanceDate,
        minReserveThreshold: input.minReserveThreshold,
        latePaymentAssumptionDays: input.latePaymentAssumptionDays,
        upcomingPaymentAlertDays: input.upcomingPaymentAlertDays,
        expenseBaselineMonthly: input.expenseBaselineMonthly,
      },
    });

    // Record immutable audit entry
    await tx.auditLog.create({
      data: {
        userId,
        actor,
        actionType: "SETTINGS_UPDATED",
        entityType: "BusinessProfile",
        entityId: updated.id,
        status: "SUCCESS",
        ipAddress: ipAddress || null,
        details: {
          previous: {
            companyName: current.companyName,
            currency: current.currency,
            openingBalance: current.openingBalance,
            minReserveThreshold: current.minReserveThreshold,
            latePaymentAssumptionDays: current.latePaymentAssumptionDays,
            upcomingPaymentAlertDays: current.upcomingPaymentAlertDays,
          },
          updated: {
            companyName: updated.companyName,
            currency: updated.currency,
            openingBalance: updated.openingBalance,
            minReserveThreshold: updated.minReserveThreshold,
            latePaymentAssumptionDays: updated.latePaymentAssumptionDays,
            upcomingPaymentAlertDays: updated.upcomingPaymentAlertDays,
          },
        },
      },
    });

    return updated;
  });
}
