import type { NextRequest } from "next/server";
import { ApiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { CsvIngestionError, cancelStagedCsv } from "@/services/csv-ingestion";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return ApiResponse.unauthorized("Authentication required");
    }

    const body = await request.json();
    const uploadId = body?.uploadId;

    if (!uploadId || typeof uploadId !== "string") {
      return ApiResponse.badRequest("uploadId is required");
    }

    await cancelStagedCsv(session.user.id, uploadId);

    return ApiResponse.success(
      { uploadId },
      "Staged ingestion session discarded.",
    );
  } catch (error) {
    if (error instanceof CsvIngestionError) {
      return ApiResponse.error(error.message, error.statusCode);
    }

    console.error("[Ingest Cancel API Error]:", error);
    return ApiResponse.internal();
  }
}
