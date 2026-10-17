"use client";

import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import type {
  CsvIngestionSummary,
  CsvPreviewResult,
} from "@/validations/csv-ingest";

interface IngestionApprovalModalProps {
  preview: CsvPreviewResult;
  onConfirmSuccess: (summary: CsvIngestionSummary) => void;
  onCancel: () => void;
}

export function IngestionApprovalModal({
  preview,
  onConfirmSuccess,
  onCancel,
}: IngestionApprovalModalProps) {
  const [rows, setRows] = useState(preview.rows);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(preview.rows.map((r) => r.id)),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  // Toggle selection of all rows
  const handleToggleSelectAll = () => {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  };

  // Toggle selection of a single row
  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Remove a row from the staging table
  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    const next = new Set(selectedIds);
    next.delete(id);
    setSelectedIds(next);
    toast.success("Row removed from batch");
  };

  // Calculate live totals for currently selected rows
  const selectedRows = rows.filter((r) => selectedIds.has(r.id));
  const totalInflow = selectedRows
    .filter((r) => r.type === "RECEIVABLE")
    .reduce((sum, r) => sum + r.totalAmount, 0);
  const totalOutflow = selectedRows
    .filter((r) => r.type === "PAYABLE")
    .reduce((sum, r) => sum + r.totalAmount, 0);

  // Submit approved rows to /api/ingest/confirm
  const handleApproveAndCommit = async () => {
    if (selectedRows.length === 0) {
      toast.error("Please select at least one invoice to approve");
      return;
    }

    try {
      setIsSubmitting(true);

      const approvedRows = selectedRows.map((item) => {
        const {
          id: _id,
          rowNumber: _rowNumber,
          issueDateFormatted: _idf,
          dueDateFormatted: _ddf,
          ...rowPayload
        } = item;
        return rowPayload;
      });

      const res = await fetch("/api/ingest/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId: preview.uploadId,
          approvedRows,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.message || "Failed to commit approved invoices");
        return;
      }

      toast.success(
        json.message ||
          `Committed ${json.data.summary.importedCount} invoice(s) to ledger`,
      );
      onConfirmSuccess(json.data);
    } catch (_err) {
      toast.error("Network error while committing approved invoices");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Discard the staging session
  const handleDiscard = async () => {
    try {
      setIsDiscarding(true);
      await fetch("/api/ingest/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId: preview.uploadId }),
      });
      toast.success("Ingestion session discarded");
      onCancel();
    } catch (_err) {
      onCancel();
    } finally {
      setIsDiscarding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  Review & Confirm Invoices
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Awaiting Human Approval
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                File:{" "}
                <span className="font-medium text-foreground">
                  {preview.fileName}
                </span>{" "}
                • {rows.length} valid rows staged for approval
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDiscard}
            disabled={isSubmitting || isDiscarding}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial KPI Summary Header */}
        <div className="px-6 py-3 border-b border-border bg-muted/10 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-2.5 rounded-lg bg-card border border-border">
            <p className="text-[11px] text-muted-foreground">Selected Rows</p>
            <p className="text-base font-bold text-foreground">
              {selectedRows.length}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                of {rows.length}
              </span>
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Receivables (Inflow)</span>
            </div>
            <p className="text-base font-bold text-foreground">
              ৳{totalInflow.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Payables (Outflow)</span>
            </div>
            <p className="text-base font-bold text-foreground">
              ৳{totalOutflow.toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Deduplicated Skipped</span>
            </div>
            <p className="text-base font-bold text-amber-600 dark:text-amber-400">
              {preview.duplicates.length}
            </p>
          </div>
        </div>

        {/* Duplicates Notification Banner */}
        {preview.duplicates.length > 0 && (
          <div className="px-6 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                {preview.duplicates.length} duplicate invoice(s) already exist
                in your database ledger and have been excluded automatically.
              </span>
            </div>
          </div>
        )}

        {/* Interactive Staged Rows Table */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-medium">
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size === rows.length && rows.length > 0
                      }
                      onChange={handleToggleSelectAll}
                      className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                    />
                  </th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Counterparty</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                  <th className="py-2.5 px-3 text-right">Paid Amount</th>
                  <th className="py-2.5 px-3 text-right">Remaining</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-8 text-center text-muted-foreground"
                    >
                      All invoices have been removed from this staging batch.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const isSelected = selectedIds.has(row.id);
                    const remaining = Math.max(
                      0,
                      row.totalAmount - (row.paidAmount || 0),
                    );

                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors ${
                          isSelected ? "bg-muted/15" : "opacity-50 bg-muted/5"
                        } hover:bg-muted/30`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleRow(row.id)}
                            className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          {row.type === "RECEIVABLE" ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <ArrowDownLeft className="w-3 h-3" /> AR
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              <ArrowUpRight className="w-3 h-3" /> AP
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-foreground">
                          {row.invoiceNumber}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-foreground">
                          {row.counterparty}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-foreground">
                          ৳{row.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                          ৳{(row.paidAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-foreground">
                          ৳{remaining.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground font-mono">
                          {row.dueDateFormatted}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            title="Remove from batch"
                            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/20">
          <div className="text-xs text-muted-foreground">
            Strict Zero-Trust Review • Human confirmation mandatory before
            database persistence
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleDiscard}
              disabled={isSubmitting || isDiscarding}
            >
              {isDiscarding ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />{" "}
                  Discarding...
                </>
              ) : (
                "Discard Batch"
              )}
            </Button>
            <Button
              type="button"
              onClick={handleApproveAndCommit}
              disabled={
                selectedRows.length === 0 || isSubmitting || isDiscarding
              }
              className="inline-flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Committing to
                  Ledger...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Approve & Commit (
                  {selectedRows.length} Invoices)
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
