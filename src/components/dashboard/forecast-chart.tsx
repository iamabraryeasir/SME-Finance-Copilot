"use client";

import { useMemo, useState } from "react";
import type { DailyCashBucket } from "@/types/forecast";

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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const symbol = currency === "BDT" ? "৳" : "$";

  // Chart dimensions & coordinate math
  const width = 800;
  const height = 320;
  const padding = { top: 30, right: 30, bottom: 45, left: 70 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const { minVal, maxVal, points, simPoints, zeroY, reserveY } = useMemo(() => {
    if (!dailyBuckets || dailyBuckets.length === 0) {
      return {
        minVal: 0,
        maxVal: 100000,
        points: [],
        simPoints: [],
        zeroY: chartHeight,
        reserveY: 0,
      };
    }

    const allValues = dailyBuckets.map((b) => b.closingBalance);
    if (simulatedBuckets) {
      for (const s of simulatedBuckets) {
        allValues.push(s.simulatedClosingBalance);
      }
    }
    allValues.push(minReserveThreshold);
    allValues.push(0);

    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);

    const margin = (rawMax - rawMin) * 0.1 || 10000;
    const computedMin = Math.floor((rawMin - margin) / 5000) * 5000;
    const computedMax = Math.ceil((rawMax + margin) / 5000) * 5000;
    const range = computedMax - computedMin || 1;

    const getY = (val: number) => {
      const normalized = (val - computedMin) / range;
      return chartHeight - normalized * chartHeight;
    };

    const getX = (index: number) => {
      const step = chartWidth / (dailyBuckets.length - 1 || 1);
      return index * step;
    };

    const pts = dailyBuckets.map((b, i) => ({
      x: getX(i),
      y: getY(b.closingBalance),
      bucket: b,
    }));

    const simPts = simulatedBuckets
      ? simulatedBuckets.map((s, i) => ({
          x: getX(i),
          y: getY(s.simulatedClosingBalance),
          simulatedVal: s.simulatedClosingBalance,
        }))
      : [];

    return {
      minVal: computedMin,
      maxVal: computedMax,
      points: pts,
      simPoints: simPts,
      zeroY: getY(0),
      reserveY: getY(minReserveThreshold),
    };
  }, [
    dailyBuckets,
    simulatedBuckets,
    minReserveThreshold,
    chartWidth,
    chartHeight,
  ]);

  // Construct SVG Area and Line paths
  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    return points.reduce(
      (acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`,
      "",
    );
  }, [points]);

  const areaD = useMemo(() => {
    if (points.length === 0) return "";
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const clampedBottom = Math.min(chartHeight, Math.max(0, zeroY));
    return `${pathD} L ${lastX} ${clampedBottom} L ${firstX} ${clampedBottom} Z`;
  }, [points, pathD, chartHeight, zeroY]);

  const simPathD = useMemo(() => {
    if (simPoints.length === 0) return "";
    return simPoints.reduce(
      (acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`,
      "",
    );
  }, [simPoints]);

  const activeBucket =
    hoveredIndex !== null && points[hoveredIndex]
      ? points[hoveredIndex].bucket
      : null;
  const activeSimVal =
    hoveredIndex !== null && simPoints[hoveredIndex]
      ? simPoints[hoveredIndex].simulatedVal
      : null;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const clientX = e.clientX - rect.left;
    const scaleX = width / rect.width;
    const svgX = clientX * scaleX - padding.left;

    if (svgX < 0 || svgX > chartWidth || points.length === 0) {
      setHoveredIndex(null);
      return;
    }
    const step = chartWidth / (points.length - 1 || 1);
    const index = Math.round(svgX / step);
    if (index >= 0 && index < points.length) {
      setHoveredIndex(index);
    }
  };

  return (
    <div className="w-full relative flex flex-col items-center select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible cursor-crosshair"
        aria-label="30-day cash flow projection chart"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <title>30-Day Cash-Flow Projection Chart</title>
        <defs>
          {/* Subtle area gradient */}
          <linearGradient id="balanceAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>

          {/* Danger zone gradient for deficits */}
          <linearGradient id="deficitAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--destructive)"
              stopOpacity="0.05"
            />
            <stop
              offset="100%"
              stopColor="var(--destructive)"
              stopOpacity="0.25"
            />
          </linearGradient>
        </defs>

        {/* Chart Canvas */}
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Horizontal Grid lines (5 ticks) */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = chartHeight * pct;
            const tickVal = Math.round(maxVal - (maxVal - minVal) * pct);
            return (
              <g key={pct} className="text-muted-foreground/40">
                <line
                  x1={0}
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  strokeWidth="0.75"
                />
                <text
                  x={-10}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-muted-foreground"
                >
                  {symbol}
                  {tickVal >= 1000000
                    ? `${(tickVal / 1000000).toFixed(1)}M`
                    : tickVal >= 1000 || tickVal <= -1000
                      ? `${(tickVal / 1000).toFixed(0)}k`
                      : tickVal}
                </text>
              </g>
            );
          })}

          {/* Shaded Deficit Danger Zone (Below Zero Line) */}
          {zeroY < chartHeight && (
            <rect
              x={0}
              y={zeroY}
              width={chartWidth}
              height={Math.max(0, chartHeight - zeroY)}
              fill="url(#deficitAreaGrad)"
            />
          )}

          {/* Minimum Reserve Reference Line */}
          {reserveY >= 0 && reserveY <= chartHeight && (
            <g className="text-amber-500/80">
              <line
                x1={0}
                y1={reserveY}
                x2={chartWidth}
                y2={reserveY}
                stroke="currentColor"
                strokeWidth="1.25"
                strokeDasharray="5 4"
              />
              <text
                x={chartWidth - 4}
                y={reserveY - 5}
                textAnchor="end"
                className="text-[9px] font-semibold tracking-wide fill-amber-500 uppercase"
              >
                Safety Reserve: {symbol}
                {minReserveThreshold.toLocaleString()}
              </text>
            </g>
          )}

          {/* Zero Balance Baseline */}
          {zeroY >= 0 && zeroY <= chartHeight && (
            <line
              x1={0}
              y1={zeroY}
              x2={chartWidth}
              y2={zeroY}
              stroke="var(--destructive)"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity={0.6}
            />
          )}

          {/* Baseline Forecast Area & Curve */}
          <path d={areaD} fill="url(#balanceAreaGrad)" />
          <path
            d={pathD}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Simulated Scenario Curve (if present) */}
          {simPathD && (
            <path
              d={simPathD}
              fill="none"
              stroke="var(--destructive)"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* X-Axis Day Labels (every 5 days) */}
          {points.map((pt, i) => {
            if (i % 5 !== 0 && i !== points.length - 1) return null;
            return (
              <g
                key={pt.bucket.date}
                transform={`translate(${pt.x}, ${chartHeight + 16})`}
              >
                <line
                  x1={0}
                  y1={-16}
                  x2={0}
                  y2={-11}
                  stroke="currentColor"
                  className="text-border"
                />
                <text
                  x={0}
                  y={4}
                  textAnchor="middle"
                  className="text-[10px] font-mono fill-muted-foreground"
                >
                  Day {pt.bucket.dayIndex}
                </text>
                <text
                  x={0}
                  y={16}
                  textAnchor="middle"
                  className="text-[9px] fill-muted-foreground/70"
                >
                  {pt.bucket.date.slice(5)}
                </text>
              </g>
            );
          })}

          {/* Interactive Hover Guides & Data Points */}
          {points.map((pt, i) => {
            const isHovered = hoveredIndex === i;
            if (!isHovered && !pt.bucket.isDeficit) return null;
            return (
              <circle
                key={`point-${pt.bucket.date}`}
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 5 : 3.5}
                className={
                  pt.bucket.isDeficit
                    ? "fill-destructive stroke-background stroke-2 pointer-events-none"
                    : "fill-primary stroke-background stroke-2 pointer-events-none"
                }
              />
            );
          })}

          {/* Hover Crosshair Line */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <line
              x1={points[hoveredIndex].x}
              y1={0}
              x2={points[hoveredIndex].x}
              y2={chartHeight}
              stroke="var(--foreground)"
              strokeWidth="0.75"
              strokeDasharray="2 2"
              className="pointer-events-none opacity-40"
            />
          )}
        </g>
      </svg>

      {/* Interactive Tooltip Card Floating Above / Below */}
      {activeBucket && (
        <div className="absolute top-2 right-4 z-20 pointer-events-none p-3 rounded-lg border border-border bg-card/95 backdrop-blur-md shadow-md text-xs space-y-1.5 min-w-56 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-border/60 pb-1">
            <span className="font-semibold text-foreground">
              Day {activeBucket.dayIndex} ({activeBucket.dayOfWeek},{" "}
              {activeBucket.date})
            </span>
            {activeBucket.isDeficit ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-destructive/15 text-destructive">
                DEFICIT
              </span>
            ) : activeBucket.isBelowReserve ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                BELOW RESERVE
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                HEALTHY
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-muted-foreground">
            <span>Closing Balance:</span>
            <span
              className={`font-mono font-bold ${
                activeBucket.isDeficit
                  ? "text-destructive"
                  : activeBucket.isBelowReserve
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-foreground"
              }`}
            >
              {symbol}
              {activeBucket.closingBalance.toLocaleString()}
            </span>
          </div>

          {activeSimVal !== null && (
            <div className="flex items-center justify-between text-muted-foreground border-t border-dashed border-border/60 pt-1">
              <span className="text-destructive font-medium">
                With Scenario:
              </span>
              <span className="font-mono font-bold text-destructive">
                {symbol}
                {activeSimVal.toLocaleString()}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-[11px]">
            <div>
              <span className="text-emerald-600 dark:text-emerald-400 block font-medium">
                + Receipts ({activeBucket.inflowItems.length})
              </span>
              <span className="font-mono text-muted-foreground">
                {symbol}
                {activeBucket.inflows.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-blue-600 dark:text-blue-400 block font-medium">
                - Outflows ({activeBucket.outflowItems.length})
              </span>
              <span className="font-mono text-muted-foreground">
                {symbol}
                {activeBucket.outflows.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
