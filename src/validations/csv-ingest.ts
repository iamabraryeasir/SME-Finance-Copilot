import { z } from "zod";

/**
 * Supported canonical invoice types
 */
export const invoiceTypeEnum = z.enum(["RECEIVABLE", "PAYABLE"]);
export type InvoiceTypeEnum = z.infer<typeof invoiceTypeEnum>;

/**
 * Supported invoice statuses
 */
export const invoiceStatusEnum = z.enum([
  "PENDING",
  "PARTIALLY_PAID",
  "OVERDUE",
  "PAID",
  "CANCELLED",
]);
export type InvoiceStatusEnum = z.infer<typeof invoiceStatusEnum>;

/**
 * Raw CSV Row Schema with strict zero-trust boundary validation
 */
export const csvInvoiceRowSchema = z
  .object({
    invoiceNumber: z
      .string()
      .trim()
      .min(1, "Invoice number is required")
      .max(100, "Invoice number exceeds maximum length of 100 characters"),
    counterparty: z
      .string()
      .trim()
      .min(1, "Counterparty name is required")
      .max(255, "Counterparty name exceeds 255 characters"),
    type: invoiceTypeEnum,
    totalAmount: z
      .number({
        error: "Total amount must be a valid number",
      })
      .positive("Total amount must be greater than zero"),
    paidAmount: z
      .number({
        error: "Paid amount must be a valid number",
      })
      .nonnegative("Paid amount cannot be negative")
      .default(0),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, "Currency must be a 3-letter ISO code")
      .max(3, "Currency must be a 3-letter ISO code")
      .default("BDT"),
    issueDate: z.date({
      error: "Issue date must be a valid calendar date",
    }),
    dueDate: z.date({
      error: "Due date must be a valid calendar date",
    }),
    counterpartyEmail: z
      .string()
      .trim()
      .email("Invalid counterparty email format")
      .optional()
      .nullable(),
    counterpartyPhone: z.string().trim().max(30).optional().nullable(),
    status: invoiceStatusEnum.optional(),
  })
  .refine((row) => row.paidAmount <= row.totalAmount, {
    message: "Paid amount cannot exceed total invoice amount",
    path: ["paidAmount"],
  })
  .refine((row) => row.dueDate >= row.issueDate, {
    message: "Due date cannot be earlier than issue date",
    path: ["dueDate"],
  });

export type ValidatedCsvInvoiceRow = z.infer<typeof csvInvoiceRowSchema>;

/**
 * Structured validation failure representation for fail-closed reports
 */
export interface CsvRowValidationError {
  rowNumber: number; // 1-indexed spreadsheet row (excluding header row)
  field: string;
  rawValue: unknown;
  message: string;
}

/**
 * Duplicate invoice item report
 */
export interface CsvDuplicateReport {
  rowNumber: number;
  invoiceNumber: string;
  counterparty: string;
  totalAmount: number;
  reason: string;
}

/**
 * Complete Ingestion Response Contract
 */
export interface CsvIngestionSummary {
  uploadId: string;
  fileName: string;
  summary: {
    totalRows: number;
    importedCount: number;
    duplicateCount: number;
    failedCount: number;
    totalAmountInflow: number;
    totalAmountOutflow: number;
  };
  duplicates: CsvDuplicateReport[];
  errors: CsvRowValidationError[];
}

/**
 * Staged Ingestion Preview Contract (Returned for user review before committing)
 */
export interface CsvPreviewResult {
  uploadId: string;
  fileName: string;
  currency: string;
  summary: {
    totalRows: number;
    validCount: number;
    duplicateCount: number;
    totalAmountInflow: number;
    totalAmountOutflow: number;
  };
  rows: Array<
    ValidatedCsvInvoiceRow & {
      rowNumber: number;
      id: string;
      issueDateFormatted: string;
      dueDateFormatted: string;
    }
  >;
  duplicates: CsvDuplicateReport[];
}

/**
 * Zod schema for confirming staged invoice ingestion
 */
export const confirmIngestSchema = z.object({
  uploadId: z.string().uuid("Invalid upload ID"),
  approvedRows: z
    .array(
      z.object({
        invoiceNumber: z.string().trim().min(1, "Invoice number is required"),
        counterparty: z.string().trim().min(1, "Counterparty is required"),
        type: invoiceTypeEnum,
        totalAmount: z.number().positive("Total amount must be greater than 0"),
        paidAmount: z.number().nonnegative().default(0),
        currency: z.string().length(3).default("BDT"),
        issueDate: z.string().or(z.date()),
        dueDate: z.string().or(z.date()),
        counterpartyEmail: z.string().email().optional().nullable(),
        counterpartyPhone: z.string().optional().nullable(),
        status: invoiceStatusEnum.optional(),
      }),
    )
    .min(1, "At least one invoice must be approved for ledger commitment"),
});

export type ConfirmIngestInput = z.infer<typeof confirmIngestSchema>;
