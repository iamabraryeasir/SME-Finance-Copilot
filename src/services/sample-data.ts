import * as fs from "node:fs/promises";
import * as path from "node:path";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { inngest } from "@/utils/inngest";
import { csvInvoiceRowSchema } from "@/validations/csv-ingest";

export interface LoadSampleDataResult {
  success: boolean;
  importedCount: number;
  existingCount: number;
  totalAmountInflow: number;
  totalAmountOutflow: number;
  message: string;
}

/**
 * Loads the 30-day realistic sample dataset into the authenticated user's tenant ledger.
 * Idempotent: Skips any invoice numbers that already exist for this user.
 */
export async function seedSampleInvoicesForUser(
  userId: string,
  ipAddress?: string,
): Promise<LoadSampleDataResult> {
  if (!userId) {
    throw new Error("Tenant isolation violation: userId is required");
  }

  const sampleCsvPath = path.resolve(process.cwd(), "data", "sample_data.csv");
  const fileContent = await fs.readFile(sampleCsvPath, "utf-8");

  const parseResult = Papa.parse<Record<string, string>>(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
    throw new Error(
      `Failed to parse sample_data.csv: ${parseResult.errors[0]?.message || "Unknown CSV parsing error"}`,
    );
  }

  // Fetch existing invoices for this user to ensure idempotency
  const existingInvoices = await prisma.invoice.findMany({
    where: { userId },
    select: { invoiceNumber: true },
  });
  const existingNumbers = new Set(
    existingInvoices.map((inv) => inv.invoiceNumber),
  );

  const invoicesToCreate: Array<{
    id: string;
    userId: string;
    invoiceNumber: string;
    counterparty: string;
    counterpartyEmail: string | null;
    counterpartyPhone: string | null;
    type: "RECEIVABLE" | "PAYABLE";
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    currency: string;
    issueDate: Date;
    dueDate: Date;
    status: "PENDING" | "PARTIALLY_PAID" | "OVERDUE" | "PAID" | "CANCELLED";
    source: "WEB_CSV";
  }> = [];

  const transactionsToCreate: Array<{
    id: string;
    userId: string;
    invoiceId: string;
    type: "INFLOW" | "OUTFLOW";
    category: "CUSTOMER_RECEIPT" | "SUPPLIER_PAYMENT";
    amount: number;
    currency: string;
    transactionDate: Date;
    description: string;
    isProjected: boolean;
  }> = [];

  let totalAmountInflow = 0;
  let totalAmountOutflow = 0;
  let skippedCount = 0;

  for (const rawRow of parseResult.data) {
    const invoiceNumber = rawRow["Invoice Number"]?.trim();
    if (!invoiceNumber || existingNumbers.has(invoiceNumber)) {
      skippedCount++;
      continue;
    }

    const type = rawRow.Type?.trim().toUpperCase() as "RECEIVABLE" | "PAYABLE";
    const totalAmount = Number.parseFloat(rawRow["Total Amount"] || "0");
    const paidAmount = Number.parseFloat(rawRow["Paid Amount"] || "0");
    const currency = rawRow.Currency?.trim().toUpperCase() || "BDT";
    const issueDate = new Date(rawRow["Issue Date"]);
    const dueDate = new Date(rawRow["Due Date"]);
    const status = (rawRow.Status?.trim().toUpperCase() || "PENDING") as
      | "PENDING"
      | "PARTIALLY_PAID"
      | "OVERDUE"
      | "PAID"
      | "CANCELLED";

    // Validate with strict runtime Zod schema
    const validated = csvInvoiceRowSchema.safeParse({
      invoiceNumber,
      counterparty: rawRow.Counterparty?.trim(),
      type,
      totalAmount,
      paidAmount,
      currency,
      issueDate,
      dueDate,
      counterpartyEmail: rawRow.Email?.trim() || null,
      counterpartyPhone: rawRow.Phone?.trim() || null,
      status,
    });

    if (!validated.success) {
      console.warn(
        `[Sample Seed] Skipping invalid row ${invoiceNumber}:`,
        validated.error.issues[0]?.message,
      );
      continue;
    }

    const remainingAmount = Math.max(0, totalAmount - paidAmount);
    const invoiceId = globalThis.crypto.randomUUID();

    if (type === "RECEIVABLE") {
      totalAmountInflow += totalAmount;
    } else {
      totalAmountOutflow += totalAmount;
    }

    invoicesToCreate.push({
      id: invoiceId,
      userId,
      invoiceNumber,
      counterparty: validated.data.counterparty,
      counterpartyEmail: validated.data.counterpartyEmail ?? null,
      counterpartyPhone: validated.data.counterpartyPhone ?? null,
      type,
      totalAmount,
      paidAmount,
      remainingAmount,
      currency,
      issueDate,
      dueDate,
      status,
      source: "WEB_CSV",
    });

    // Create settled cash transaction if partially or fully paid
    if (paidAmount > 0) {
      transactionsToCreate.push({
        id: globalThis.crypto.randomUUID(),
        userId,
        invoiceId,
        type: type === "RECEIVABLE" ? "INFLOW" : "OUTFLOW",
        category:
          type === "RECEIVABLE" ? "CUSTOMER_RECEIPT" : "SUPPLIER_PAYMENT",
        amount: paidAmount,
        currency,
        transactionDate: issueDate,
        description: `Settled payment for ${type === "RECEIVABLE" ? "Customer" : "Supplier"} Invoice ${invoiceNumber} (${validated.data.counterparty})`,
        isProjected: false,
      });
    }
  }

  if (invoicesToCreate.length > 0) {
    await prisma.$transaction(
      async (tx) => {
        // Insert invoices
        await tx.invoice.createMany({
          data: invoicesToCreate,
        });

        // Insert settled transactions
        if (transactionsToCreate.length > 0) {
          await tx.transaction.createMany({
            data: transactionsToCreate,
          });
        }

        // Record audit log
        await tx.auditLog.create({
          data: {
            userId,
            actor: "USER",
            actionType: "INGESTION",
            entityType: "Invoice",
            entityId: "sample_data.csv",
            status: "SUCCESS",
            ipAddress: ipAddress ?? null,
            details: {
              source: "SAMPLE_SEED",
              importedCount: invoicesToCreate.length,
              skippedCount,
              totalAmountInflow,
              totalAmountOutflow,
            },
          },
        });
      },
      {
        maxWait: 15000,
        timeout: 30000,
      },
    );

    // Invalidate Redis cache for this user's 30-day forecast
    if (redis) {
      try {
        await redis.del(`user:${userId}:forecast_30d`);
      } catch (err) {
        console.warn(
          "Failed to clear Redis forecast cache after sample seed:",
          err,
        );
      }
    }

    // Trigger Inngest background event
    try {
      await inngest.send({
        name: "invoice.ledger.mutated",
        data: {
          userId,
          action: "INSERT",
          affectedCount: invoicesToCreate.length,
          source: "SAMPLE_DATA_SEED",
        },
      });
    } catch (inngestErr) {
      console.warn("[Inngest Dispatch Warning]:", inngestErr);
    }
  }

  return {
    success: true,
    importedCount: invoicesToCreate.length,
    existingCount: skippedCount,
    totalAmountInflow: Math.round(totalAmountInflow * 100) / 100,
    totalAmountOutflow: Math.round(totalAmountOutflow * 100) / 100,
    message:
      invoicesToCreate.length > 0
        ? `Successfully imported ${invoicesToCreate.length} sample invoices into your financial ledger.`
        : "Sample invoices have already been loaded into your account.",
  };
}
