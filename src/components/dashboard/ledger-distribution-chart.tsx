"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
  type TooltipItem,
} from "chart.js";
import { ArrowRight, PieChart, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Register Chart.js elements for bar and doughnut charts
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
);

interface LedgerDistributionChartProps {
  totalReceivables: number;
  totalPayables: number;
  overdueReceivables: number;
  currency: string;
}

export function LedgerDistributionChart({
  totalReceivables,
  totalPayables,
  overdueReceivables,
  currency,
}: LedgerDistributionChartProps) {
  const [chartType, setChartType] = useState<"RATIO" | "STATUS">("RATIO");
  const symbol = currency === "BDT" ? "৳" : "$";

  const currentReceivables = Math.max(0, totalReceivables - overdueReceivables);
  const netWorkingCapital = totalReceivables - totalPayables;
  const totalVolume =
    currentReceivables + overdueReceivables + totalPayables || 1;

  const currentPercent = Math.round((currentReceivables / totalVolume) * 100);
  const overduePercent = Math.round((overdueReceivables / totalVolume) * 100);
  const payablesPercent = Math.round((totalPayables / totalVolume) * 100);

  // Doughnut Chart Data: AR vs AP Ratio
  const doughnutData = useMemo(() => {
    return {
      labels: [
        "Current Receivables (AR)",
        "Overdue Receivables (AR)",
        "Upcoming Payables (AP)",
      ],
      datasets: [
        {
          data: [currentReceivables, overdueReceivables, totalPayables],
          backgroundColor: [
            "rgba(16, 185, 129, 0.85)", // Emerald
            "rgba(245, 158, 11, 0.85)", // Amber
            "rgba(244, 63, 94, 0.85)", // Rose
          ],
          borderColor: [
            "rgb(16, 185, 129)",
            "rgb(245, 158, 11)",
            "rgb(244, 63, 94)",
          ],
          borderWidth: 1.5,
          hoverOffset: 6,
        },
      ],
    };
  }, [currentReceivables, overdueReceivables, totalPayables]);

  const doughnutOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          padding: 10,
          callbacks: {
            label: (context: TooltipItem<"doughnut">) => {
              const val = Number(context.raw) || 0;
              return ` ${context.label}: ${symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
            },
          },
        },
      },
      cutout: "70%",
    };
  }, [symbol]);

  // Bar Chart Data: AR vs AP Comparison
  const barData = useMemo(() => {
    return {
      labels: ["Receivables (AR)", "Payables (AP)"],
      datasets: [
        {
          label: "Volume Amount",
          data: [totalReceivables, totalPayables],
          backgroundColor: [
            "rgba(16, 185, 129, 0.85)",
            "rgba(244, 63, 94, 0.85)",
          ],
          borderColor: ["rgb(16, 185, 129)", "rgb(244, 63, 94)"],
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  }, [totalReceivables, totalPayables]);

  const barOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          padding: 10,
          callbacks: {
            label: (context: TooltipItem<"bar">) => {
              const val = Number(context.raw) || 0;
              return ` ${symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 11 },
            color: "var(--muted-foreground, #94a3b8)",
          },
        },
        y: {
          grid: { color: "rgba(148, 163, 184, 0.12)" },
          ticks: {
            font: { size: 10, family: "monospace" },
            color: "var(--muted-foreground, #94a3b8)",
            callback: (val: string | number) => {
              const num = Number(val);
              if (Math.abs(num) >= 1_000_000)
                return `${symbol}${(num / 1_000_000).toFixed(1)}M`;
              if (Math.abs(num) >= 1_000)
                return `${symbol}${(num / 1_000).toFixed(0)}k`;
              return `${symbol}${num}`;
            },
          },
        },
      },
    };
  }, [symbol]);

  return (
    <Card className="border border-border/80 shadow-2xs bg-card flex flex-col justify-between h-full">
      <CardHeader className="p-4 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <PieChart className="h-4 w-4 text-primary-text" />
              Liquidity Obligation Distribution
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Receivables collection vs Payables commitments ratio.
            </CardDescription>
          </div>

          <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40 self-start sm:self-auto text-xs">
            <button
              type="button"
              onClick={() => setChartType("RATIO")}
              className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                chartType === "RATIO"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Doughnut
            </button>
            <button
              type="button"
              onClick={() => setChartType("STATUS")}
              className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                chartType === "STATUS"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Bar Ratio
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-4 flex-1 flex flex-col justify-between">
        {/* Visual Chart + Breakdown Matrix Row */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 py-1">
          <div className="h-44 w-44 relative shrink-0 mx-auto sm:mx-0 flex items-center justify-center">
            {chartType === "RATIO" ? (
              <Doughnut data={doughnutData} options={doughnutOptions} />
            ) : (
              <Bar data={barData} options={barOptions} />
            )}
          </div>

          {/* Breakdown Legend List */}
          <div className="flex-1 w-full space-y-2 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-medium text-foreground">Current AR</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  +{symbol}
                  {currentReceivables.toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground w-8 text-right">
                  {currentPercent}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="font-medium text-foreground">Overdue AR</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  {symbol}
                  {overdueReceivables.toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground w-8 text-right">
                  {overduePercent}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                <span className="font-medium text-foreground">Upcoming AP</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  -{symbol}
                  {totalPayables.toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground w-8 text-right">
                  {payablesPercent}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Metrics */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
          <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60">
            <div className="text-[10px] text-muted-foreground uppercase font-mono font-medium">
              Net Working Position
            </div>
            <div
              className={`font-mono font-bold text-sm mt-0.5 flex items-center gap-1 ${
                netWorkingCapital >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {netWorkingCapital >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {symbol}
              {netWorkingCapital.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 flex flex-col justify-between">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase font-mono font-medium">
                Overdue Exposure
              </div>
              <div className="font-mono font-bold text-sm mt-0.5 text-amber-700 dark:text-amber-400">
                {symbol}
                {overdueReceivables.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-1 flex justify-end">
          <Link
            href="/invoices"
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            <span>Manage invoices & ledger</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
