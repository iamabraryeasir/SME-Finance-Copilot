"use client";

import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Download,
  FilePlus,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
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
import { authClient } from "@/lib/auth-client";
import type { CashForecastResult } from "@/types/forecast";

export default function DashboardPage() {
  const { data: session } = authClient.useSession();
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
    receivablesCount?: number;
  } | null>(null);
  const [companyName, setCompanyName] = useState<string>("Rahman Trading");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async (fresh = false) => {
    try {
      if (fresh) setIsRefreshing(true);
      else setIsLoading(true);

      const [forecastRes, alertsRes, invoicesRes, profileRes] =
        await Promise.all([
          fetch(fresh ? "/api/forecast?fresh=true" : "/api/forecast"),
          fetch(fresh ? "/api/alerts?sync=true" : "/api/alerts"),
          fetch("/api/invoices"),
          fetch("/api/profile"),
        ]);

      const [forecastJson, alertsJson, invoicesJson, profileJson] =
        await Promise.all([
          forecastRes.json(),
          alertsRes.json(),
          invoicesRes.json(),
          profileRes.json(),
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
      if (profileRes.ok && profileJson.success && profileJson.data?.profile) {
        setCompanyName(
          profileJson.data.profile.companyName || "Rahman Trading",
        );
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

  // Formatted date string for editorial header (e.g. Wednesday, October 16)
  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const activeAlertsCount =
    alertCounts.TOTAL > 0 ? alertCounts.TOTAL : alerts.length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header matching Design System Mockup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
            Your cash, at a glance
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {todayFormatted} · Showing 30-day outlook for{" "}
            <span className="font-medium text-foreground">
              {companyName || session?.user?.name || "Rahman Trading"}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            disabled={isRefreshing || isLoading}
            className="gap-2 h-9 rounded-xl text-xs border-border bg-card hover:bg-muted"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Syncing..." : "Sync Fresh"}
          </Button>

          <Link href="/copilot">
            <Button
              size="sm"
              className="gap-2 h-9 rounded-xl text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-2xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ask CashPilot
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary-text" />
          <p className="text-sm">
            Synthesizing real-time financial telemetry...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: The 3 Primary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Current Cash Balance */}
            <Card className="rounded-2xl border border-border bg-card p-5 shadow-2xs transition-all hover:border-foreground/20">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Current cash balance
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <ArrowUpRight className="h-3 w-3" />
                  +12.4% vs last month
                </span>
              </div>
              <div className="font-serif text-3xl font-normal tracking-tight text-foreground">
                {symbol}
                {forecast?.summary.startingCash.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {isDeficitProjected ? (
                  <span className="text-destructive font-semibold">
                    Deficit projected in {forecast?.summary.deficitDaysCount}{" "}
                    days
                  </span>
                ) : isReserveBreached ? (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    Dips below reserve on{" "}
                    {forecast?.summary.firstReserveBreachDate}
                  </span>
                ) : (
                  <span>Safe for 48 days at current burn</span>
                )}
              </p>
            </Card>

            {/* 2. Expected Incoming */}
            <Card className="rounded-2xl border border-border bg-card p-5 shadow-2xs transition-all hover:border-foreground/20">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Expected incoming
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <ArrowUpRight className="h-3 w-3" />
                  +8.1% vs last month
                </span>
              </div>
              <div className="font-serif text-3xl font-normal tracking-tight text-foreground">
                +{symbol}
                {forecast?.summary.totalProjectedInflow.toLocaleString(
                  undefined,
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  },
                ) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {invoiceSummary?.receivablesCount || 3} invoices due in next 30
                days
              </p>
            </Card>

            {/* 3. Upcoming Outgoing */}
            <Card className="rounded-2xl border border-border bg-card p-5 shadow-2xs transition-all hover:border-foreground/20">
              <div className="flex items-center justify-between pb-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Upcoming outgoing
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  <ArrowDownLeft className="h-3 w-3" />
                  -3.2% vs last month
                </span>
              </div>
              <div className="font-serif text-3xl font-normal tracking-tight text-foreground">
                -{symbol}
                {forecast?.summary.totalProjectedOutflow.toLocaleString(
                  undefined,
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  },
                ) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Scheduled commitments & operating expenses
              </p>
            </Card>
          </div>

          {/* Section 2: Main Layout Grid (Forecast Runway on Left + Needs Attention on Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7-8 Cols: 30-Day Cash Projection Runway */}
            <div className="lg:col-span-8 space-y-6">
              {forecast && (
                <ForecastChart
                  dailyBuckets={forecast.dailyBuckets}
                  minReserveThreshold={forecast.summary.minReserveThreshold}
                  currency={forecast.summary.currency}
                />
              )}

              {/* 30-Day Summary Highlights Footer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
                  <div className="text-[11px] font-medium text-muted-foreground">
                    Lowest projected balance
                  </div>
                  <div className="text-base font-semibold font-mono text-foreground mt-0.5">
                    {symbol}
                    {forecast?.summary.minProjectedBalance.toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    On {forecast?.summary.minBalanceDate || "Day 19"}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
                  <div className="text-[11px] font-medium text-muted-foreground">
                    Expected cash in (30d)
                  </div>
                  <div className="text-base font-semibold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    +{symbol}
                    {forecast?.summary.totalProjectedInflow.toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Customer collections
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
                  <div className="text-[11px] font-medium text-muted-foreground">
                    Scheduled cash out (30d)
                  </div>
                  <div className="text-base font-semibold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                    -{symbol}
                    {forecast?.summary.totalProjectedOutflow.toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Vendor commitments & bills
                  </div>
                </div>
              </div>
            </div>

            {/* Right 4-5 Cols: "Needs Attention" Panel Matching Image 5 */}
            <div className="lg:col-span-4 space-y-4">
              <Card className="rounded-2xl border border-border bg-card shadow-2xs flex flex-col justify-between">
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-serif text-xl font-normal tracking-tight text-foreground">
                      Needs attention
                    </CardTitle>
                    <span className="rounded-full bg-[#FF5B37]/15 text-[#FF5B37] px-2.5 py-0.5 text-xs font-semibold">
                      {activeAlertsCount} active
                    </span>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground">
                    Items requiring operational action to safeguard cash runway.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-3">
                  {alerts.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground border border-dashed border-border rounded-xl p-4">
                      <ShieldCheck className="h-7 w-7 text-emerald-500 mx-auto mb-1.5" />
                      <p className="text-xs font-semibold text-foreground">
                        All clear — No risk alerts
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Inflows and reserves are currently safe.
                      </p>
                    </div>
                  ) : (
                    alerts.slice(0, 3).map((alert) => (
                      <div
                        key={alert.id}
                        className="rounded-xl border border-border bg-[#F9F9F6] dark:bg-muted/30 p-3 text-xs space-y-2 transition-all hover:border-foreground/20"
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 rounded-md bg-amber-500/10 p-1 text-amber-600 dark:text-amber-400 shrink-0">
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-foreground truncate">
                              {alert.title}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {alert.impactAmount ? (
                                <span>
                                  {symbol}
                                  {alert.impactAmount.toLocaleString()} ·{" "}
                                </span>
                              ) : null}
                              <span className="line-clamp-1">
                                {alert.description}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Link Button */}
                        <div className="flex justify-end pt-1 border-t border-border/50">
                          <Link
                            href={
                              alert.category === "OVERDUE_RECEIVABLE"
                                ? "/invoices"
                                : alert.category === "CASH_DEFICIT" ||
                                    alert.category === "RESERVE_BREACH"
                                  ? "/forecast"
                                  : "/alerts"
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground hover:text-primary-text transition-colors"
                          >
                            <span>
                              {alert.category === "OVERDUE_RECEIVABLE"
                                ? "Send reminder"
                                : alert.category === "CASH_DEFICIT" ||
                                    alert.category === "RESERVE_BREACH"
                                  ? "Review cash flow"
                                  : "View invoice"}
                            </span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>

                {/* Quick Actions Footer matching Image 5 */}
                <div className="p-4 pt-2 border-t border-border flex flex-col gap-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                    Quick Actions
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Link href="/invoices" className="w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 rounded-lg text-[11px] gap-1 px-2 border-border"
                      >
                        <FilePlus className="h-3 w-3" />
                        New invoice
                      </Button>
                    </Link>
                    <Link href="/forecast" className="w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 rounded-lg text-[11px] gap-1 px-2 border-border"
                      >
                        <TrendingUp className="h-3 w-3" />
                        Forecast scenario
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast.success("Preparing executive summary export...");
                      }}
                      className="w-full h-8 rounded-lg text-[11px] gap-1 px-2 border-border"
                    >
                      <Download className="h-3 w-3" />
                      Export report
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Section 3: Ledger Distribution Breakdown */}
          <div className="pt-2">
            <LedgerDistributionChart
              totalReceivables={invoiceSummary?.totalReceivables || 0}
              totalPayables={invoiceSummary?.totalPayables || 0}
              overdueReceivables={overdueReceivablesAmount}
              currency={forecast?.summary.currency || "BDT"}
            />
          </div>
        </div>
      )}
    </div>
  );
}
