import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { updateAlertStatus } from "@/services/alerts";

const patchAlertStatusSchema = z.object({
  status: z.enum(["ACKNOWLEDGED", "DISMISSED", "RESOLVED"], {
    message: "Status must be ACKNOWLEDGED, DISMISSED, or RESOLVED",
  }),
});

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

    const { id: alertId } = await context.params;
    const body = await request.json();

    const validated = patchAlertStatusSchema.safeParse(body);
    if (!validated.success) {
      return ApiResponse.badRequest(
        validated.error.issues[0]?.message || "Invalid alert status",
      );
    }

    const updated = await updateAlertStatus(
      session.user.id,
      alertId,
      validated.data.status,
    );

    return ApiResponse.success(
      updated,
      `Alert status updated to ${validated.data.status}.`,
    );
  } catch (error) {
    console.error("[Update Alert API Error]:", error);
    return ApiResponse.internal("Failed to update alert status.");
  }
}
