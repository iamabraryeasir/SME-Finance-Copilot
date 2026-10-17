import type { NextRequest } from "next/server";
import { ApiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import {
  deleteInvoice,
  deleteInvoicesBatch,
  getUserInvoices,
  type InvoiceFilters,
} from "@/services/invoice";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return ApiResponse.unauthorized(
        "Authentication required to view invoices",
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as InvoiceFilters["type"] | null;
    const status = searchParams.get("status") as
      | InvoiceFilters["status"]
      | null;
    const search = searchParams.get("search") || undefined;
    const month = searchParams.get("month") || undefined;

    const filters: InvoiceFilters = {};
    if (type && ["RECEIVABLE", "PAYABLE"].includes(type)) {
      filters.type = type;
    }
    if (
      status &&
      ["PENDING", "PARTIALLY_PAID", "OVERDUE", "PAID", "CANCELLED"].includes(
        status,
      )
    ) {
      filters.status = status;
    }
    if (search) {
      filters.search = search;
    }
    if (month) {
      filters.month = month;
    }

    const result = await getUserInvoices(session.user.id, filters);

    return ApiResponse.success(result, "Invoices retrieved successfully");
  } catch (error) {
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_")) {
      throw error;
    }
    console.error("[Invoices API Error - GET]:", error);
    return ApiResponse.internal("Failed to retrieve invoices from ledger");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return ApiResponse.unauthorized(
        "Authentication required to delete invoices",
      );
    }

    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get("id");

    let invoiceId = queryId;
    let invoiceIds: string[] = [];

    // Check JSON body if query param not present
    if (!invoiceId) {
      try {
        const body = await request.json();
        if (body.id) invoiceId = body.id;
        if (Array.isArray(body.ids)) invoiceIds = body.ids;
      } catch (_e) {
        // No JSON body
      }
    }

    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined;

    if (invoiceIds.length > 0) {
      const res = await deleteInvoicesBatch(
        session.user.id,
        invoiceIds,
        ipAddress,
      );
      return ApiResponse.success(
        res,
        `Successfully deleted ${res.deletedCount} invoice(s) from ledger`,
      );
    }

    if (!invoiceId) {
      return ApiResponse.badRequest(
        "Invoice ID or array of IDs is required for deletion",
      );
    }

    const deleted = await deleteInvoice(session.user.id, invoiceId, ipAddress);

    return ApiResponse.success(
      { id: deleted.id, invoiceNumber: deleted.invoiceNumber },
      `Invoice ${deleted.invoiceNumber} deleted successfully from ledger`,
    );
  } catch (error) {
    console.error("[Invoices API Error - DELETE]:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to delete invoice";
    return ApiResponse.error(msg, 400);
  }
}
