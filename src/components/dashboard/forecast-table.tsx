"use client";

import {
  AlertOctagon,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Repeat,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DailyCashBucket } from "@/types/forecast";

interface ForecastTableProps {
  dailyBuckets: DailyCashBucket[];
  currency: string;
  minReserveThreshold: number;
}

export function ForecastTable({
  dailyBuckets,
  currency,
  minReserveThreshold,
}: ForecastTableProps) {
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [filterMode, setFilterMode] = useState<"ALL" | "ACTIVITY" | "DEFICIT">(
    "ALL",
  );

  const symbol = currency === "BDT" ? "৳" : "$";

  const toggleDay = (date: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    for (const b of dailyBuckets) {
      all[b.date] = true;
    }
    setExpandedDays(all);
  };

  const collapseAll = () => {
    setExpandedDays({});
  };

  const filteredBuckets = useMemo(() => {
    if (filterMode === "DEFICIT") {
      return dailyBuckets.filter(
        (b) => b.isDeficit || b.closingBalance < minReserveThreshold,
      );
    }
    if (filterMode === "ACTIVITY") {
      return dailyBuckets.filter((b) => b.inflows > 0 || b.outflows > 0);
    }
    return dailyBuckets;
  }, [dailyBuckets, filterMode, minReserveThreshold]);

  return (
    <Card className="border border-border shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              30-Day Cash-Flow Ledger Breakdown
            </CardTitle>
            <CardDescription>
              Detailed daily opening balance, scheduled customer receipts,
              supplier payables, and recurring commitments.
            </CardDescription>
          </div>

          {/* Action Filters */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border p-1 bg-muted/30">
              <button
                type="button"
                onClick={() => setFilterMode("ALL")}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  filterMode === "ALL"
                    ? "bg-background text-foreground shadow-xs font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All 30 Days
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("ACTIVITY")}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  filterMode === "ACTIVITY"
                    ? "bg-background text-foreground shadow-xs font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Activity Only
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("DEFICIT")}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  filterMode === "DEFICIT"
                    ? "bg-destructive/10 text-destructive font-medium shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Deficits & Alerts
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={
                Object.keys(expandedDays).length > 0 ? collapseAll : expandAll
              }
              className="text-xs h-8"
            >
              {Object.keys(expandedDays).length > 0
                ? "Collapse All"
                : "Expand All"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs font-medium text-muted-foreground uppercase border-b border-border">
              <tr>
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4">Timeline</th>
                <th className="py-3 px-4 text-right">Opening Cash</th>
                <th className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                  + Inflows
                </th>
                <th className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">
                  - Outflows
                </th>
                <th className="py-3 px-4 text-right">Net Daily</th>
                <th className="py-3 px-4 text-right">Closing Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredBuckets.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-muted-foreground text-sm"
                  >
                    No cash-flow records matching the selected filter.
                  </td>
                </tr>
              ) : (
                filteredBuckets.map((bucket) => {
                  const isExpanded = !!expandedDays[bucket.date];
                  const hasDetails =
                    bucket.inflowItems.length > 0 ||
                    bucket.outflowItems.length > 0;

                  const netDay = bucket.inflows - bucket.outflows;

                  const billItems = bucket.outflowItems.filter(
                    (item) => item.type === "INVOICE_PAYABLE",
                  );
                  const recurringItems = bucket.outflowItems.filter(
                    (item) => item.type === "RECURRING_COMMITMENT",
                  );

                  return (
                    <tbody key={bucket.date} className="group">
                      <tr
                        onClick={() => hasDetails && toggleDay(bucket.date)}
                        className={`transition-colors hover:bg-muted/30 ${
                          hasDetails ? "cursor-pointer" : ""
                        } ${
                          bucket.isDeficit
                            ? "bg-destructive/5"
                            : bucket.isBelowReserve
                              ? "bg-amber-500/5"
                              : ""
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          {hasDetails && (
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground p-0.5"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </td>

                        {/* Date & Day */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground">
                            Day {bucket.dayIndex} &bull; {bucket.date}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {bucket.dayOfWeek}
                          </div>
                        </td>

                        {/* Opening */}
                        <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                          {symbol}
                          {bucket.openingBalance.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        {/* Inflows */}
                        <td className="py-3 px-4 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          {bucket.inflows > 0 ? (
                            `+${symbol}${bucket.inflows.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-muted-foreground/50">-</span>
                          )}
                        </td>

                        {/* Outflows */}
                        <td className="py-3 px-4 text-right font-mono font-medium text-rose-600 dark:text-rose-400">
                          {bucket.outflows > 0 ? (
                            `-${symbol}${bucket.outflows.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-muted-foreground/50">-</span>
                          )}
                        </td>

                        {/* Net Daily */}
                        <td className="py-3 px-4 text-right font-mono font-medium">
                          <span
                            className={
                              netDay > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : netDay < 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-muted-foreground"
                            }
                          >
                            {netDay > 0 ? "+" : ""}
                            {symbol}
                            {netDay.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </td>

                        {/* Closing */}
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          <span
                            className={
                              bucket.isDeficit
                                ? "text-destructive"
                                : bucket.isBelowReserve
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-foreground"
                            }
                          >
                            {symbol}
                            {bucket.closingBalance.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4 text-center">
                          {bucket.isDeficit ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-destructive/15 text-destructive border border-destructive/20">
                              <AlertOctagon className="h-3 w-3" />
                              DEFICIT
                            </span>
                          ) : bucket.isBelowReserve ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                              <AlertTriangle className="h-3 w-3" />
                              RESERVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              SAFE
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable item details */}
                      {isExpanded && hasDetails && (
                        <tr className="bg-muted/15 border-b border-border">
                          <td colSpan={8} className="p-4 pl-12 space-y-3">
                            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Contributing Items on {bucket.date}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* Inflows */}
                              {bucket.inflowItems.length > 0 && (
                                <div className="rounded-lg border border-border bg-background p-3 space-y-2">
                                  <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                    <span className="flex items-center gap-1">
                                      <ArrowDownLeft className="h-3.5 w-3.5" />
                                      Incoming Receivables
                                    </span>
                                    <span>
                                      {bucket.inflowItems.length} items
                                    </span>
                                  </div>
                                  <div className="space-y-1.5 divide-y divide-border/60">
                                    {bucket.inflowItems.map((item) => (
                                      <div
                                        key={item.invoiceId}
                                        className="pt-1.5 first:pt-0 flex justify-between items-center text-xs"
                                      >
                                        <div>
                                          <div className="font-medium text-foreground">
                                            {item.counterparty}
                                          </div>
                                          <div className="text-[10px] text-muted-foreground">
                                            #{item.invoiceNumber}
                                            {item.isDelayed && " (delayed)"}
                                          </div>
                                        </div>
                                        <div className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                          +{symbol}
                                          {item.amount.toLocaleString()}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Supplier Payables */}
                              {billItems.length > 0 && (
                                <div className="rounded-lg border border-border bg-background p-3 space-y-2">
                                  <div className="flex items-center justify-between text-xs font-semibold text-rose-600 dark:text-rose-400">
                                    <span className="flex items-center gap-1">
                                      <ArrowUpRight className="h-3.5 w-3.5" />
                                      Supplier Bills Due
                                    </span>
                                    <span>{billItems.length} bills</span>
                                  </div>
                                  <div className="space-y-1.5 divide-y divide-border/60">
                                    {billItems.map((item) => (
                                      <div
                                        key={item.id}
                                        className="pt-1.5 first:pt-0 flex justify-between items-center text-xs"
                                      >
                                        <div>
                                          <div className="font-medium text-foreground">
                                            {item.counterpartyOrCategory}
                                          </div>
                                          <div className="text-[10px] text-muted-foreground">
                                            #{item.reference}
                                          </div>
                                        </div>
                                        <div className="font-mono font-medium text-rose-600 dark:text-rose-400">
                                          -{symbol}
                                          {item.amount.toLocaleString()}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Recurring Commitments */}
                              {recurringItems.length > 0 && (
                                <div className="rounded-lg border border-border bg-background p-3 space-y-2">
                                  <div className="flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
                                    <span className="flex items-center gap-1">
                                      <Repeat className="h-3.5 w-3.5" />
                                      Fixed Overhead
                                    </span>
                                    <span>{recurringItems.length} items</span>
                                  </div>
                                  <div className="space-y-1.5 divide-y divide-border/60">
                                    {recurringItems.map((rec) => (
                                      <div
                                        key={rec.id}
                                        className="pt-1.5 first:pt-0 flex justify-between items-center text-xs"
                                      >
                                        <div>
                                          <div className="font-medium text-foreground">
                                            {rec.reference}
                                          </div>
                                          <div className="text-[10px] text-muted-foreground uppercase font-mono">
                                            {rec.counterpartyOrCategory}
                                          </div>
                                        </div>
                                        <div className="font-mono font-medium text-amber-600 dark:text-amber-400">
                                          -{symbol}
                                          {rec.amount.toLocaleString()}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
