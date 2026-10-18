import type { NextRequest } from "next/server";
import { ApiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import {
  createRecurringSchedule,
  getRecurringSchedules,
} from "@/services/recurring";
import { createRecurringScheduleSchema } from "@/validations/recurring";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return ApiResponse.unauthorized("Authentication required.");
    }

    const schedules = await getRecurringSchedules(session.user.id);

    return ApiResponse.success(
      schedules,
      "Recurring schedule commitments retrieved successfully.",
    );
  } catch (error) {
    console.error("[Get Recurring API Error]:", error);
    return ApiResponse.internal("Failed to retrieve recurring schedules.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return ApiResponse.unauthorized("Authentication required.");
    }

    const body = await request.json();
    const validated = createRecurringScheduleSchema.safeParse(body);

    if (!validated.success) {
      return ApiResponse.unprocessable(
        "Invalid recurring schedule payload.",
        validated.error.issues,
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined;

    const schedule = await createRecurringSchedule(
      session.user.id,
      validated.data,
      ipAddress,
    );

    return ApiResponse.created(
      schedule,
      `Recurring commitment "${schedule.title}" created successfully.`,
    );
  } catch (error) {
    console.error("[Create Recurring API Error]:", error);
    return ApiResponse.internal("Failed to create recurring schedule.");
  }
}
