"use client";

import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface LedgerInvoice {
  id: string;
  invoiceNumber: string;
  counterparty: string;
  counterpartyEmail: string | null;
  counterpartyPhone: string | null;
  type: "RECEIVABLE" | "PAYABLE";
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: "PENDING" | "PARTIALLY_PAID" | "OVERDUE" | "PAID" | "CANCELLED";
  source: string;
  createdAt: string;
}

export interface AvailableMonth {
  value: string;
  label: string;
  count: number;
}

export interface LedgerSummary {
  totalAllTimeCount: number;
  filteredCount: number;
  totalReceivables: number;
  totalPayables: number;
  netWorkingCapital: number;
  overdueCount: number;
  paidCount: number;
  pendingCount: number;
}

interface InvoiceLedgerTableProps {
  onRefreshRequest?: () => void;
}

export function InvoiceLedgerTable({
  onRefreshRequest,
}: InvoiceLedgerTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [invoices, setInvoices] = useState<LedgerInvoice[]>([]);
  const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Read initial filter values directly from route query parameters
  const [search, setSearch] = useState(
    () => searchParams.get("search") || searchParams.get("q") || "",
  );
  const [typeFilter, setTypeFilter] = useState<string>(
    () => searchParams.get("type") || "ALL",
  );
  const [statusFilter, setStatusFilter] = useState<string>(
    () => searchParams.get("status") || "ALL",
  );
  const [monthFilter, setMonthFilter] = useState<string>(
    () => searchParams.get("month") || "ALL",
  );

  // Multi-selection & Deletion State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [invoiceToDelete, setInvoiceToDelete] = useState<LedgerInvoice | null>(
    null,
  );
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Prerender-safe timestamp
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);

  useEffect(() => {
    setCurrentTimestamp(Date.now());
  }, []);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize filter updates with the URL route state
  const updateRouteState = useCallback(
    (updates: {
      type?: string;
      status?: string;
      month?: string;
      search?: string;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      const nextType = updates.type !== undefined ? updates.type : typeFilter;
      if (nextType && nextType !== "ALL") {
        params.set("type", nextType);
      } else {
        params.delete("type");
      }

      const nextStatus =
        updates.status !== undefined ? updates.status : statusFilter;
      if (nextStatus && nextStatus !== "ALL") {
        params.set("status", nextStatus);
      } else {
        params.delete("status");
      }

      const nextMonth =
        updates.month !== undefined ? updates.month : monthFilter;
      if (nextMonth && nextMonth !== "ALL") {
        params.set("month", nextMonth);
      } else {
        params.delete("month");
      }

      const nextSearch = updates.search !== undefined ? updates.search : search;
      if (nextSearch?.trim()) {
        params.set("search", nextSearch.trim());
      } else {
        params.delete("search");
        params.delete("q");
      }

      const queryString = params.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(targetUrl, { scroll: false });
    },
    [
      searchParams,
      typeFilter,
      statusFilter,
      monthFilter,
      search,
      pathname,
      router,
    ],
  );

  // Sync state if browser back/forward buttons change searchParams
  useEffect(() => {
    const qType = searchParams.get("type") || "ALL";
    const qStatus = searchParams.get("status") || "ALL";
    const qMonth = searchParams.get("month") || "ALL";
    const qSearch = searchParams.get("search") || searchParams.get("q") || "";

    setTypeFilter((prev) => (prev !== qType ? qType : prev));
    setStatusFilter((prev) => (prev !== qStatus ? qStatus : prev));
    setMonthFilter((prev) => (prev !== qMonth ? qMonth : prev));
    setSearch((prev) => (prev !== qSearch ? qSearch : prev));
  }, [searchParams]);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleTypeChange = (newType: string) => {
    setTypeFilter(newType);
    updateRouteState({ type: newType });
  };

  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    updateRouteState({ status: newStatus });
  };

  const handleMonthChange = (newMonth: string) => {
    setMonthFilter(newMonth);
    updateRouteState({ month: newMonth });
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      updateRouteState({ search: val });
    }, 300);
  };

  const hasActiveFilters =
    typeFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    monthFilter !== "ALL" ||
    Boolean(search.trim());

  const handleResetFilters = () => {
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setMonthFilter("ALL");
    setSearch("");
    router.replace(pathname, { scroll: false });
  };

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (monthFilter !== "ALL") params.set("month", monthFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/invoices?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Failed to fetch invoices");
      }

      setInvoices(json.data.invoices);
      setAvailableMonths(json.data.availableMonths || []);
      setSummary(json.data.summary);
      setSelectedIds(new Set());
    } catch (_err) {
      toast.error("Failed to load invoice ledger");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, monthFilter, search]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleManualRefresh = () => {
    fetchInvoices();
    if (onRefreshRequest) onRefreshRequest();
    toast.success("Ledger refreshed");
  };

  // Checkbox toggle handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.size === invoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(invoices.map((inv) => inv.id)));
    }
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Delete single invoice execution
  const confirmDeleteSingle = async () => {
    if (!invoiceToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/invoices?id=${invoiceToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message || "Failed to delete invoice");
        return;
      }
      toast.success(
        json.message || `Invoice ${invoiceToDelete.invoiceNumber} deleted`,
      );
      setInvoiceToDelete(null);
      fetchInvoices();
      if (onRefreshRequest) onRefreshRequest();
    } catch (_err) {
      toast.error("Network error while deleting invoice");
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete batch execution
  const confirmDeleteBatch = async () => {
    if (selectedIds.size === 0) return;
    try {
      setIsDeleting(true);
      const res = await fetch("/api/invoices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message || "Failed to delete selected invoices");
        return;
      }
      toast.success(
        json.message || `Deleted ${selectedIds.size} invoice(s) from ledger`,
      );
      setShowBatchDeleteConfirm(false);
      setSelectedIds(new Set());
      fetchInvoices();
      if (onRefreshRequest) onRefreshRequest();
    } catch (_err) {
      toast.error("Network error while deleting batch");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* KPI Overview Tiles */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              Invoices in Period
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {summary.filteredCount}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                {summary.paidCount} Settled
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Receivables (AR)</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                ৳{summary.totalReceivables.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Payables (AP)</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                ৳{summary.totalPayables.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Overdue Invoices</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-destructive">
                {summary.overdueCount}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                Net: ৳{summary.netWorkingCapital.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Control Bar: Monthly Maintenance, Filters & Batch Actions */}
      <div className="p-4 rounded-xl border border-border bg-card flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left Side: Search + Monthly Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-50">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search invoice # or counterparty..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Monthly Period Maintenance Dropdown */}
          <Select
            value={monthFilter}
            onValueChange={(val) => handleMonthChange(val || "ALL")}
          >
            <SelectTrigger className="h-8 text-xs gap-1.5 bg-background border-border font-medium">
              <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
              <SelectValue placeholder="All Billing Months">
                {(val) => {
                  if (!val || val === "ALL") return "All Billing Months";
                  const found = availableMonths.find((m) => m.value === val);
                  return found ? `${found.label} (${found.count})` : val;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Billing Months</SelectItem>
              {availableMonths.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label} ({m.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Right Side: Type, Status & Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter Tabs (Shadcn Tabs) */}
          <Tabs value={typeFilter} onValueChange={handleTypeChange}>
            <TabsList className="h-8 p-0.5 bg-muted/60 border border-border">
              <TabsTrigger value="ALL" className="text-xs px-2.5 py-1">
                All Types
              </TabsTrigger>
              <TabsTrigger
                value="RECEIVABLE"
                className="text-xs px-2.5 py-1 data-active:text-emerald-600 dark:data-active:text-emerald-400 font-medium"
              >
                AR (Inflow)
              </TabsTrigger>
              <TabsTrigger
                value="PAYABLE"
                className="text-xs px-2.5 py-1 data-active:text-blue-600 dark:data-active:text-blue-400 font-medium"
              >
                AP (Outflow)
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val) => handleStatusChange(val || "ALL")}
          >
            <SelectTrigger className="h-8 text-xs gap-1.5 bg-background border-border text-foreground font-medium">
              <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <SelectValue placeholder="All Statuses">
                {(val) => {
                  switch (val) {
                    case "OVERDUE":
                      return "Overdue";
                    case "PENDING":
                      return "Pending";
                    case "PARTIALLY_PAID":
                      return "Partially Paid";
                    case "PAID":
                      return "Paid";
                    default:
                      return "All Statuses";
                  }
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="OVERDUE">Overdue</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Filters Action */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md border border-dashed border-border transition-colors h-8"
              title="Reset all filters to defaults"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {/* Batch Delete Action (Visible when rows selected) */}
          {selectedIds.size > 0 && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setShowBatchDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 text-xs h-8"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedIds.size})</span>
            </Button>
          )}

          {/* Refresh Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs h-8"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Persistent Ledger Data Table */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-medium">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size === invoices.length &&
                      invoices.length > 0
                    }
                    onChange={handleToggleSelectAll}
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                </th>
                <th className="py-3 px-3">Invoice #</th>
                <th className="py-3 px-3">Counterparty</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3 text-right">Total Amount</th>
                <th className="py-3 px-3 text-right">Paid Amount</th>
                <th className="py-3 px-3 text-right">Remaining Balance</th>
                <th className="py-3 px-3">Issue Date</th>
                <th className="py-3 px-3">Due Date</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center w-14">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading && invoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">
                        Loading persistent ledger from PostgreSQL...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No invoices match the selected monthly period or filter
                    criteria.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const dueDateObj = new Date(inv.dueDate);
                  const isOverdue =
                    inv.status === "OVERDUE" ||
                    (currentTimestamp > 0 &&
                      inv.remainingAmount > 0 &&
                      dueDateObj.getTime() < currentTimestamp);

                  const issueDateFormatted = new Date(inv.issueDate)
                    .toISOString()
                    .split("T")[0];
                  const dueDateFormatted = dueDateObj
                    .toISOString()
                    .split("T")[0];
                  const isSelected = selectedIds.has(inv.id);

                  return (
                    <tr
                      key={inv.id}
                      className={`transition-colors ${
                        isSelected ? "bg-primary/4" : "hover:bg-muted/30"
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(inv.id)}
                          className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                        />
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-foreground">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-foreground">
                          {inv.counterparty}
                        </div>
                        {inv.counterpartyEmail && (
                          <div className="text-[11px] text-muted-foreground">
                            {inv.counterpartyEmail}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {inv.type === "RECEIVABLE" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <ArrowDownLeft className="w-3 h-3" /> AR (Inflow)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <ArrowUpRight className="w-3 h-3" /> AP (Outflow)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-foreground">
                        ৳{inv.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                        ৳{inv.paidAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        ৳{inv.remainingAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground font-mono">
                        {issueDateFormatted}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-mono text-xs ${
                            isOverdue
                              ? "text-destructive font-semibold"
                              : "text-muted-foreground"
                          }`}
                        >
                          {dueDateFormatted}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {inv.status === "PAID" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive border border-destructive/20">
                            <AlertTriangle className="w-3 h-3" /> Overdue
                          </span>
                        ) : inv.status === "PARTIALLY_PAID" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" /> Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setInvoiceToDelete(inv)}
                          title="Delete invoice"
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

      {/* Single Invoice Delete Confirmation Modal */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                disabled={isDeleting}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-semibold text-foreground">
                Delete Invoice {invoiceToDelete.invoiceNumber}?
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Are you sure you want to delete this invoice for{" "}
                <span className="font-semibold text-foreground">
                  {invoiceToDelete.counterparty}
                </span>{" "}
                (৳{invoiceToDelete.totalAmount.toLocaleString()})? This will
                permanently remove it and any linked transactions from your
                ledger.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInvoiceToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={confirmDeleteSingle}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...
                  </>
                ) : (
                  "Delete Invoice"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setShowBatchDeleteConfirm(false)}
                disabled={isDeleting}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-semibold text-foreground">
                Delete {selectedIds.size} Selected Invoices?
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Are you sure you want to permanently delete these{" "}
                <span className="font-semibold text-foreground">
                  {selectedIds.size}
                </span>{" "}
                invoices and their corresponding payment records from
                PostgreSQL? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowBatchDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={confirmDeleteBatch}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting
                    Batch...
                  </>
                ) : (
                  `Delete ${selectedIds.size} Invoices`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
