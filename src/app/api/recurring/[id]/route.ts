import type { NextRequest } from "next/server";
import { ApiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import {
  deleteRecurringSchedule,
  updateRecurringSchedule,
} from "@/services/recurring";
import { updateRecurringScheduleSchema } from "@/validations/recurring";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return ApiResponse.unauthorized("Authentication required.");
    }

    const { id: scheduleId } = await context.params;
    const body = await request.json();

    const validated = updateRecurringScheduleSchema.safeParse(body);
    if (!validated.success) {
      return ApiResponse.unprocessable(
        "Invalid update data.",
        validated.error.issues,
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined;

    const updated = await updateRecurringSchedule(
      session.user.id,
      scheduleId,
      validated.data,
      ipAddress,
    );

    return ApiResponse.success(
      updated,
      `Recurring commitment "${updated.title}" updated successfully.`,
    );
  } catch (error) {
    console.error("[Update Recurring API Error]:", error);
    return ApiResponse.internal("Failed to update recurring schedule.");
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return ApiResponse.unauthorized("Authentication required.");
    }

    const { id: scheduleId } = await context.params;

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined;

    const result = await deleteRecurringSchedule(
      session.user.id,
      scheduleId,
      ipAddress,
    );

    return ApiResponse.success(
      result,
      "Recurring schedule commitment deleted successfully.",
    );
  } catch (error) {
    console.error("[Delete Recurring API Error]:", error);
    return ApiResponse.internal("Failed to delete recurring schedule.");
  }
}
