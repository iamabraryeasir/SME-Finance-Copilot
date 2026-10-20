import type { NextRequest } from "next/server";
import { ApiResponse, isNextBailout } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { seedSampleInvoicesForUser } from "@/services/sample-data";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return ApiResponse.unauthorized(
        "Authentication required to load sample invoices.",
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined;

    const result = await seedSampleInvoicesForUser(session.user.id, ipAddress);

    return ApiResponse.success(result, result.message);
  } catch (error) {
    if (isNextBailout(error)) throw error;
    console.error("[Sample Invoices API Error]:", error);
    return ApiResponse.internal(
      error instanceof Error
        ? error.message
        : "Failed to load sample invoices into ledger.",
    );
  }
}

