"use client";

import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Clock,
  FileText,
  Info,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface FinancialAlertItem {
  id: string;
  userId: string;
  title: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: string;
  impactAmount: number | null;
  relevantDate: string | null;
  suggestedAction: string | null;
  supportingData: Record<string, unknown> | null;
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";
  dedupKey: string;
  createdAt: string;
  updatedAt: string;
}

interface SeverityCounts {
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
  TOTAL: number;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<FinancialAlertItem[]>([]);
  const [counts, setCounts] = useState<SeverityCounts>({
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    TOTAL: 0,
  });
  const [selectedSeverity, setSelectedSeverity] = useState<
    "ALL" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  >("ALL");
  const [selectedStatus, setSelectedStatus] = useState<
    "ACTIVE" | "ALL" | "RESOLVED" | "DISMISSED"
  >("ACTIVE");
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchAlerts = useCallback(
    async (syncFresh = false) => {
      try {
        if (syncFresh) setIsSyncing(true);
        else setIsLoading(true);

        const params = new URLSearchParams();
        if (selectedStatus !== "ALL") params.set("status", selectedStatus);
        if (selectedSeverity !== "ALL")
          params.set("severity", selectedSeverity);
        if (syncFresh) params.set("sync", "true");

        const res = await fetch(`/api/alerts?${params.toString()}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load alerts");
        }

        setAlerts(json.data.alerts);
        setCounts(json.data.counts);

        if (syncFresh) {
          toast.success("Risk alert rules re-evaluated against latest ledger!");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error loading alerts";
        toast.error(msg);
      } finally {
        setIsLoading(false);
        setIsSyncing(false);
      }
    },
    [selectedStatus, selectedSeverity],
  );

  useEffect(() => {
    fetchAlerts(false);
  }, [fetchAlerts]);

  const handleUpdateStatus = async (
    alertId: string,
    newStatus: "ACKNOWLEDGED" | "DISMISSED" | "RESOLVED",
  ) => {
    try {
      setUpdatingId(alertId);
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update alert");
      }

      toast.success(`Alert marked as ${newStatus.toLowerCase()}`);
      // Refresh list
      await fetchAlerts(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update alert";
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const getSeverityBadge = (sev: FinancialAlertItem["severity"]) => {
    switch (sev) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive/15 text-destructive border border-destructive/30">
            <AlertOctagon className="h-3.5 w-3.5" />
            CRITICAL
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            <AlertTriangle className="h-3.5 w-3.5" />
            HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
            <Clock className="h-3.5 w-3.5" />
            MEDIUM
          </span>
        );
      case "LOW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
            <Info className="h-3.5 w-3.5" />
            LOW
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Financial Risk Alerts
            </h1>
            <Badge variant="secondary" className="font-mono text-xs">
              {counts.TOTAL} Active Issues
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Deterministic rule-based risk evaluation engine monitoring cash
            deficits, reserve breaches, overdue receivables, and imminent bills.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAlerts(true)}
            disabled={isSyncing || isLoading}
            className="gap-2 h-9 text-xs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Evaluating Rules..." : "Re-evaluate Rules"}
          </Button>
        </div>
      </div>

      {/* Severity Filter Banner Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* ALL */}
        <button
          type="button"
          onClick={() => setSelectedSeverity("ALL")}
          className={`p-3 rounded-lg border text-left transition-all ${
            selectedSeverity === "ALL"
              ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary"
              : "bg-card border-border hover:border-border/80"
          }`}
        >
          <div className="text-xs text-muted-foreground font-medium">
            All Alerts
          </div>
          <div className="text-xl font-bold font-mono text-foreground mt-1">
            {counts.TOTAL}
          </div>
        </button>

        {/* CRITICAL */}
        <button
          type="button"
          onClick={() => setSelectedSeverity("CRITICAL")}
          className={`p-3 rounded-lg border text-left transition-all ${
            selectedSeverity === "CRITICAL"
              ? "bg-destructive/15 border-destructive shadow-xs ring-1 ring-destructive"
              : "bg-card border-border hover:border-destructive/40"
          }`}
        >
          <div className="text-xs text-destructive font-semibold flex items-center gap-1">
            <AlertOctagon className="h-3.5 w-3.5" />
            Critical
          </div>
          <div className="text-xl font-bold font-mono text-destructive mt-1">
            {counts.CRITICAL}
          </div>
        </button>

        {/* HIGH */}
        <button
          type="button"
          onClick={() => setSelectedSeverity("HIGH")}
          className={`p-3 rounded-lg border text-left transition-all ${
            selectedSeverity === "HIGH"
              ? "bg-amber-500/15 border-amber-500 shadow-xs ring-1 ring-amber-500"
              : "bg-card border-border hover:border-amber-500/40"
          }`}
        >
          <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            High
          </div>
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {counts.HIGH}
          </div>
        </button>

        {/* MEDIUM */}
        <button
          type="button"
          onClick={() => setSelectedSeverity("MEDIUM")}
          className={`p-3 rounded-lg border text-left transition-all ${
            selectedSeverity === "MEDIUM"
              ? "bg-blue-500/15 border-blue-500 shadow-xs ring-1 ring-blue-500"
              : "bg-card border-border hover:border-blue-500/40"
          }`}
        >
          <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Medium
          </div>
          <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
            {counts.MEDIUM}
          </div>
        </button>

        {/* LOW */}
        <button
          type="button"
          onClick={() => setSelectedSeverity("LOW")}
          className={`p-3 rounded-lg border text-left transition-all ${
            selectedSeverity === "LOW"
              ? "bg-muted border-foreground/30 shadow-xs ring-1 ring-foreground/20"
              : "bg-card border-border hover:border-border/80"
          }`}
        >
          <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
            <Info className="h-3.5 w-3.5" />
            Low
          </div>
          <div className="text-xl font-bold font-mono text-muted-foreground mt-1">
            {counts.LOW}
          </div>
        </button>
      </div>

      {/* Status Filter Tab Pills */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium mr-1">
            Status:
          </span>
          <button
            type="button"
            onClick={() => setSelectedStatus("ACTIVE")}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              selectedStatus === "ACTIVE"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Active & Acknowledged
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus("RESOLVED")}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              selectedStatus === "RESOLVED"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Resolved
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus("DISMISSED")}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              selectedStatus === "DISMISSED"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Dismissed
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus("ALL")}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              selectedStatus === "ALL"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All States
          </button>
        </div>

        <div className="text-xs text-muted-foreground font-mono">
          Showing {alerts.length} alerts
        </div>
      </div>

      {/* Alerts Stream List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs">Evaluating risk rules...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-xl p-8 bg-card">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            No Financial Risks Detected
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
            All rule-based evaluators passed. Cash balances remain safe, no
            severe overdue receivables exist, and all commitments are currently
            covered.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const isUpdating = updatingId === alert.id;
            const impactStr = alert.impactAmount
              ? `৳${alert.impactAmount.toLocaleString()}`
              : null;
            const dateStr = alert.relevantDate
              ? new Date(alert.relevantDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : null;

            return (
              <Card
                key={alert.id}
                className={`border shadow-xs transition-all ${
                  alert.severity === "CRITICAL"
                    ? "border-destructive/40 bg-destructive/5"
                    : alert.severity === "HIGH"
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-border bg-card"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {getSeverityBadge(alert.severity)}
                        <span className="text-xs font-mono text-muted-foreground uppercase">
                          {alert.category.replace("_", " ")}
                        </span>
                        {alert.status !== "ACTIVE" && (
                          <Badge variant="outline" className="text-[10px]">
                            {alert.status}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base font-semibold text-foreground pt-1">
                        {alert.title}
                      </CardTitle>
                      <CardDescription className="text-xs text-foreground/80 leading-relaxed">
                        {alert.description}
                      </CardDescription>
                    </div>

                    {impactStr && (
                      <div className="text-left sm:text-right shrink-0">
                        <div className="text-[10px] text-muted-foreground uppercase font-mono">
                          Financial Impact
                        </div>
                        <div className="text-lg font-bold font-mono text-foreground">
                          {impactStr}
                        </div>
                        {dateStr && (
                          <div className="text-[11px] text-muted-foreground flex items-center sm:justify-end gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {dateStr}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {/* Action Recommendation Box */}
                  {alert.suggestedAction && (
                    <div className="rounded-lg p-3 bg-background border border-border/70 flex items-start gap-2.5 text-xs">
                      <div className="p-1 rounded-md bg-primary/10 text-primary shrink-0 mt-0.5">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground">
                          Recommended Action:
                        </div>
                        <div className="text-muted-foreground leading-normal">
                          {alert.suggestedAction}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Supporting Attribution Data (if invoice linked) */}
                  {alert.supportingData && (
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-md border border-border/50 font-mono">
                      <span>Attribution:</span>
                      {Object.entries(alert.supportingData).map(
                        ([key, value]) => {
                          if (key === "invoiceId") return null;
                          return (
                            <span
                              key={key}
                              className="bg-background px-1.5 py-0.5 rounded border border-border text-foreground"
                            >
                              <strong>{key}:</strong> {String(value)}
                            </span>
                          );
                        },
                      )}
                    </div>
                  )}

                  {/* Action Controls */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <div className="text-[11px] text-muted-foreground">
                      Detected:{" "}
                      {new Date(alert.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      {alert.category === "OVERDUE_RECEIVABLE" && (
                        <Link href="/invoices">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs gap-1"
                          >
                            <FileText className="h-3 w-3" />
                            View Invoices
                          </Button>
                        </Link>
                      )}

                      {alert.status === "ACTIVE" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isUpdating}
                          onClick={() =>
                            handleUpdateStatus(alert.id, "ACKNOWLEDGED")
                          }
                          className="h-7 text-xs"
                        >
                          Acknowledge
                        </Button>
                      )}

                      {alert.status !== "RESOLVED" &&
                        alert.status !== "DISMISSED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isUpdating}
                            onClick={() =>
                              handleUpdateStatus(alert.id, "DISMISSED")
                            }
                            className="h-7 text-xs text-muted-foreground hover:text-destructive"
                          >
                            Dismiss
                          </Button>
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
