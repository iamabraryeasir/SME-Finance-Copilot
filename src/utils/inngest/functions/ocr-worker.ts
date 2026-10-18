import { prisma } from "@/lib/prisma";
import {
  extractInvoiceFromDocument,
  extractTextFromPDF,
} from "@/services/ocr-extraction";

import { inngest } from "@/utils/inngest/client";
import { invoiceDocumentUploadedEvent } from "@/utils/inngest/events";

export const ocrWorker = inngest.createFunction(
  {
    id: "ocr-document-extractor",
    name: "OCR Document Extraction & Uncertainty Gate",
    retries: 2,
    concurrency: {
      limit: 2,
    },
    triggers: [invoiceDocumentUploadedEvent],
    onFailure: async ({ error, event }) => {
      const origEventData = (
        event?.data as { event?: { data?: Record<string, unknown> } }
      )?.event?.data;
      const uploadId = (origEventData?.uploadId ||
        (event?.data as Record<string, unknown>)?.uploadId) as
        | string
        | undefined;
      const userId = (origEventData?.userId ||
        (event?.data as Record<string, unknown>)?.userId) as string | undefined;
      const fileName = (origEventData?.fileName ||
        (event?.data as Record<string, unknown>)?.fileName) as
        | string
        | undefined;

      if (uploadId && userId) {
        await prisma.documentUpload.updateMany({
          where: { id: uploadId, userId },
          data: {
            status: "FAILED",
            errorReport: {
              error: error.message || "Background OCR extraction failed",
              failedAt: new Date().toISOString(),
            },
          },
        });

        await prisma.auditLog.create({
          data: {
            userId,
            actor: "SYSTEM",
            actionType: "INGESTION",
            entityType: "DocumentUpload",
            entityId: uploadId,
            status: "FAILED",
            details: {
              fileName: fileName || "unknown",
              stage: "OCR_WORKER_FAILED",
              error: error.message,
            },
          },
        });
      }
    },
  },
  async ({ event, step }) => {
    const {
      uploadId,
      userId,
      fileName,
      fileType,
      source,
      fileBase64: eventBase64,
      telegramFileId,
    } = event.data;

    // Helper step to resolve base64 content either from event or from database dataUri
    const fileBase64 = await step.run("resolve-file-content", async () => {
      if (eventBase64) return eventBase64;
      const doc = await prisma.documentUpload.findUnique({
        where: { id: uploadId },
        select: { fileUrl: true },
      });
      if (doc?.fileUrl?.startsWith("data:")) {
        const parts = doc.fileUrl.split(",");
        return parts[1] || "";
      }
      return "";
    });

    // Step 1: Transition status to PROCESSING
    await step.run("mark-status-processing", async () => {
      await prisma.documentUpload.updateMany({
        where: { id: uploadId, userId },
        data: {
          status: "PROCESSING",
        },
      });
      return { status: "PROCESSING" };
    });

    // Step 2: Extract text content from document
    const rawText = await step.run("extract-text-content", async () => {
      if (fileType === "PDF" && fileBase64) {
        const buffer = Buffer.from(fileBase64, "base64");
        return await extractTextFromPDF(buffer);
      }
      return "";
    });

    // Step 3: AI structured extraction via Gemini Flash or deterministic fallback
    const extraction = await step.run(
      "structured-invoice-extraction",
      async () => {
        return await extractInvoiceFromDocument({
          rawText,
          fileBase64,
          mimeType: fileType === "PDF" ? "application/pdf" : "image/jpeg",
        });
      },
    );

    // Step 4: Evaluate Uncertainty Gate (Threshold: 0.85)
    const gateResult = await step.run("apply-uncertainty-gate", async () => {
      const isUncertain = extraction.confidenceScore < 0.85;
      const targetStatus = isUncertain ? "NEEDS_CONFIRMATION" : "EXTRACTED";

      await prisma.documentUpload.updateMany({
        where: { id: uploadId, userId },
        data: {
          status: targetStatus,
          confidenceScore: extraction.confidenceScore,
          extractedData: extraction as unknown as object,
          errorReport: isUncertain
            ? {
                reason:
                  extraction.confidenceRationale || "Low confidence score",
                threshold: 0.85,
                score: extraction.confidenceScore,
              }
            : undefined,
        },
      });

      return {
        targetStatus,
        confidenceScore: extraction.confidenceScore,
      };
    });

    // Step 5: If high confidence (>= 0.85), persist invoice directly into PostgreSQL Invoice ledger
    const persistenceResult = await step.run(
      "persist-verified-invoice",
      async () => {
        if (extraction.confidenceScore < 0.85) {
          return {
            persisted: false,
            invoiceId: null,
            reason: "Awaiting human confirmation due to low confidence score",
          };
        }

        // Check for deduplication by [userId, invoiceNumber]
        const existing = await prisma.invoice.findFirst({
          where: {
            userId,
            invoiceNumber: extraction.invoiceNumber,
          },
        });

        let invoiceId: string;

        if (existing) {
          const updated = await prisma.invoice.update({
            where: { id: existing.id },
            data: {
              counterparty: extraction.counterparty,
              type: extraction.type,
              issueDate: new Date(extraction.issueDate),
              dueDate: new Date(extraction.dueDate),
              totalAmount: extraction.totalAmount,
              remainingAmount: extraction.totalAmount - existing.paidAmount,
              currency: extraction.currency || "BDT",
              documentUploadId: uploadId,
            },
          });
          invoiceId = updated.id;
        } else {
          const created = await prisma.invoice.create({
            data: {
              userId,
              invoiceNumber: extraction.invoiceNumber,
              counterparty: extraction.counterparty,
              type: extraction.type,
              issueDate: new Date(extraction.issueDate),
              dueDate: new Date(extraction.dueDate),
              totalAmount: extraction.totalAmount,
              paidAmount: 0,
              remainingAmount: extraction.totalAmount,
              currency: extraction.currency || "BDT",
              status: "PENDING",
              source: source === "TELEGRAM" ? "TELEGRAM" : "WEB_UPLOAD",
              documentUploadId: uploadId,
            },
          });
          invoiceId = created.id;
        }

        // Mark DocumentUpload status as CONFIRMED
        await prisma.documentUpload.updateMany({
          where: { id: uploadId, userId },
          data: {
            status: "CONFIRMED",
          },
        });

        return {
          persisted: true,
          invoiceId,
          isUpdate: !!existing,
        };
      },
    );

    // Step 6: Dispatch recalculation event if invoice was committed to ledger
    if (persistenceResult.persisted && persistenceResult.invoiceId) {
      await step.run("emit-ledger-mutation", async () => {
        await inngest.send({
          name: "invoice.ledger.mutated",
          data: {
            userId,
            mutationType: persistenceResult.isUpdate ? "UPDATED" : "CREATED",
            invoiceId: persistenceResult.invoiceId as string,
            timestamp: new Date().toISOString(),
          },
        });
        return { emitted: true };
      });
    }

    // Step 7: Append immutable audit record
    await step.run("record-audit-log", async () => {
      await prisma.auditLog.create({
        data: {
          userId,
          actor: source === "TELEGRAM" ? "TELEGRAM" : "SYSTEM",
          actionType: "INGESTION",
          entityType: "Invoice",
          entityId: persistenceResult.invoiceId || uploadId,
          status: persistenceResult.persisted ? "SUCCESS" : "PENDING_APPROVAL",
          details: {
            fileName,
            fileType,
            status: persistenceResult.persisted
              ? "CONFIRMED"
              : "NEEDS_CONFIRMATION",
            confidenceScore: extraction.confidenceScore,
            invoiceNumber: extraction.invoiceNumber,
            totalAmount: extraction.totalAmount,
            telegramFileId: telegramFileId || null,
          },
        },
      });
      return { logged: true };
    });

    return {
      uploadId,
      invoiceId: persistenceResult.invoiceId,
      status: persistenceResult.persisted
        ? "CONFIRMED"
        : gateResult.targetStatus,
      confidenceScore: extraction.confidenceScore,
      extractedData: extraction,
    };
  },
);
