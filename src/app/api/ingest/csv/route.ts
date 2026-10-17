import type { NextRequest } from "next/server";
import { ApiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CsvIngestionError,
  previewAndStageCsv,
} from "@/services/csv-ingestion";

export async function POST(request: NextRequest) {
  try {
    // 1. Enforce edge session authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return ApiResponse.unauthorized(
        "You must be signed in to ingest ledger documents.",
      );
    }

    const userId = session.user.id;

    // 2. Parse multipart form data
    const formData = await request.formData();
    const files = formData.getAll("file");

    // Enforce single-file rule for CSV uploads
    if (files.length === 0) {
      return ApiResponse.badRequest(
        "No file was provided in the upload request.",
      );
    }

    if (files.length > 1) {
      return ApiResponse.badRequest(
        "CSV upload only supports 1 file at a time. Please upload a single master ledger file.",
      );
    }

    const file = files[0];
    if (!(file instanceof File)) {
      return ApiResponse.badRequest(
        "The uploaded payload is not a valid file object.",
      );
    }

    // Validate file extension
    const fileName = file.name || "ledger.csv";
    if (!fileName.toLowerCase().endsWith(".csv")) {
      return ApiResponse.badRequest(
        "Only .csv files are supported by the CSV ingestion route.",
      );
    }

    // Limit maximum file size (10 MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return ApiResponse.badRequest(
        "The CSV file exceeds the 10 MB maximum upload size limit.",
      );
    }

    // Retrieve user's configured currency for clean fallback
    const profile = await prisma.businessProfile.findUnique({
      where: { userId },
      select: { currency: true },
    });
    const defaultCurrency = profile?.currency || "BDT";

    // Read file content in-memory (zero external blob storage)
    const csvContent = await file.text();

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined;

    // Parse, validate, deduplicate, and stage in NEEDS_CONFIRMATION state for user approval
    const result = await previewAndStageCsv(
      userId,
      fileName,
      csvContent,
      defaultCurrency,
      ipAddress,
    );

    return ApiResponse.success(
      result,
      `Parsed ${result.summary.validCount} valid invoice(s) ready for review and confirmation.`,
    );
  } catch (error) {
    if (error instanceof CsvIngestionError) {
      return ApiResponse.error(error.message, error.statusCode, error.errors);
    }

    console.error("[CSV Ingest API Error]:", error);
    return ApiResponse.internal(
      "An unexpected error occurred while processing the CSV file. Please try again.",
    );
  }
}
