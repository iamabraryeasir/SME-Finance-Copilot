import type { NextRequest } from "next/server";
import { ApiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/utils/inngest";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return ApiResponse.unauthorized("Authentication required.");
    }

    const { id } = await context.params;

    const document = await prisma.documentUpload.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!document) {
      return ApiResponse.notFound("Document upload record not found.");
    }

    return ApiResponse.success({ document });
  } catch (error) {
    console.error("[Document Status API Error]:", error);
    return ApiResponse.internal("Failed to retrieve document status.");
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return ApiResponse.unauthorized("Authentication required.");
    }

    const { id } = await context.params;
    const body = await request.json();

    const document = await prisma.documentUpload.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!document) {
      return ApiResponse.notFound("Document upload record not found.");
    }

    // Extraction data to commit (can be user-edited values from body, or stored extractedData)
    const dataToCommit = body.invoice || document.extractedData;
    if (!dataToCommit || typeof dataToCommit !== "object") {
      return ApiResponse.badRequest(
        "No extracted invoice data available to commit.",
      );
    }

    const inv = dataToCommit as {
      invoiceNumber?: string;
      counterparty?: string;
      type?: "RECEIVABLE" | "PAYABLE";
      issueDate?: string;
      dueDate?: string;
      totalAmount?: number;
      currency?: string;
    };

    const invoiceNumber = inv.invoiceNumber;
    const counterparty = inv.counterparty;
    const totalAmount = Number(inv.totalAmount);

    if (
      !invoiceNumber ||
      !counterparty ||
      Number.isNaN(totalAmount) ||
      totalAmount <= 0
    ) {
      return ApiResponse.badRequest(
        "Incomplete invoice data: invoiceNumber, counterparty, and a positive totalAmount are required.",
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;

    const issueDate = inv.issueDate ? new Date(inv.issueDate) : new Date();
    const dueDate = inv.dueDate
      ? new Date(inv.dueDate)
      : new Date(Date.now() + 14 * 86400000);

    // Save verified invoice in PostgreSQL transaction
    const createdInvoice = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          userId: session.user.id,
          documentUploadId: document.id,
          invoiceNumber,
          counterparty,
          type: inv.type || "RECEIVABLE",
          issueDate,
          dueDate,
          totalAmount,
          paidAmount: 0,
          remainingAmount: totalAmount,
          currency: inv.currency || "BDT",
          status: "PENDING",
          source: "WEB_UPLOAD",
        },
      });

      await tx.documentUpload.update({
        where: { id: document.id },
        data: { status: "CONFIRMED" },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          actor: "USER",
          actionType: "INGESTION",
          entityType: "Invoice",
          entityId: invoice.id,
          status: "SUCCESS",
          ipAddress,
          details: {
            action: "OCR_INVOICE_CONFIRMED",
            documentUploadId: document.id,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: invoice.totalAmount,
          },
        },
      });

      return invoice;
    });

    // Trigger Inngest background metric recalculation
    try {
      await inngest.send({
        name: "invoice.ledger.mutated",
        data: {
          userId: session.user.id,
          action: "INSERT",
          affectedCount: 1,
          source: "OCR",
        },
      });
    } catch (inngestErr) {
      console.warn("[Inngest Dispatch Warning]:", inngestErr);
    }

    return ApiResponse.success(
      { invoice: createdInvoice },
      `Invoice ${createdInvoice.invoiceNumber} successfully confirmed and saved to ledger.`,
    );
  } catch (error) {
    console.error("[Document Confirm API Error]:", error);
    return ApiResponse.internal("Failed to confirm extracted invoice.");
  }
}
