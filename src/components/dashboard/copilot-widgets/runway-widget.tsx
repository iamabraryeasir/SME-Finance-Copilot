"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface RunwayWidgetProps {
  daysRemaining?: number;
  burnRate?: number;
  currentCash?: number;
  lowestCash?: number;
  deficitDate?: string | null;
  currencySymbol?: string;
}

export function RunwayWidget({
  daysRemaining = 42,
  burnRate = 12500,
  currentCash = 185000,
  lowestCash = 78000,
  deficitDate = null,
  currencySymbol = "৳",
}: RunwayWidgetProps) {
  const isCritical = daysRemaining < 30 || deficitDate !== null;
  const isModerate = daysRemaining >= 30 && daysRemaining < 60;

  // Percentage for 90-day scale
  const percentage = Math.min(
    100,
    Math.max(10, Math.round((daysRemaining / 90) * 100)),
  );

  return (
    <div className="my-3 rounded-xl border border-border/80 bg-card/90 p-4 shadow-sm backdrop-blur-xs transition-all hover:border-border">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${
              isCritical
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : isModerate
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {isCritical ? (
              <ShieldAlert className="h-4 w-4" />
            ) : isModerate ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Deterministic Cash Runway
            </h4>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-foreground">
                {daysRemaining} Days
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 font-medium ${
                  isCritical
                    ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"
                    : isModerate
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {isCritical
                  ? "Deficit Risk"
                  : isModerate
                    ? "Moderate Buffer"
                    : "Optimal"}
              </Badge>
            </div>
          </div>
        </div>

        <Link href="/forecast">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
          >
            Detailed Model <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      {/* Visual Runway Progress Bar */}
      <div className="mt-3 space-y-1.5">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>0 Days (Depletion)</span>
          <span className="font-mono font-medium text-foreground">
            Target: 60+ Days
          </span>
          <span>90+ Days</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCritical
                ? "bg-red-500"
                : isModerate
                  ? "bg-amber-500"
                  : "bg-emerald-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Financial Matrix Grid */}
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/40 pt-3 text-center">
        <div className="rounded-lg bg-muted/40 p-2">
          <div className="text-[10px] text-muted-foreground">
            Current Liquidity
          </div>
          <div className="font-mono text-xs font-semibold text-foreground">
            {currencySymbol}
            {currentCash.toLocaleString()}
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 p-2">
          <div className="text-[10px] text-muted-foreground">
            Lowest 30-Day Dip
          </div>
          <div
            className={`font-mono text-xs font-semibold ${
              lowestCash < 0
                ? "text-red-600 dark:text-red-400"
                : "text-foreground"
            }`}
          >
            {currencySymbol}
            {lowestCash.toLocaleString()}
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 p-2">
          <div className="text-[10px] text-muted-foreground">Daily Burn</div>
          <div className="flex items-center justify-center gap-0.5 font-mono text-xs font-semibold text-foreground">
            <TrendingDown className="h-3 w-3 text-muted-foreground" />
            {currencySymbol}
            {burnRate.toLocaleString()}
          </div>
        </div>
      </div>

      {deficitDate && (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-600 dark:text-red-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Projected cash deficit detected on{" "}
            <strong>{new Date(deficitDate).toLocaleDateString()}</strong>.
            Receivables acceleration recommended.
          </span>
        </div>
      )}
    </div>
  );
}
