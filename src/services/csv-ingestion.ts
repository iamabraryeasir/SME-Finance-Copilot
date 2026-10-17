import type { Prisma } from "@prisma/client";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import {
  type ConfirmIngestInput,
  type CsvDuplicateReport,
  type CsvIngestionSummary,
  type CsvPreviewResult,
  type CsvRowValidationError,
  csvInvoiceRowSchema,
  type ValidatedCsvInvoiceRow,
} from "@/validations/csv-ingest";

export class CsvIngestionError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errors: CsvRowValidationError[] = [],
    public readonly uploadId?: string,
  ) {
    super(message);
    this.name = "CsvIngestionError";
  }
}

/**
 * Normalizes dates across various common accounting formats:
 * - YYYY-MM-DD
 * - DD/MM/YYYY or DD-MM-YYYY
 * - MM/DD/YYYY or MM-DD-YYYY
 */
function parseAccountingDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const raw = String(value).trim();
  if (!raw) return null;

  // Direct ISO parsing
  const isoParsed = new Date(raw);
  if (
    !Number.isNaN(isoParsed.getTime()) &&
    raw.includes("-") &&
    raw.length >= 10
  ) {
    return isoParsed;
  }

  // Handle delimiter formats (e.g. DD/MM/YYYY or MM/DD/YYYY)
  const parts = raw.split(/[/.-]/);
  if (parts.length === 3) {
    const p1 = Number.parseInt(parts[0], 10);
    const p2 = Number.parseInt(parts[1], 10);
    const p3 = Number.parseInt(parts[2], 10);

    // Case 1: YYYY-MM-DD
    if (p1 > 1000 && p2 >= 1 && p2 <= 12 && p3 >= 1 && p3 <= 31) {
      return new Date(Date.UTC(p1, p2 - 1, p3));
    }
    // Case 2: DD/MM/YYYY (Common in BD / Commonwealth)
    if (p3 > 1000 && p2 >= 1 && p2 <= 12 && p1 >= 1 && p1 <= 31) {
      return new Date(Date.UTC(p3, p2 - 1, p1));
    }
    // Case 3: MM/DD/YYYY (US standard)
    if (p3 > 1000 && p1 >= 1 && p1 <= 12 && p2 >= 1 && p2 <= 31) {
      return new Date(Date.UTC(p3, p1 - 1, p2));
    }
  }

  return Number.isNaN(isoParsed.getTime()) ? null : isoParsed;
}

/**
 * Sanitizes numeric amounts by stripping currency symbols, commas, and whitespace.
 */
function parseAccountingNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const cleaned = String(value)
    .replace(/[৳$,\s]/g, "")
    .trim();

  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? Number.NaN : Math.round(parsed * 100) / 100;
}

/**
 * Maps raw arbitrary CSV headers to canonical schema fields.
 */
function normalizeCsvRowHeaders(
  rawRow: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(rawRow)) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (
      [
        "invoicenumber",
        "invoiceno",
        "invoiceid",
        "billnumber",
        "billno",
        "invoice",
      ].includes(cleanKey)
    ) {
      normalized.invoiceNumber =
        typeof val === "string" ? val.trim() : String(val ?? "").trim();
    } else if (
      [
        "counterparty",
        "customer",
        "customername",
        "supplier",
        "suppliername",
        "vendor",
        "vendorname",
        "client",
        "party",
        "partyname",
      ].includes(cleanKey)
    ) {
      normalized.counterparty =
        typeof val === "string" ? val.trim() : String(val ?? "").trim();
    } else if (["type", "invoicetype", "kind", "category"].includes(cleanKey)) {
      const typeStr = String(val ?? "")
        .trim()
        .toUpperCase();
      if (
        ["AR", "RECEIVABLE", "INFLOW", "SALE", "CUSTOMER"].includes(typeStr)
      ) {
        normalized.type = "RECEIVABLE";
      } else if (
        [
          "AP",
          "PAYABLE",
          "OUTFLOW",
          "PURCHASE",
          "SUPPLIER",
          "EXPENSE",
        ].includes(typeStr)
      ) {
        normalized.type = "PAYABLE";
      } else {
        normalized.type = typeStr;
      }
    } else if (
      [
        "totalamount",
        "amount",
        "total",
        "grossamount",
        "billamount",
        "invoiceamount",
      ].includes(cleanKey)
    ) {
      normalized.totalAmount = parseAccountingNumber(val);
    } else if (
      [
        "paidamount",
        "paid",
        "settledamount",
        "paymentreceived",
        "paymentmade",
      ].includes(cleanKey)
    ) {
      normalized.paidAmount = parseAccountingNumber(val);
    } else if (["currency", "curr"].includes(cleanKey)) {
      normalized.currency = String(val ?? "")
        .trim()
        .toUpperCase();
    } else if (
      ["issuedate", "date", "invoicedate", "billdate"].includes(cleanKey)
    ) {
      normalized.issueDate = parseAccountingDate(val);
    } else if (["duedate", "paymentduedate", "due"].includes(cleanKey)) {
      normalized.dueDate = parseAccountingDate(val);
    } else if (
      [
        "counterpartyemail",
        "email",
        "customeremail",
        "supplieremail",
        "contactemail",
      ].includes(cleanKey)
    ) {
      const email = String(val ?? "").trim();
      normalized.counterpartyEmail = email ? email : null;
    } else if (
      [
        "counterpartyphone",
        "phone",
        "mobile",
        "contactnumber",
        "phonenumber",
      ].includes(cleanKey)
    ) {
      const phone = String(val ?? "").trim();
      normalized.counterpartyPhone = phone ? phone : null;
    } else if (
      ["status", "invoicestatus", "paymentstatus"].includes(cleanKey)
    ) {
      const statusStr = String(val ?? "")
        .trim()
        .toUpperCase();
      if (
        ["PENDING", "PARTIALLY_PAID", "OVERDUE", "PAID", "CANCELLED"].includes(
          statusStr,
        )
      ) {
        normalized.status = statusStr;
      }
    }
  }

  return normalized;
}

