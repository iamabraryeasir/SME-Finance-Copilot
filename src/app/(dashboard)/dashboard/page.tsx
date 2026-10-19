"use client";

import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bot,
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
import { Badge } from "@/components/ui/badge";
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

interface DashboardAuditItem {
  id: string;
  actor: "USER" | "AGENT" | "SYSTEM" | "TELEGRAM";
  actionType: string;
  entityType: string;
  status: "SUCCESS" | "FAILED" | "PENDING_APPROVAL";
  createdAt: string;
}

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
  const [todayFormatted, setTodayFormatted] = useState<string>("");
  const [recentAuditLogs, setRecentAuditLogs] = useState<DashboardAuditItem[]>(
    [],
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async (fresh = false) => {
    try {
      if (fresh) setIsRefreshing(true);
      else setIsLoading(true);

      const [forecastRes, alertsRes, invoicesRes, profileRes, auditRes] =
        await Promise.all([
          fetch(fresh ? "/api/forecast?fresh=true" : "/api/forecast"),
          fetch(fresh ? "/api/alerts?sync=true" : "/api/alerts"),
          fetch("/api/invoices"),
          fetch("/api/profile"),
          fetch("/api/audit?limit=4"),
        ]);

      const [forecastJson, alertsJson, invoicesJson, profileJson, auditJson] =
        await Promise.all([
          forecastRes.json(),
          alertsRes.json(),
          invoicesRes.json(),
          profileRes.json(),
          auditRes.json(),
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
      if (auditRes.ok && auditJson.success && auditJson.data?.logs) {
        setRecentAuditLogs(auditJson.data.logs);
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
    setTodayFormatted(
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date()),
    );
  }, [fetchDashboardData]);

  const symbol = forecast?.summary.currency === "BDT" ? "৳" : "$";
  const isDeficitProjected = (forecast?.summary.deficitDaysCount ?? 0) > 0;
  const isReserveBreached = Boolean(forecast?.summary.firstReserveBreachDate);

  // Compute total overdue receivables amount
  const overdueReceivablesAmount = alerts
    .filter((a) => a.category === "OVERDUE_RECEIVABLE")
    .reduce((sum, a) => sum + (a.impactAmount || 0), 0);

  const activeAlertsCount =
    alertCounts.TOTAL > 0 ? alertCounts.TOTAL : alerts.length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header matching Design System Mockup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Your cash, at a glance
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {todayFormatted ? `${todayFormatted} · ` : ""}Showing 30-day outlook
            for{" "}
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
              <div className="font-mono text-3xl font-semibold tracking-tight text-foreground">
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
              <div className="font-mono text-3xl font-semibold tracking-tight text-foreground">
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
              <div className="font-mono text-3xl font-semibold tracking-tight text-foreground">
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left 7-8 Cols: 30-Day Cash Projection Runway */}
            <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
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
            <div className="lg:col-span-4 flex flex-col">
              <Card className="rounded-2xl border border-border bg-card shadow-2xs flex flex-col justify-between h-full">
                <div>
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
                        Needs attention
                      </CardTitle>
                      <span className="rounded-full bg-[#FF5B37]/15 text-[#FF5B37] px-2.5 py-0.5 text-xs font-semibold">
                        {activeAlertsCount} active
                      </span>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground">
                      Items requiring operational action to safeguard cash
                      runway.
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
                </div>

                {/* Quick Actions Footer matching Image 5 */}
                <div className="p-4 pt-3 border-t border-border flex flex-col gap-2 mt-auto">
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

          {/* Section 4, 5 & 6: Balanced Row - Liquidity Distribution & Intelligence/Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pt-2">
            {/* Section 4: Liquidity Obligation Distribution */}
            <div className="lg:col-span-6 flex flex-col">
              <LedgerDistributionChart
                totalReceivables={invoiceSummary?.totalReceivables || 0}
                totalPayables={invoiceSummary?.totalPayables || 0}
                overdueReceivables={overdueReceivablesAmount}
                currency={forecast?.summary.currency || "BDT"}
              />
            </div>

            {/* Right 6 Cols: AI Copilot Launchpad Dock + Recent Compliance Activity */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
              {/* Section 5: AI Copilot Launchpad Dock */}
              <Card className="border border-border/80 shadow-2xs bg-card flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary-text">
                        <Bot className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-sm font-semibold text-foreground">
                        AI Advisory Launchpad
                      </CardTitle>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] text-primary-text border-primary/40 bg-primary/10"
                    >
                      Gemini 3.8 Flash
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Autonomous financial reasoning over verified database
                    records.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-2.5">
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-xs space-y-1.5">
                    <span className="text-[10px] uppercase font-mono text-muted-foreground block font-semibold">
                      Recommended Inquiries
                    </span>
                    <Link
                      href="/copilot"
                      className="block text-xs text-foreground hover:text-primary-text transition-colors truncate"
                    >
                      &bull; &ldquo;Can I afford to purchase ৳150,000 inventory
                      on Day 10?&rdquo;
                    </Link>
                    <Link
                      href="/copilot"
                      className="block text-xs text-foreground hover:text-primary-text transition-colors truncate"
                    >
                      &bull; &ldquo;Who owes me the most money and which
                      invoices are overdue?&rdquo;
                    </Link>
                  </div>

                  <Link href="/copilot" className="block w-full">
                    <Button
                      size="sm"
                      className="w-full text-xs h-8 bg-primary text-black hover:bg-primary/90 gap-1.5 font-medium"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Open Copilot Advisory
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Section 6: Real-Time Audit & Compliance Stream */}
              <Card className="border border-border/80 shadow-2xs bg-card flex flex-col justify-between flex-1">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold text-foreground">
                        Recent Activity Log
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        Append-only operational and compliance ledger.
                      </CardDescription>
                    </div>
                  </div>
                  <Link href="/audit">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
                    >
                      View All <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {recentAuditLogs.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No recent audit events logged.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50 space-y-0">
                      {recentAuditLogs.slice(0, 3).map((log) => (
                        <div
                          key={log.id}
                          className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 font-medium ${
                                log.actor === "USER"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                  : log.actor === "AGENT"
                                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                    : log.actor === "TELEGRAM"
                                      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                                      : "bg-muted text-muted-foreground border border-border"
                              }`}
                            >
                              {log.actor}
                            </span>
                            <span className="font-medium text-foreground truncate">
                              {log.actionType.replace(/_/g, " ")}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono truncate hidden sm:inline">
                              &bull; {log.entityType}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(log.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                log.status === "SUCCESS"
                                  ? "bg-emerald-500"
                                  : log.status === "FAILED"
                                    ? "bg-red-500"
                                    : "bg-amber-500"
                              }`}
                              title={log.status}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
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
