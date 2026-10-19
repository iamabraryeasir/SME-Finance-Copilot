import type { NextRequest } from "next/server";
import { ApiResponse, isNextBailout } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import {
  getGlobalAiTelemetry,
  getUserAiTelemetryList,
} from "@/services/telemetry";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id || session.user.role !== "admin") {
      return ApiResponse.forbidden(
        "Access denied: System administrator role required.",
      );
    }

    const [globalTelemetry, userTelemetry] = await Promise.all([
      getGlobalAiTelemetry(),
      getUserAiTelemetryList(),
    ]);

    return ApiResponse.success(
      {
        global: globalTelemetry,
        users: userTelemetry,
      },
      "AI telemetry data retrieved successfully.",
    );
  } catch (error) {
    if (isNextBailout(error)) throw error;
    console.error("[Admin Telemetry API Error]:", error);
    return ApiResponse.internal("Failed to retrieve AI telemetry data.");
  }
}
