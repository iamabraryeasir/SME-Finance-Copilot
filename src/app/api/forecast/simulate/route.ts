import type { NextRequest } from "next/server";
import { ApiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { simulateAffordabilityScenario } from "@/services/simulation";
import { simulateScenarioSchema } from "@/validations/simulation";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return ApiResponse.unauthorized(
        "Authentication required to run scenario simulations.",
      );
    }

    const body = await request.json();
    const validated = simulateScenarioSchema.safeParse(body);

    if (!validated.success) {
      return ApiResponse.unprocessable(
        "Invalid simulation parameters.",
        validated.error.issues,
      );
    }

    const result = await simulateAffordabilityScenario(
      session.user.id,
      validated.data,
    );

    return ApiResponse.success(
      result,
      "What-if affordability simulation completed successfully.",
    );
  } catch (error) {
    console.error("[Forecast Simulate API Error]:", error);
    return ApiResponse.internal("Failed to simulate affordability scenario.");
  }
}
