import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getOrCreateBusinessProfile,
  updateBusinessProfile,
} from "@/lib/services/business-profile";
import { updateBusinessProfileSchema } from "@/lib/validations/business-profile";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 },
      );
    }

    const profile = await getOrCreateBusinessProfile(
      session.user.id,
      session.user.name,
    );
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("[Profile API Error - GET]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to retrieve profile" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const result = updateBusinessProfileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Validation Error",
          issues: result.error.flatten().fieldErrors,
        },
        { status: 400 },
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

    return NextResponse.json({
      message: "Business profile updated successfully",
      profile: updated,
    });
  } catch (error) {
    console.error("[Profile API Error - PATCH]:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update profile" },
      { status: 500 },
    );
  }
}
