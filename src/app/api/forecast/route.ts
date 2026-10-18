import type { NextRequest } from "next/server";
import { ApiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { getCachedForecast } from "@/services/forecast";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return ApiResponse.unauthorized(
        "Authentication required to view cash-flow forecasts.",
      );
    }

    const { searchParams } = new URL(request.url);
    const forceFresh = searchParams.get("fresh") === "true";

    const forecast = await getCachedForecast(session.user.id, forceFresh);

    return ApiResponse.success(
      forecast,
      "30-day cash-flow forecast calculated successfully.",
    );
  } catch (error) {
    console.error("[Forecast API Error]:", error);
    return ApiResponse.internal("Failed to calculate cash-flow forecast.");
  }
}