/**
 * Parses and validates CSV content in-memory, checks deduplication against PostgreSQL,
 * and creates a staged DocumentUpload record with status NEEDS_CONFIRMATION for user review.
 */
export async function previewAndStageCsv(
  userId: string,
  fileName: string,
  csvContent: string,
  defaultCurrency = "BDT",
  ipAddress?: string,
): Promise<CsvPreviewResult> {
  if (!userId) {
    throw new CsvIngestionError(
      "Tenant isolation violation: userId is required",
      401,
    );
  }

  if (!csvContent || csvContent.trim().length === 0) {
    throw new CsvIngestionError("The uploaded CSV file is empty", 400);
  }

  // Parse CSV in memory with PapaParse
  const parsed = Papa.parse<Record<string, unknown>>(csvContent, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors && parsed.errors.length > 0) {
    const parseErrors: CsvRowValidationError[] = parsed.errors.map((err) => ({
      rowNumber: (err.row ?? 0) + 1,
      field: "CSV_SYNTAX",
      rawValue: err.code,
      message: err.message,
    }));

    throw new CsvIngestionError(
      "CSV syntax parsing failed. Please verify the CSV format.",
      400,
      parseErrors,
    );
  }

  const rawRows = parsed.data;
  if (!rawRows || rawRows.length === 0) {
    throw new CsvIngestionError("No data rows found in the uploaded CSV", 400);
  }

  // Row-level zero-trust validation collection
  const validationErrors: CsvRowValidationError[] = [];
  const validatedRows: Array<{
    rowNumber: number;
    row: ValidatedCsvInvoiceRow;
  }> = [];

  for (let idx = 0; idx < rawRows.length; idx++) {
    const rowNumber = idx + 2; // Row 1 is header
    const rawRow = rawRows[idx];

    // Normalize field names
    const normalized = normalizeCsvRowHeaders(rawRow);

    if (!normalized.currency) {
      normalized.currency = defaultCurrency;
    }

    if (normalized.paidAmount === undefined || normalized.paidAmount === null) {
      normalized.paidAmount = 0;
    }

    // Validate with Zod
    const result = csvInvoiceRowSchema.safeParse(normalized);

    if (!result.success) {
      for (const issue of result.error.issues) {
        const fieldName = issue.path.join(".") || "row";
        validationErrors.push({
          rowNumber,
          field: fieldName,
          rawValue: normalized[fieldName] ?? rawRow[fieldName],
          message: issue.message,
        });
      }
    } else {
      validatedRows.push({
        rowNumber,
        row: result.data,
      });
    }
  }

  // Fail-closed enforcement: if any row fails validation, abort staging
  if (validationErrors.length > 0) {
    const failedUpload = await prisma.documentUpload.create({
      data: {
        userId,
        fileName,
        fileType: "CSV",
        fileUrl: "direct://postgres",
        source: "WEB",
        status: "FAILED",
        errorReport: validationErrors as unknown as object,
        extractedData: {
          totalRows: rawRows.length,
          failedCount: validationErrors.length,
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        actor: "USER",
        actionType: "INGESTION",
        entityType: "DocumentUpload",
        entityId: failedUpload.id,
        status: "FAILED",
        ipAddress: ipAddress ?? null,
        details: {
          fileName,
          totalRows: rawRows.length,
          failedRowsCount: validationErrors.length,
        },
      },
    });

    throw new CsvIngestionError(
      `CSV validation failed: ${validationErrors.length} issue(s) detected across ${rawRows.length} rows. Please review and fix formatting errors before importing.`,
      422,
      validationErrors,
      failedUpload.id,
    );
  }

  // Deduplication check: inspect database for pre-existing invoices within user's tenancy
  const incomingInvoiceNumbers = validatedRows.map(
    (item) => item.row.invoiceNumber,
  );

  const existingInvoices = await prisma.invoice.findMany({
    where: {
      userId,
      invoiceNumber: { in: incomingInvoiceNumbers },
    },
    select: {
      invoiceNumber: true,
      counterparty: true,
      totalAmount: true,
    },
  });

  const existingSet = new Set(existingInvoices.map((inv) => inv.invoiceNumber));

  // Also check for duplicate invoice numbers within the same uploaded CSV
  const seenInBatch = new Set<string>();
  const duplicates: CsvDuplicateReport[] = [];
  const rowsToPreview: Array<
    ValidatedCsvInvoiceRow & {
      rowNumber: number;
      id: string;
      issueDateFormatted: string;
      dueDateFormatted: string;
    }
  > = [];

  let totalAmountInflow = 0;
  let totalAmountOutflow = 0;

  for (const item of validatedRows) {
    const invNum = item.row.invoiceNumber;

    if (existingSet.has(invNum)) {
      duplicates.push({
        rowNumber: item.rowNumber,
        invoiceNumber: invNum,
        counterparty: item.row.counterparty,
        totalAmount: item.row.totalAmount,
        reason: "Invoice already exists in database ledger",
      });
    } else if (seenInBatch.has(invNum)) {
      duplicates.push({
        rowNumber: item.rowNumber,
        invoiceNumber: invNum,
        counterparty: item.row.counterparty,
        totalAmount: item.row.totalAmount,
        reason: "Duplicate invoice number repeated within this CSV file",
      });
    } else {
      seenInBatch.add(invNum);

      if (item.row.type === "RECEIVABLE") {
        totalAmountInflow += item.row.totalAmount;
      } else {
        totalAmountOutflow += item.row.totalAmount;
      }

      rowsToPreview.push({
        ...item.row,
        rowNumber: item.rowNumber,
        id: `row-${item.rowNumber}-${invNum}`,
        issueDateFormatted: item.row.issueDate.toISOString().split("T")[0],
        dueDateFormatted: item.row.dueDate.toISOString().split("T")[0],
      });
    }
  }

  // Create DocumentUpload in NEEDS_CONFIRMATION state (holding staged data)
  const stagedUpload = await prisma.documentUpload.create({
    data: {
      userId,
      fileName,
      fileType: "CSV",
      fileUrl: "direct://postgres",
      source: "WEB",
      status: "NEEDS_CONFIRMATION",
      extractedData: {
        totalRows: rawRows.length,
        validCount: rowsToPreview.length,
        duplicateCount: duplicates.length,
        totalAmountInflow,
        totalAmountOutflow,
        rows: rowsToPreview,
        duplicates,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    uploadId: stagedUpload.id,
    fileName,
    currency: defaultCurrency,
    summary: {
      totalRows: rawRows.length,
      validCount: rowsToPreview.length,
      duplicateCount: duplicates.length,
      totalAmountInflow: Math.round(totalAmountInflow * 100) / 100,
      totalAmountOutflow: Math.round(totalAmountOutflow * 100) / 100,
    },
    rows: rowsToPreview,
    duplicates,
  };
}

/**
 * Commits approved staged invoices into PostgreSQL ledger atomically.
 */
export async function commitApprovedCsv(
  userId: string,
  input: ConfirmIngestInput,
  ipAddress?: string,
): Promise<CsvIngestionSummary> {
  if (!userId) {
    throw new CsvIngestionError(
      "Tenant isolation violation: userId is required",
      401,
    );
  }

  // Verify DocumentUpload belongs to this user and is awaiting confirmation
  const documentUpload = await prisma.documentUpload.findUnique({
    where: { id: input.uploadId },
  });

  if (!documentUpload || documentUpload.userId !== userId) {
    throw new CsvIngestionError(
      "Ingestion session not found or unauthorized",
      404,
    );
  }

  if (documentUpload.status !== "NEEDS_CONFIRMATION") {
    throw new CsvIngestionError(
      `Document upload is not awaiting confirmation (Current status: ${documentUpload.status})`,
      400,
    );
  }

  const approvedRows = input.approvedRows;
  const now = new Date();

  let totalAmountInflow = 0;
  let totalAmountOutflow = 0;

  await prisma.$transaction(async (tx) => {
    // 1. Mark DocumentUpload as CONFIRMED
    await tx.documentUpload.update({
      where: { id: input.uploadId },
      data: {
        status: "CONFIRMED",
        extractedData: {
          approvedCount: approvedRows.length,
          confirmedAt: now.toISOString(),
        },
      },
    });

    // 2. Insert Invoices & Transactions
    for (const row of approvedRows) {
      const issueDate = new Date(row.issueDate);
      const dueDate = new Date(row.dueDate);
      const paidAmount = row.paidAmount ?? 0;
      const remainingAmount = Math.max(
        0,
        Math.round((row.totalAmount - paidAmount) * 100) / 100,
      );

      // Deterministic status derivation
      let finalStatus = row.status;
      if (!finalStatus) {
        if (paidAmount >= row.totalAmount) {
          finalStatus = "PAID";
        } else if (paidAmount > 0) {
          finalStatus = "PARTIALLY_PAID";
        } else if (dueDate < now) {
          finalStatus = "OVERDUE";
        } else {
          finalStatus = "PENDING";
        }
      }

      if (row.type === "RECEIVABLE") {
        totalAmountInflow += row.totalAmount;
      } else {
        totalAmountOutflow += row.totalAmount;
      }

      const createdInvoice = await tx.invoice.create({
        data: {
          userId,
          invoiceNumber: row.invoiceNumber,
          counterparty: row.counterparty,
          counterpartyEmail: row.counterpartyEmail ?? null,
          counterpartyPhone: row.counterpartyPhone ?? null,
          type: row.type,
          totalAmount: row.totalAmount,
          paidAmount,
          remainingAmount,
          currency: row.currency || "BDT",
          issueDate,
          dueDate,
          status: finalStatus,
          source: "WEB_CSV",
          documentUploadId: documentUpload.id,
        },
      });

      // 3. Create realized Transaction if payment is partially or fully settled
      if (paidAmount > 0) {
        await tx.transaction.create({
          data: {
            userId,
            invoiceId: createdInvoice.id,
            type: row.type === "RECEIVABLE" ? "INFLOW" : "OUTFLOW",
            category:
              row.type === "RECEIVABLE"
                ? "CUSTOMER_RECEIPT"
                : "SUPPLIER_PAYMENT",
            amount: paidAmount,
            currency: row.currency || "BDT",
            transactionDate: issueDate,
            description: `Settled payment for ${row.type === "RECEIVABLE" ? "Customer" : "Supplier"} Invoice ${row.invoiceNumber} (${row.counterparty})`,
            isProjected: false,
          },
        });
      }
    }

    // 4. Record AuditLog
    await tx.auditLog.create({
      data: {
        userId,
        actor: "USER",
        actionType: "INGESTION",
        entityType: "DocumentUpload",
        entityId: documentUpload.id,
        status: "SUCCESS",
        ipAddress: ipAddress ?? null,
        details: {
          fileName: documentUpload.fileName,
          importedCount: approvedRows.length,
          totalAmountInflow,
          totalAmountOutflow,
          action: "APPROVED_AND_COMMITTED",
        },
      },
    });
  });

  return {
    uploadId: documentUpload.id,
    fileName: documentUpload.fileName,
    summary: {
      totalRows: approvedRows.length,
      importedCount: approvedRows.length,
      duplicateCount: 0,
      failedCount: 0,
      totalAmountInflow: Math.round(totalAmountInflow * 100) / 100,
      totalAmountOutflow: Math.round(totalAmountOutflow * 100) / 100,
    },
    duplicates: [],
    errors: [],
  };
}

/**
 * Cancels and discards a staged DocumentUpload session.
 */
export async function cancelStagedCsv(userId: string, uploadId: string) {
  if (!userId) {
    throw new CsvIngestionError(
      "Tenant isolation violation: userId is required",
      401,
    );
  }

  const documentUpload = await prisma.documentUpload.findUnique({
    where: { id: uploadId },
  });

  if (!documentUpload || documentUpload.userId !== userId) {
    throw new CsvIngestionError(
      "Ingestion session not found or unauthorized",
      404,
    );
  }

  if (documentUpload.status === "NEEDS_CONFIRMATION") {
    await prisma.documentUpload.delete({
      where: { id: uploadId },
    });
  }

  return { success: true };
}
