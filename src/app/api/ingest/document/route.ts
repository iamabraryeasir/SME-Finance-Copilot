import type { NextRequest } from "next/server";
import { ApiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/utils/inngest";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return ApiResponse.unauthorized(
        "You must be signed in to upload invoices.",
      );
    }

    const userId = session.user.id;
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return ApiResponse.badRequest(
        "No files provided. Please upload at least one PDF or Image invoice.",
      );
    }

    const uploadedDocuments: Array<{
      id: string;
      fileName: string;
      fileType: "PDF" | "IMAGE";
      status: string;
    }> = [];

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return ApiResponse.badRequest(
          `Unsupported file format: ${file.name} (${file.type}). Only PDF, PNG, JPG, and WEBP are supported.`,
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return ApiResponse.badRequest(
          `File size exceeds 15MB limit: ${file.name}`,
        );
      }

      const isPdf = file.type === "application/pdf";
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");
      const dataUri = `data:${file.type};base64,${base64}`;

      // Create persistent DocumentUpload record in PostgreSQL
      const doc = await prisma.documentUpload.create({
        data: {
          userId,
          fileName: file.name,
          fileType: isPdf ? "PDF" : "IMAGE",
          fileUrl: dataUri,
          status: "PENDING",
          source: "WEB",
        },
      });

      // Record immediate immutable audit log for zero-trust compliance
      await prisma.auditLog.create({
        data: {
          userId,
          actor: "USER",
          actionType: "INGESTION",
          entityType: "DocumentUpload",
          entityId: doc.id,
          status: "SUCCESS",
          ipAddress,
          details: {
            fileName: file.name,
            fileType: isPdf ? "PDF" : "IMAGE",
            fileSize: file.size,
            stage: "QUEUED_FOR_OCR",
            mimeType: file.type,
          },
        },
      });

      // Dispatch async background processing event to Inngest
      try {
        await inngest.send({
          name: "invoice.document.uploaded",
          data: {
            uploadId: doc.id,
            userId,
            fileName: file.name,
            fileType: isPdf ? "PDF" : "IMAGE",
            source: "WEB",
            fileBase64: base64,
          },
        });
      } catch (inngestErr) {
        console.warn("[Inngest Document Upload Warning]:", inngestErr);
        await prisma.auditLog.create({
          data: {
            userId,
            actor: "SYSTEM",
            actionType: "INGESTION",
            entityType: "DocumentUpload",
            entityId: doc.id,
            status: "FAILED",
            ipAddress,
            details: {
              fileName: file.name,
              stage: "INNGEST_DISPATCH_FAILED",
              error:
                inngestErr instanceof Error
                  ? inngestErr.message
                  : String(inngestErr),
            },
          },
        });
      }

      uploadedDocuments.push({
        id: doc.id,
        fileName: doc.fileName,
        fileType: doc.fileType as "PDF" | "IMAGE",
        status: doc.status,
      });
    }

    return ApiResponse.accepted(
      { documents: uploadedDocuments },
      `Enqueued ${uploadedDocuments.length} document(s) for asynchronous background extraction.`,
    );
  } catch (error) {
    console.error("[Document Ingestion API Error]:", error);
    return ApiResponse.internal("Failed to process document upload.");
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return ApiResponse.unauthorized("Authentication required.");
    }

    const uploads = await prisma.documentUpload.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return ApiResponse.success({ uploads });
  } catch (error) {
    console.error("[Document List API Error]:", error);
    return ApiResponse.internal("Failed to load document upload history.");
  }
}
