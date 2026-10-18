import { eventType, staticSchema } from "inngest";

export type DocumentUploadedPayload = {
  uploadId: string;
  userId: string;
  fileName: string;
  fileType: "PDF" | "IMAGE";
  source: "WEB" | "TELEGRAM";
  fileBase64?: string;
  telegramFileId?: string;
  [key: string]: unknown;
};

export type LedgerMutatedPayload = {
  userId: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  affectedCount: number;
  source: "CSV" | "OCR" | "MANUAL";
  [key: string]: unknown;
};

export const invoiceDocumentUploadedEvent = eventType(
  "invoice.document.uploaded",
  {
    schema: staticSchema<DocumentUploadedPayload>(),
  },
);

export const invoiceLedgerMutatedEvent = eventType("invoice.ledger.mutated", {
  schema: staticSchema<LedgerMutatedPayload>(),
});
