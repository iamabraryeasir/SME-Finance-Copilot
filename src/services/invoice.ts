import { prisma } from "@/lib/prisma";

export interface InvoiceFilters {
  type?: "RECEIVABLE" | "PAYABLE";
  status?: "PENDING" | "PARTIALLY_PAID" | "OVERDUE" | "PAID" | "CANCELLED";
  search?: string;
  month?: string; // "YYYY-MM" or "ALL"
}

export interface AvailableMonth {
  value: string; // "2026-10"
  label: string; // "October 2026"
  count: number;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Retrieves invoices for a user tenant with monthly maintenance, filtering, and aggregate metrics.
 */
export async function getUserInvoices(
  userId: string,
  filters: InvoiceFilters = {},
) {
  if (!userId) {
    throw new Error("Tenant isolation violation: userId is required");
  }

  const whereClause: {
    userId: string;
    type?: "RECEIVABLE" | "PAYABLE";
    status?: "PENDING" | "PARTIALLY_PAID" | "OVERDUE" | "PAID" | "CANCELLED";
    issueDate?: { gte: Date; lte: Date };
    OR?: Array<{
      invoiceNumber?: { contains: string; mode: "insensitive" };
      counterparty?: { contains: string; mode: "insensitive" };
    }>;
  } = { userId };

  if (filters.type) {
    whereClause.type = filters.type;
  }

  if (filters.status) {
    whereClause.status = filters.status;
  }

  if (filters.search?.trim()) {
    const query = filters.search.trim();
    whereClause.OR = [
      { invoiceNumber: { contains: query, mode: "insensitive" } },
      { counterparty: { contains: query, mode: "insensitive" } },
    ];
  }

  // Monthly date-range filtering
  if (filters.month && filters.month !== "ALL") {
    const parts = filters.month.split("-");
    if (parts.length === 2) {
      const year = Number.parseInt(parts[0], 10);
      const monthNum = Number.parseInt(parts[1], 10);
      if (
        !Number.isNaN(year) &&
        !Number.isNaN(monthNum) &&
        monthNum >= 1 &&
        monthNum <= 12
      ) {
        const start = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));
        whereClause.issueDate = { gte: start, lte: end };
      }
    }
  }

  // Query filtered invoices and all tenant invoices in parallel
  const [invoices, allUserInvoices] = await Promise.all([
    prisma.invoice.findMany({
      where: whereClause,
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.invoice.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        totalAmount: true,
        paidAmount: true,
        remainingAmount: true,
        status: true,
        issueDate: true,
        dueDate: true,
      },
      orderBy: { issueDate: "desc" },
    }),
  ]);

  const now = new Date();

  // Aggregate monthly periods from all tenant invoices
  const monthMap = new Map<string, number>();
  for (const inv of allUserInvoices) {
    const d = new Date(inv.issueDate);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) || 0) + 1);
  }

  const availableMonths: AvailableMonth[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, count]) => {
      const [yearStr, monthStr] = key.split("-");
      const monthIndex = Number.parseInt(monthStr, 10) - 1;
      const monthName = MONTH_NAMES[monthIndex] || monthStr;
      return {
        value: key,
        label: `${monthName} ${yearStr}`,
        count,
      };
    });

  // Calculate KPIs for the currently viewed invoices
  let totalReceivables = 0;
  let totalPayables = 0;
  let overdueCount = 0;
  let paidCount = 0;
  let pendingCount = 0;

  for (const inv of invoices) {
    if (inv.type === "RECEIVABLE") {
      totalReceivables += inv.remainingAmount;
    } else {
      totalPayables += inv.remainingAmount;
    }

    if (
      inv.status === "OVERDUE" ||
      (inv.remainingAmount > 0 && new Date(inv.dueDate) < now)
    ) {
      overdueCount++;
    } else if (inv.status === "PAID") {
      paidCount++;
    } else {
      pendingCount++;
    }
  }

  return {
    invoices,
    availableMonths,
    activeMonth: filters.month || "ALL",
    summary: {
      totalAllTimeCount: allUserInvoices.length,
      filteredCount: invoices.length,
      totalReceivables: Math.round(totalReceivables * 100) / 100,
      totalPayables: Math.round(totalPayables * 100) / 100,
      netWorkingCapital:
        Math.round((totalReceivables - totalPayables) * 100) / 100,
      overdueCount,
      paidCount,
      pendingCount,
    },
  };
}

/**
 * Deletes a single invoice within the user tenant boundary.
 */
export async function deleteInvoice(
  userId: string,
  invoiceId: string,
  ipAddress?: string,
) {
  if (!userId) {
    throw new Error("Tenant isolation violation: userId is required");
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId },
  });

  if (!invoice) {
    throw new Error("Invoice not found or unauthorized");
  }

  return prisma.$transaction(async (tx) => {
    // Clean up realized transactions associated with this invoice
    await tx.transaction.deleteMany({
      where: { invoiceId, userId },
    });

    // Clean up associated action drafts
    await tx.actionDraft.deleteMany({
      where: { invoiceId, userId },
    });

    // Delete the invoice record
    await tx.invoice.delete({
      where: { id: invoiceId },
    });

    // Record immutable audit event
    await tx.auditLog.create({
      data: {
        userId,
        actor: "USER",
        actionType: "INGESTION",
        entityType: "Invoice",
        entityId: invoiceId,
        status: "SUCCESS",
        ipAddress: ipAddress || null,
        details: {
          action: "INVOICE_DELETED",
          invoiceNumber: invoice.invoiceNumber,
          counterparty: invoice.counterparty,
          type: invoice.type,
          totalAmount: invoice.totalAmount,
        },
      },
    });

    return invoice;
  });
}

/**
 * Deletes a batch of invoices within the user tenant boundary.
 */
export async function deleteInvoicesBatch(
  userId: string,
  invoiceIds: string[],
  ipAddress?: string,
) {
  if (!userId) {
    throw new Error("Tenant isolation violation: userId is required");
  }

  if (!invoiceIds || invoiceIds.length === 0) {
    return { deletedCount: 0 };
  }

  const targetInvoices = await prisma.invoice.findMany({
    where: {
      id: { in: invoiceIds },
      userId,
    },
    select: { id: true, invoiceNumber: true },
  });

  const validIds = targetInvoices.map((inv) => inv.id);

  if (validIds.length === 0) {
    return { deletedCount: 0 };
  }

  await prisma.$transaction(async (tx) => {
    // Delete linked transactions
    await tx.transaction.deleteMany({
      where: {
        invoiceId: { in: validIds },
        userId,
      },
    });

    // Delete linked action drafts
    await tx.actionDraft.deleteMany({
      where: {
        invoiceId: { in: validIds },
        userId,
      },
    });

    // Delete invoices
    await tx.invoice.deleteMany({
      where: {
        id: { in: validIds },
        userId,
      },
    });

    // Record audit log
    await tx.auditLog.create({
      data: {
        userId,
        actor: "USER",
        actionType: "INGESTION",
        entityType: "Invoice",
        status: "SUCCESS",
        ipAddress: ipAddress || null,
        details: {
          action: "BATCH_INVOICES_DELETED",
          deletedCount: validIds.length,
          invoiceNumbers: targetInvoices.map((i) => i.invoiceNumber),
        },
      },
    });
  });

  return { deletedCount: validIds.length };
}
