"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  type ScriptableContext,
  type ScriptableLineSegmentContext,
  Title,
  Tooltip,
  type TooltipItem,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DailyCashBucket } from "@/types/forecast";

// Register Chart.js components and annotation plugin
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin,
);

interface ForecastChartProps {
  dailyBuckets: DailyCashBucket[];
  minReserveThreshold: number;
  currency: string;
  simulatedBuckets?: Array<{
    date: string;
    dayIndex: number;
    simulatedClosingBalance: number;
  }>;
}

export function ForecastChart({
  dailyBuckets,
  minReserveThreshold,
  currency,
  simulatedBuckets,
}: ForecastChartProps) {
  const [activeRange, setActiveRange] = useState<7 | 14 | 30>(30);
  const symbol = currency === "BDT" ? "৳" : "$";

  // Filter buckets according to range (7, 14, or 30 days)
  const displayBuckets = useMemo(() => {
    if (!dailyBuckets || dailyBuckets.length === 0) return [];
    return dailyBuckets.slice(0, activeRange);
  }, [dailyBuckets, activeRange]);

  const displaySimulated = useMemo(() => {
    if (!simulatedBuckets || simulatedBuckets.length === 0) return null;
    return simulatedBuckets.slice(0, activeRange);
  }, [simulatedBuckets, activeRange]);

  // Compute tight dynamic vertical bounds based on the active range window
  const { minVal, maxVal } = useMemo(() => {
    if (displayBuckets.length === 0) return { minVal: 0, maxVal: 50000 };
    const values = displayBuckets.map((b) => b.closingBalance);
    if (displaySimulated && displaySimulated.length > 0) {
      for (const s of displaySimulated) {
        values.push(s.simulatedClosingBalance);
      }
    }

    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);

    // Anchor points that must be visible on the chart
    const anchorPoints = [dataMin, dataMax];

    // Include reserve threshold only if it's relevant to the current viewing window
    if (minReserveThreshold !== undefined) {
      if (
        dataMin < minReserveThreshold * 1.8 ||
        dataMax < minReserveThreshold * 1.8
      ) {
        anchorPoints.push(minReserveThreshold);
      }
    }

    // Include 0 (break-even baseline) if cash goes negative or is near 0
    if (dataMin < 0 || (dataMin < dataMax * 0.4 && dataMax < 100000)) {
      anchorPoints.push(0);
    }

    const rawMin = Math.min(...anchorPoints);
    const rawMax = Math.max(...anchorPoints);
    const span = rawMax - rawMin || 10000;

    // Tight 6-8% headroom so the curve is prominent and never hits canvas edges
    const headroom = Math.max(span * 0.08, 1000);

    // Dynamic rounding steps based on data span
    const step =
      span > 500000
        ? 50000
        : span > 100000
          ? 10000
          : span > 30000
            ? 5000
            : span > 5000
              ? 1000
              : 500;

    const calculatedMin = Math.floor((rawMin - headroom) / step) * step;
    const calculatedMax = Math.ceil((rawMax + headroom) / step) * step;

    return {
      minVal: calculatedMin,
      maxVal:
        calculatedMax > calculatedMin
          ? calculatedMax
          : calculatedMin + step * 2,
    };
  }, [displayBuckets, displaySimulated, minReserveThreshold]);

  // Labels: Day 1 (10-19)
  const labels = useMemo(() => {
    return displayBuckets.map((b) => `Day ${b.dayIndex} (${b.date.slice(5)})`);
  }, [displayBuckets]);

  // Key metrics for the header
  const lowestBalance = useMemo(() => {
    if (displayBuckets.length === 0) return 0;
    return Math.min(...displayBuckets.map((b) => b.closingBalance));
  }, [displayBuckets]);

  const lowestBucket = useMemo(() => {
    if (displayBuckets.length === 0) return null;
    return displayBuckets.reduce(
      (min, b) => (b.closingBalance < min.closingBalance ? b : min),
      displayBuckets[0],
    );
  }, [displayBuckets]);

  const deficitDaysList = useMemo(() => {
    return displayBuckets.filter((b) => b.isDeficit);
  }, [displayBuckets]);

  const hasDeficit = lowestBalance < 0;
  const hasReserveBreach = lowestBalance < minReserveThreshold;

  // Chart.js Data Configuration
  const chartData = useMemo(() => {
    const baselineData = displayBuckets.map((b) => b.closingBalance);

    const datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
      borderWidth: number;
      segment?: {
        borderColor?: (ctx: ScriptableLineSegmentContext) => string;
      };
      backgroundColor?: (
        context: ScriptableContext<"line">,
      ) => CanvasGradient | string;
      fill?: boolean;
      tension: number;
      pointBackgroundColor: string[];
      pointBorderColor: string[];
      pointRadius: number[];
      pointHoverRadius: number;
      borderDash?: number[];
    }> = [
      {
        label: "Projected Cash Balance",
        data: baselineData,
        // Default color fallback
        borderColor: "rgb(16, 185, 129)",
        borderWidth: 2.75,
        fill: true,
        tension: 0.35,
        // DYNAMIC SEGMENT COLORING:
        // Turns RED strictly when below zero, AMBER when below reserve, GREEN when healthy!
        segment: {
          borderColor: (ctx: ScriptableLineSegmentContext) => {
            const y0 = ctx.p0.parsed.y ?? 0;
            const y1 = ctx.p1.parsed.y ?? 0;
            const avg = (y0 + y1) / 2;
            if (avg < 0) {
              return "rgb(239, 68, 68)"; // Red ONLY during deficit valley
            }
            if (avg < minReserveThreshold) {
              return "rgb(245, 158, 11)"; // Amber during reserve dip
            }
            return "rgb(16, 185, 129)"; // Green when safe and positive
          },
        },
        backgroundColor: (context: ScriptableContext<"line">) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) {
            return "rgba(16, 185, 129, 0.05)";
          }
          // Clean, subtle gradient that doesn't overwhelm the eye
          const gradient = ctx.createLinearGradient(
            0,
            chartArea.top,
            0,
            chartArea.bottom,
          );
          gradient.addColorStop(0, "rgba(16, 185, 129, 0.18)");
          gradient.addColorStop(0.65, "rgba(16, 185, 129, 0.03)");
          gradient.addColorStop(1, "rgba(239, 68, 68, 0.06)");
          return gradient;
        },
        pointBackgroundColor: displayBuckets.map((b) =>
          b.isDeficit
            ? "rgb(239, 68, 68)"
            : b.isBelowReserve
              ? "rgb(245, 158, 11)"
              : "rgb(16, 185, 129)",
        ),
        pointBorderColor: displayBuckets.map(() => "#ffffff"),
        pointRadius: displayBuckets.map((b, i) =>
          b.isDeficit ||
          b.isBelowReserve ||
          i === 0 ||
          i === displayBuckets.length - 1
            ? 5
            : 2.5,
        ),
        pointHoverRadius: 7,
      },
    ];

    // If What-If simulation is active, inject comparative overlay dataset
    if (displaySimulated && displaySimulated.length > 0) {
      datasets.push({
        label: "What-If Simulated Curve",
        data: displaySimulated.map((s) => s.simulatedClosingBalance),
        borderColor: "rgb(168, 85, 247)", // Purple
        borderWidth: 2,
        borderDash: [6, 4],
        fill: false,
        tension: 0.35,
        pointBackgroundColor: displaySimulated.map((s) =>
          s.simulatedClosingBalance < 0
            ? "rgb(239, 68, 68)"
            : "rgb(168, 85, 247)",
        ),
        pointBorderColor: displaySimulated.map(() => "#ffffff"),
        pointRadius: displaySimulated.map((s) =>
          s.simulatedClosingBalance < 0 ? 5 : 3,
        ),
        pointHoverRadius: 7,
      });
    }

    return {
      labels,
      datasets,
    };
  }, [displayBuckets, displaySimulated, labels, minReserveThreshold]);

  // Chart.js Options Configuration
  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index" as const,
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: "top" as const,
          align: "end" as const,
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            font: {
              size: 11,
              weight: "bold" as const,
            },
            color: "var(--foreground, #64748b)",
          },
        },
        tooltip: {
          enabled: true,
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          titleColor: "#ffffff",
          bodyColor: "#f1f5f9",
          borderColor: "rgba(148, 163, 184, 0.2)",
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          titleFont: {
            size: 12,
            weight: "bold" as const,
          },
          bodyFont: {
            size: 11,
          },
          callbacks: {
            title: (items: TooltipItem<"line">[]) => {
              const idx = items[0]?.dataIndex;
              if (idx === undefined || !displayBuckets[idx]) return "";
              const b = displayBuckets[idx];
              return `Day ${b.dayIndex} • ${b.date} (${b.dayOfWeek})`;
            },
            label: (context: TooltipItem<"line">) => {
              const val = context.parsed.y ?? 0;
              const isSim = context.datasetIndex === 1;
              return `${isSim ? "Simulated Cash" : "Projected Cash"}: ${symbol}${val.toLocaleString(
                undefined,
                { minimumFractionDigits: 2, maximumFractionDigits: 2 },
              )}`;
            },
            afterBody: (items: TooltipItem<"line">[]) => {
              const idx = items[0]?.dataIndex;
              if (idx === undefined || !displayBuckets[idx]) return [];
              const b = displayBuckets[idx];
              const lines = [
                `+ Receipts (Inflow): ${symbol}${b.inflows.toLocaleString()}`,
                `- Payments (Outflow): ${symbol}${b.outflows.toLocaleString()}`,
              ];
              if (b.isDeficit) {
                lines.push("🔴 STATUS: CASH DEFICIT (Action Required)");
              } else if (b.isBelowReserve) {
                lines.push("🟡 STATUS: BELOW SAFETY RESERVE");
              } else {
                lines.push("🟢 STATUS: HEALTHY LIQUIDITY");
              }
              return lines;
            },
          },
        },
        annotation: {
          annotations: {
            // Shaded Danger Zone Strictly Below Zero (clamped to minVal)
            deficitDangerZone: {
              type: "box" as const,
              display: minVal < 0,
              yMin: minVal,
              yMax: 0,
              backgroundColor: "rgba(239, 68, 68, 0.07)",
              borderWidth: 0,
            },
            // Safety Reserve Threshold Line (Amber Dashed)
            reserveLine: {
              type: "line" as const,
              display:
                minReserveThreshold >= minVal && minReserveThreshold <= maxVal,
              yMin: minReserveThreshold,
              yMax: minReserveThreshold,
              borderColor: "rgba(245, 158, 11, 0.9)",
              borderWidth: 1.75,
              borderDash: [5, 5],
              label: {
                display: true,
                content: `Safety Reserve: ${symbol}${minReserveThreshold >= 1000 ? `${(minReserveThreshold / 1000).toFixed(0)}k` : minReserveThreshold}`,
                position: "end" as const,
                backgroundColor: "rgba(245, 158, 11, 0.95)",
                color: "#ffffff",
                font: {
                  size: 10,
                  weight: "bold" as const,
                },
                padding: { top: 3, bottom: 3, left: 6, right: 6 },
              },
            },
            // Neutral Break-Even Baseline at 0.00 (Slate Dashed)
            zeroLine: {
              type: "line" as const,
              display: minVal <= 0 && maxVal >= 0,
              yMin: 0,
              yMax: 0,
              borderColor: "rgba(100, 116, 139, 0.8)",
              borderWidth: 1.5,
              borderDash: [4, 4],
              label: {
                display: true,
                content: "Break-Even (৳0.00)",
                position: "start" as const,
                backgroundColor: "rgba(71, 85, 105, 0.9)",
                color: "#ffffff",
                font: {
                  size: 10,
                  weight: "bold" as const,
                },
                padding: { top: 3, bottom: 3, left: 6, right: 6 },
              },
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: activeRange === 7 ? 7 : activeRange === 14 ? 14 : 10,
            font: {
              size: 10,
              family: "monospace",
            },
            color: "var(--muted-foreground, #94a3b8)",
          },
        },
        y: {
          min: minVal,
          max: maxVal,
          grid: {
            color: "rgba(148, 163, 184, 0.12)",
          },
          ticks: {
            font: {
              size: 10,
              family: "monospace",
            },
            color: "var(--muted-foreground, #94a3b8)",
            callback: (val: string | number) => {
              const num = Number(val);
              if (Math.abs(num) >= 1_000_000) {
                return `${symbol}${(num / 1_000_000).toFixed(1)}M`;
              }
              if (Math.abs(num) >= 1_000) {
                return `${symbol}${(num / 1_000).toFixed(0)}k`;
              }
              return `${symbol}${num}`;
            },
          },
        },
      },
    };
  }, [
    displayBuckets,
    minReserveThreshold,
    symbol,
    activeRange,
    minVal,
    maxVal,
  ]);

  return (
    <Card className="border border-border shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                30-Day Liquidity Runway
              </CardTitle>

              {hasDeficit ? (
                <Badge variant="destructive" className="text-xs gap-1 py-0.5">
                  <AlertOctagon className="h-3.5 w-3.5" />
                  Deficit: {deficitDaysList.length} Days (Low: {symbol}
                  {lowestBalance.toLocaleString()})
                </Badge>
              ) : hasReserveBreach ? (
                <Badge variant="warning" className="text-xs gap-1 py-0.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Below Reserve Buffer
                </Badge>
              ) : (
                <Badge variant="success" className="text-xs gap-1 py-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Safe Runway
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Color-coded cash curve:{" "}
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Green
              </span>{" "}
              when above reserve,{" "}
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                Amber
              </span>{" "}
              below reserve, and{" "}
              <span className="text-destructive font-semibold">Red</span> during
              deficits.
            </CardDescription>
          </div>

          {/* Timeframe Range Toggle */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border p-1 bg-muted/30 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveRange(7)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                activeRange === 7
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setActiveRange(14)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                activeRange === 14
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              14 Days
            </button>
            <button
              type="button"
              onClick={() => setActiveRange(30)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                activeRange === 30
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              30 Days
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Chart.js Canvas Container */}
        <div className="h-100 w-full pt-1">
          <Line data={chartData} options={options} />
        </div>

        {/* Intuitive Color Legend & Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-border text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {/* Green */}
            <div className="flex items-center gap-1.5 text-foreground">
              <span className="w-3.5 h-1 bg-emerald-500 inline-block rounded-full" />
              <span>
                Safe Balance (
                <span className="text-emerald-600 font-medium">
                  &ge; Reserve
                </span>
                )
              </span>
            </div>

            {/* Amber */}
            <div className="flex items-center gap-1.5 text-foreground">
              <span className="w-3.5 h-1 bg-amber-500 inline-block rounded-full" />
              <span>
                Caution Zone (
                <span className="text-amber-600 font-medium">
                  &lt; {symbol}
                  {minReserveThreshold.toLocaleString()}
                </span>
                )
              </span>
            </div>

            {/* Red */}
            <div className="flex items-center gap-1.5 text-foreground">
              <span className="w-3.5 h-1 bg-destructive inline-block rounded-full" />
              <span>
                Deficit Danger (
                <span className="text-destructive font-medium">
                  &lt; {symbol}0.00
                </span>
                )
              </span>
            </div>

            {/* Purple Scenario if active */}
            {displaySimulated && (
              <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-medium">
                <span className="w-3.5 h-1 bg-purple-500 border-dashed inline-block" />
                <span>What-If Simulated</span>
              </div>
            )}
          </div>

          <div className="text-[11px] font-mono text-muted-foreground">
            Lowest Point:{" "}
            <span
              className={`font-bold ${
                hasDeficit
                  ? "text-destructive"
                  : hasReserveBreach
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {symbol}
              {lowestBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>{" "}
            {lowestBucket && (
              <span>
                (Day {lowestBucket.dayIndex} &bull; {lowestBucket.date.slice(5)}
                )
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
