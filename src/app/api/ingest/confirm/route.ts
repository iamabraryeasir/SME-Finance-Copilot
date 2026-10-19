import type { NextRequest } from "next/server";
import { ApiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { CsvIngestionError, commitApprovedCsv } from "@/services/csv-ingestion";
import { inngest } from "@/utils/inngest";
import { confirmIngestSchema } from "@/validations/csv-ingest";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return ApiResponse.unauthorized(
        "You must be signed in to approve ledger ingestion.",
      );
    }

    const userId = session.user.id;
    const body = await request.json();

    const parseResult = confirmIngestSchema.safeParse(body);
    if (!parseResult.success) {
      return ApiResponse.unprocessable(
        parseResult.error.issues[0]?.message ||
          "Invalid confirmation payload: Please verify approved rows format",
        parseResult.error.flatten().fieldErrors,
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined;

    const summary = await commitApprovedCsv(
      userId,
      parseResult.data,
      ipAddress,
    );

    // Dispatch background recalculation event to Inngest
    try {
      await inngest.send({
        name: "invoice.ledger.mutated",
        data: {
          userId,
          action: "INSERT",
          affectedCount: summary.summary.importedCount,
          source: "CSV",
        },
      });
    } catch (inngestErr) {
      console.warn("[Inngest Dispatch Warning]:", inngestErr);
    }

    return ApiResponse.success(
      summary,
      `Successfully approved and committed ${summary.summary.importedCount} invoice(s) to ledger.`,
    );
  } catch (error) {
    if (error instanceof CsvIngestionError) {
      return ApiResponse.error(error.message, error.statusCode, error.errors);
    }

    console.error("[Ingest Confirm API Error]:", error);

    // Provide friendly actionable error messages for Prisma database errors
    const prismaError = error as { code?: string; message?: string };
    if (prismaError?.code === "P2028") {
      return ApiResponse.error(
        "Database transaction timed out. Please try approving again.",
        504,
      );
    }
    if (prismaError?.code === "P2002") {
      return ApiResponse.error(
        "One or more invoices in this batch already exist in your ledger.",
        409,
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Failed to commit approved invoices to the ledger.";

    return ApiResponse.internal(message);
  }
}
