"use client";

import {
  AlertOctagon,
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { FinancialAlertItem } from "@/app/(dashboard)/alerts/page";
import { ForecastChart } from "@/components/dashboard/forecast-chart";
import { LedgerDistributionChart } from "@/components/dashboard/ledger-distribution-chart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CashForecastResult } from "@/types/forecast";

export default function DashboardPage() {
  const [forecast, setForecast] = useState<CashForecastResult | null>(null);
  const [alerts, setAlerts] = useState<FinancialAlertItem[]>([]);
  const [alertCounts, setAlertCounts] = useState({
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    TOTAL: 0,
  });
  const [invoiceSummary, setInvoiceSummary] = useState<{
    totalReceivables: number;
    totalPayables: number;
    overdueCount: number;
    netWorkingCapital: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async (fresh = false) => {
    try {
      if (fresh) setIsRefreshing(true);
      else setIsLoading(true);

      const [forecastRes, alertsRes, invoicesRes] = await Promise.all([
        fetch(fresh ? "/api/forecast?fresh=true" : "/api/forecast"),
        fetch(fresh ? "/api/alerts?sync=true" : "/api/alerts"),
        fetch("/api/invoices"),
      ]);

      const [forecastJson, alertsJson, invoicesJson] = await Promise.all([
        forecastRes.json(),
        alertsRes.json(),
        invoicesRes.json(),
      ]);

      if (forecastRes.ok && forecastJson.success) {
        setForecast(forecastJson.data?.forecast || forecastJson.data);
      }
      if (alertsRes.ok && alertsJson.success) {
        setAlerts(alertsJson.data.alerts);
        setAlertCounts(alertsJson.data.counts);
      }
      if (invoicesRes.ok && invoicesJson.success) {
        setInvoiceSummary(invoicesJson.data.summary);
      }

      if (fresh) {
        toast.success("Dashboard metrics updated!");
      }
    } catch (err: unknown) {
      console.error("Dashboard fetch error:", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  const symbol = forecast?.summary.currency === "BDT" ? "৳" : "$";
  const isDeficitProjected = (forecast?.summary.deficitDaysCount ?? 0) > 0;
  const isReserveBreached = Boolean(forecast?.summary.firstReserveBreachDate);

  // Compute total overdue receivables amount
  const overdueReceivablesAmount = alerts
    .filter((a) => a.category === "OVERDUE_RECEIVABLE")
    .reduce((sum, a) => sum + (a.impactAmount || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Quick Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Financial Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time liquidity intelligence, Chart.js cash runway, and
            deterministic operational risk telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            disabled={isRefreshing || isLoading}
            className="gap-2 h-9 text-xs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Syncing..." : "Sync Fresh"}
          </Button>

          <Link href="/invoices">
            <Button size="sm" className="gap-1.5 h-9 text-xs">
              <Upload className="h-3.5 w-3.5" />
              Upload Invoices
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">
            Synthesizing real-time financial telemetry...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: The 6 KPI Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* 1. Verified Cash Balance */}
            <Card className="border border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0 p-4">
                <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Cash Balance
                </CardTitle>
                <div className="p-1 rounded-md bg-primary/10 text-primary">
                  <Wallet className="h-3.5 w-3.5" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold font-mono text-foreground">
                  {symbol}
                  {forecast?.summary.startingCash.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || "0.00"}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Verified baseline liquidity
                </div>
              </CardContent>
            </Card>

            {/* 2. Expected Inflows (30d AR) */}
            <Card className="border border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0 p-4">
                <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Incoming (30d)
                </CardTitle>
                <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  +{symbol}
                  {forecast?.summary.totalProjectedInflow.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  ) || "0.00"}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Expected customer receipts
                </div>
              </CardContent>
            </Card>

            {/* 3. Upcoming Outflows (30d AP) */}
            <Card className="border border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0 p-4">
                <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Outgoing (30d)
                </CardTitle>
                <div className="p-1 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
                  -{symbol}
                  {forecast?.summary.totalProjectedOutflow.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  ) || "0.00"}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Bills & fixed commitments
                </div>
              </CardContent>
            </Card>

            {/* 4. Lowest Projected Balance */}
            <Card
              className={`border shadow-xs ${
                isDeficitProjected
                  ? "border-destructive/40 bg-destructive/5"
                  : isReserveBreached
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border"
              }`}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0 p-4">
                <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Lowest Balance
                </CardTitle>
                <div
                  className={`p-1 rounded-md ${
                    isDeficitProjected
                      ? "bg-destructive/15 text-destructive"
                      : isReserveBreached
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-emerald-500/10 text-emerald-600"
                  }`}
                >
                  {isDeficitProjected ? (
                    <AlertOctagon className="h-3.5 w-3.5" />
                  ) : isReserveBreached ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div
                  className={`text-xl font-bold font-mono ${
                    isDeficitProjected
                      ? "text-destructive"
                      : isReserveBreached
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-foreground"
                  }`}
                >
                  {symbol}
                  {forecast?.summary.minProjectedBalance.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  ) || "0.00"}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  Min: {forecast?.summary.minBalanceDate || "N/A"}
                </div>
              </CardContent>
            </Card>

            {/* 5. Overdue Receivables Exposure */}
            <Card className="border border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0 p-4">
                <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Overdue AR
                </CardTitle>
                <div className="p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Clock className="h-3.5 w-3.5" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                  {symbol}
                  {overdueReceivablesAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {invoiceSummary?.overdueCount || 0} overdue customer bills
                </div>
              </CardContent>
            </Card>

            {/* 6. Active Financial Alerts Count */}
            <Card className="border border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0 p-4">
                <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Risks
                </CardTitle>
                <div className="p-1 rounded-md bg-primary/10 text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xl font-bold font-mono text-foreground">
                  {alertCounts.TOTAL}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  {alertCounts.CRITICAL > 0 && (
                    <span className="text-destructive font-bold">
                      {alertCounts.CRITICAL} Critical
                    </span>
                  )}
                  {alertCounts.HIGH > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">
                      {alertCounts.HIGH} High
                    </span>
                  )}
                  {alertCounts.CRITICAL === 0 && alertCounts.HIGH === 0 && (
                    <span>0 High/Crit</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section 2: Chart.js Cash-Flow Forecast Runway */}
          {forecast && (
            <ForecastChart
              dailyBuckets={forecast.dailyBuckets}
              minReserveThreshold={forecast.summary.minReserveThreshold}
              currency={forecast.summary.currency}
            />
          )}

          {/* Section 3: Dual Grid (Chart.js Ledger Distribution + Priority Alerts Feed) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 Cols: Chart.js Doughnut / Bar Ledger Distribution */}
            <div className="lg:col-span-5">
              <LedgerDistributionChart
                totalReceivables={invoiceSummary?.totalReceivables || 0}
                totalPayables={invoiceSummary?.totalPayables || 0}
                overdueReceivables={overdueReceivablesAmount}
                currency={forecast?.summary.currency || "BDT"}
              />
            </div>

            {/* Right 7 Cols: Priority Alerts & Action Recommendations Feed */}
            <div className="lg:col-span-7">
              <Card className="border border-border shadow-xs h-full flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Priority Risk Alerts & Follow-Ups
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Deterministic rule-based hazards evaluated against the
                        live ledger.
                      </CardDescription>
                    </div>
                    <Link href="/alerts">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 gap-1"
                      >
                        View All ({alertCounts.TOTAL})
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 flex-1">
                  {alerts.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground border border-dashed rounded-lg p-6">
                      <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-foreground">
                        Zero Financial Risks Detected
                      </p>
                      <p className="text-[11px] mt-0.5">
                        Cash balance remains safe, no overdue receivables exist,
                        and supplier payables are covered.
                      </p>
                    </div>
                  ) : (
                    alerts.slice(0, 3).map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-lg border text-xs space-y-1.5 transition-all ${
                          alert.severity === "CRITICAL"
                            ? "bg-destructive/5 border-destructive/30"
                            : alert.severity === "HIGH"
                              ? "bg-amber-500/5 border-amber-500/30"
                              : "bg-muted/30 border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground truncate">
                            {alert.title}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                              alert.severity === "CRITICAL"
                                ? "bg-destructive/15 text-destructive"
                                : alert.severity === "HIGH"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[11px] line-clamp-2">
                          {alert.description}
                        </p>
                        {alert.suggestedAction && (
                          <div className="text-[10px] text-foreground font-medium flex items-center gap-1 pt-1 border-t border-border/40">
                            <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                            <span className="truncate">
                              {alert.suggestedAction}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
