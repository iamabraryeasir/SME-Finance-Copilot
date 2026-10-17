import type { NextRequest } from "next/server";
import { ApiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import {
  getOrCreateBusinessProfile,
  updateBusinessProfile,
} from "@/services/business-profile";
import { updateBusinessProfileSchema } from "@/validations/business-profile";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return ApiResponse.unauthorized("Authentication required");
    }

    const profile = await getOrCreateBusinessProfile(
      session.user.id,
      session.user.name,
    );

    return ApiResponse.success(
      { profile },
      "Business profile retrieved successfully",
    );
  } catch (error) {
    console.error("[Profile API Error - GET]:", error);
    return ApiResponse.internal("Failed to retrieve profile");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return ApiResponse.unauthorized("Authentication required");
    }

    const body = await request.json();
    const result = updateBusinessProfileSchema.safeParse(body);

    if (!result.success) {
      return ApiResponse.unprocessable(
        "Validation failed: Please check your business profile parameters",
        result.error.flatten().fieldErrors,
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined;

    const updated = await updateBusinessProfile(
      session.user.id,
      result.data,
      "USER",
      ipAddress,
    );

    return ApiResponse.success(
      { profile: updated },
      "Business profile updated successfully",
    );
  } catch (error) {
    console.error("[Profile API Error - PATCH]:", error);
    return ApiResponse.internal("Failed to update profile");
  }
}
