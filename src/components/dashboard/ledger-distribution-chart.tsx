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
import { PieChart, TrendingDown, TrendingUp } from "lucide-react";
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
          position: "bottom" as const,
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
            font: {
              size: 11,
            },
            color: "var(--foreground, #64748b)",
          },
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
      cutout: "68%",
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
        legend: {
          display: false,
        },
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
    <Card className="border border-border shadow-xs">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary-text" />
              Liquidity Obligation Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Powered by Chart.js &bull; Accounts Receivable collection vs
              Accounts Payable commitments.
            </CardDescription>
          </div>

          <div className="flex items-center rounded-lg border border-border p-1 bg-muted/30 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setChartType("RATIO")}
              className={`text-xs px-2.5 py-0.5 rounded-md transition-colors ${
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
              className={`text-xs px-2.5 py-0.5 rounded-md transition-colors ${
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

      <CardContent className="space-y-3">
        <div className="h-55 w-full relative">
          {chartType === "RATIO" ? (
            <Doughnut data={doughnutData} options={doughnutOptions} />
          ) : (
            <Bar data={barData} options={barOptions} />
          )}
        </div>

        {/* Footer Metrics */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-xs">
          <div className="p-2 rounded-md bg-muted/30 border border-border/50">
            <div className="text-[10px] text-muted-foreground uppercase font-mono">
              Net Working Position
            </div>
            <div
              className={`font-mono font-bold mt-0.5 flex items-center gap-1 ${
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

          <div className="p-2 rounded-md bg-muted/30 border border-border/50">
            <div className="text-[10px] text-muted-foreground uppercase font-mono">
              Overdue Exposure
            </div>
            <div className="font-mono font-bold mt-0.5 text-amber-600 dark:text-amber-400">
              {symbol}
              {overdueReceivables.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
