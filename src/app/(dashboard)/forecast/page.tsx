"use client";

import {
  AlertOctagon,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Database,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { ForecastChart } from "@/components/dashboard/forecast-chart";
import { ForecastTable } from "@/components/dashboard/forecast-table";
import { RecurringSchedulesCard } from "@/components/dashboard/recurring-schedules-card";
import { ScenarioSimulator } from "@/components/dashboard/scenario-simulator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SimulationResult } from "@/services/simulation";
import type { CashForecastResult } from "@/types/forecast";

export default function ForecastPage() {
  const [forecastData, setForecastData] = useState<CashForecastResult | null>(
    null,
  );
  const [fromCache, setFromCache] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [simulatedResult, setSimulatedResult] =
    useState<SimulationResult | null>(null);

  const fetchForecast = useCallback(async (fresh = false) => {
    try {
      if (fresh) setIsRefreshing(true);
      else setIsLoading(true);

      const url = fresh ? "/api/forecast?fresh=true" : "/api/forecast";
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load forecast data");
      }

      const receivedForecast = json.data?.forecast || json.data;
      setForecastData(receivedForecast);
      setFromCache(Boolean(json.data?.fromCache));

      if (fresh) {
        toast.success("Cash-flow projection recalculated from ledger!");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading forecast";
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchForecast(false);
  }, [fetchForecast]);

  const symbol = forecastData?.summary.currency === "BDT" ? "৳" : "$";
  const isDeficitProjected = (forecastData?.summary.deficitDaysCount ?? 0) > 0;
  const isReserveBreached = Boolean(
    forecastData?.summary.firstReserveBreachDate,
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              30-Day Cash-Flow Forecast
            </h1>
            {fromCache && (
              <Badge variant="outline" className="text-[10px] gap-1 py-0.5">
                <Database className="h-3 w-3 text-primary-text" />
                Cached (1h TTL)
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Deterministic liquidity projection incorporating real customer
            invoices, supplier bills, payment delay buffers, and recurring
            commitments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchForecast(true)}
            disabled={isRefreshing || isLoading}
            className="gap-2 h-9 text-xs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Recalculating..." : "Recalculate Fresh"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary-text" />
          <p className="text-sm">Calculating 30-day cash curves...</p>
        </div>
      ) : !forecastData ? (
        <div className="py-16 text-center text-muted-foreground border border-dashed rounded-xl p-8">
          <p className="text-base font-semibold text-foreground">
            No forecast data available.
          </p>
          <p className="text-sm mt-1">
            Ensure your business profile and invoices are initialized.
          </p>
          <Button
            onClick={() => fetchForecast(true)}
            className="mt-4 gap-2 text-xs"
          >
            Try Again
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Opening Cash Balance */}
            <Card className="border border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Current Cash Balance
                </CardTitle>
                <div className="p-1.5 rounded-md bg-primary/20 text-primary-text">
                  <Wallet className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {symbol}
                  {forecastData.summary.startingCash.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <span>Day 1 baseline liquidity</span>
                </div>
              </CardContent>
            </Card>

            {/* 2. Projected 30-Day Inflows */}
            <Card className="border border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Expected Inflows (30d)
                </CardTitle>
                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ArrowDownLeft className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  +{symbol}
                  {forecastData.summary.totalProjectedInflow.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Customer invoice collections
                </div>
              </CardContent>
            </Card>

            {/* 3. Projected 30-Day Outflows */}
            <Card className="border border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Expected Outflows (30d)
                </CardTitle>
                <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                  -{symbol}
                  {forecastData.summary.totalProjectedOutflow.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Supplier bills & recurring overhead
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
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Lowest Projected Balance
                </CardTitle>
                <div
                  className={`p-1.5 rounded-md ${
                    isDeficitProjected
                      ? "bg-destructive/15 text-destructive"
                      : isReserveBreached
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-emerald-500/10 text-emerald-600"
                  }`}
                >
                  {isDeficitProjected ? (
                    <AlertOctagon className="h-4 w-4" />
                  ) : isReserveBreached ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold font-mono ${
                    isDeficitProjected
                      ? "text-destructive"
                      : isReserveBreached
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-foreground"
                  }`}
                >
                  {symbol}
                  {forecastData.summary.minProjectedBalance.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
                  <span>
                    Min Date:{" "}
                    <strong className="text-foreground">
                      {forecastData.summary.minBalanceDate}
                    </strong>
                  </span>
                  <span>
                    Reserve: {symbol}
                    {forecastData.summary.minReserveThreshold.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interactive SVG Projection Chart */}
          <ForecastChart
            dailyBuckets={forecastData.dailyBuckets}
            minReserveThreshold={forecastData.summary.minReserveThreshold}
            currency={forecastData.summary.currency}
            simulatedBuckets={simulatedResult?.comparativeBuckets}
          />

          {/* What-If Affordability Simulator */}
          <ScenarioSimulator
            currency={forecastData.summary.currency}
            minReserveThreshold={forecastData.summary.minReserveThreshold}
            onSimulationChange={setSimulatedResult}
          />

          {/* Recurring Commitments Manager */}
          <RecurringSchedulesCard
            currency={forecastData.summary.currency}
            onScheduleChanged={() => fetchForecast(true)}
          />

          {/* 30-Day Ledger Breakdown Table */}
          <ForecastTable
            dailyBuckets={forecastData.dailyBuckets}
            currency={forecastData.summary.currency}
            minReserveThreshold={forecastData.summary.minReserveThreshold}
          />
        </div>
      )}
    </div>
  );
}
