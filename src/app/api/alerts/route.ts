import type { NextRequest } from "next/server";
import { ApiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import {
  evaluateAndSyncFinancialAlerts,
  getFinancialAlerts,
} from "@/services/alerts";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return ApiResponse.unauthorized(
        "Authentication required to view financial risk alerts.",
      );
    }

    const { searchParams } = new URL(request.url);
    const statusParam = (searchParams.get("status") || "ALL") as
      | "ACTIVE"
      | "ACKNOWLEDGED"
      | "RESOLVED"
      | "DISMISSED"
      | "ALL";
    const severityParam = (searchParams.get("severity") || "ALL") as
      | "CRITICAL"
      | "HIGH"
      | "MEDIUM"
      | "LOW"
      | "ALL";
    const syncFresh = searchParams.get("sync") === "true";

    // Optionally evaluate fresh alerts before returning
    if (syncFresh) {
      await evaluateAndSyncFinancialAlerts(session.user.id);
    }

    const data = await getFinancialAlerts(session.user.id, {
      status: statusParam,
      severity: severityParam,
    });

    return ApiResponse.success(
      data,
      "Financial risk alerts retrieved successfully.",
    );
  } catch (error) {
    console.error("[Alerts API Error]:", error);
    return ApiResponse.internal("Failed to retrieve financial risk alerts.");
  }
}
