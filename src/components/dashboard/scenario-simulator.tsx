"use client";

import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { SimulationResult } from "@/services/simulation";

interface ScenarioSimulatorProps {
  currency: string;
  minReserveThreshold: number;
  onSimulationChange: (result: SimulationResult | null) => void;
}

export function ScenarioSimulator({
  currency,
  minReserveThreshold,
  onSimulationChange,
}: ScenarioSimulatorProps) {
  const [expenseTitle, setExpenseTitle] = useState("New Equipment Purchase");
  const [expenseAmount, setExpenseAmount] = useState<number>(100000);
  const [dayIndex, setDayIndex] = useState<number>(10);
  const [overrideDelay, setOverrideDelay] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [simulationResult, setSimulationResult] =
    useState<SimulationResult | null>(null);

  const symbol = currency === "BDT" ? "৳" : "$";

  // Quick preset test scenarios
  const applyPreset = (
    title: string,
    amount: number,
    day: number,
    delay: number,
  ) => {
    setExpenseTitle(title);
    setExpenseAmount(amount);
    setDayIndex(day);
    setOverrideDelay(delay);
  };

  const runSimulation = async () => {
    if (!expenseAmount || expenseAmount <= 0) {
      toast.error("Please enter a valid expense amount greater than 0");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/forecast/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseTitle,
          expenseAmount,
          dayIndex,
          category: "CAPEX_EQUIPMENT",
          overrideLateDelayDays: overrideDelay > 0 ? overrideDelay : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to run simulation");
      }

      const result: SimulationResult = json.data;
      setSimulationResult(result);
      onSimulationChange(result);

      if (result.verdict === "SAFE") {
        toast.success("Affordable! Safety cash reserve is preserved.");
      } else if (result.verdict === "RESERVE_BREACH") {
        toast("Warning: Cash balance dips below safety reserve.", {
          icon: "⚠️",
        });
      } else {
        toast.error("Critical: This expense triggers a negative cash deficit!");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to simulate";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSimulationResult(null);
    onSimulationChange(null);
    toast.success("Simulation overlay cleared");
  };

  return (
    <Card className="border border-border shadow-xs">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary-text" />
              What-If Affordability Simulator
            </CardTitle>
            <CardDescription>
              Test hypothetical capital expenditures, bulk supplier purchases,
              or customer payment delays with zero guesswork.
            </CardDescription>
          </div>
          {simulationResult && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 self-start sm:self-auto text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear Simulation
            </Button>
          )}
        </div>

        {/* Preset scenario shortcuts */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2">
          <span className="text-xs text-muted-foreground mr-1">Presets:</span>
          <button
            type="button"
            onClick={() =>
              applyPreset("Factory Machinery Upgrade", 150000, 7, 0)
            }
            className="text-xs bg-muted hover:bg-muted/80 text-foreground px-2.5 py-1 rounded-full border border-border transition-colors"
          >
            Machinery ({symbol}150k, Day 7)
          </button>
          <button
            type="button"
            onClick={() =>
              applyPreset("Advance Bulk Raw Material", 80000, 14, 0)
            }
            className="text-xs bg-muted hover:bg-muted/80 text-foreground px-2.5 py-1 rounded-full border border-border transition-colors"
          >
            Bulk Inventory ({symbol}80k, Day 14)
          </button>
          <button
            type="button"
            onClick={() =>
              applyPreset("Customer Receivables Delayed", 0.01, 1, 14)
            }
            className="text-xs bg-muted hover:bg-muted/80 text-foreground px-2.5 py-1 rounded-full border border-border transition-colors"
          >
            14-Day Payment Delays
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Expense Title */}
          <div className="space-y-1.5 md:col-span-1">
            <Label htmlFor="scenario-title" className="text-xs font-medium">
              Scenario / Purchase Name
            </Label>
            <Input
              id="scenario-title"
              value={expenseTitle}
              onChange={(e) => setExpenseTitle(e.target.value)}
              placeholder="e.g. Bulk Generator Purchase"
              className="h-9 text-sm"
            />
          </div>

          {/* Amount */}
          <div className="space-y-1.5 md:col-span-1">
            <Label htmlFor="scenario-amount" className="text-xs font-medium">
              Hypothetical Outflow ({symbol})
            </Label>
            <Input
              id="scenario-amount"
              type="number"
              min="0"
              step="1000"
              value={expenseAmount || ""}
              onChange={(e) => setExpenseAmount(Number(e.target.value))}
              placeholder="Amount"
              className="h-9 text-sm font-mono"
            />
          </div>

          {/* Day of Month / Day Index */}
          <div className="space-y-1.5 md:col-span-1">
            <div className="flex justify-between items-center">
              <Label htmlFor="scenario-day" className="text-xs font-medium">
                Day Offset (Day {dayIndex})
              </Label>
              <span className="text-[11px] text-muted-foreground font-mono">
                Day 1 = Today
              </span>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Slider
                id="scenario-day"
                min={1}
                max={30}
                step={1}
                value={dayIndex}
                onValueChange={(val) => setDayIndex(val)}
                className="flex-1"
              />
              <span className="text-xs font-mono font-medium min-w-9 text-center text-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                {dayIndex}d
              </span>
            </div>
          </div>

          {/* Customer Delay Offset */}
          <div className="space-y-1.5 md:col-span-1">
            <div className="flex justify-between items-center">
              <Label htmlFor="scenario-delay" className="text-xs font-medium">
                Inflow Delay Buffer ({overrideDelay}d)
              </Label>
              <span className="text-[11px] text-muted-foreground font-mono">
                Stress Test
              </span>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Slider
                id="scenario-delay"
                min={0}
                max={30}
                step={2}
                value={overrideDelay}
                onValueChange={(val) => setOverrideDelay(val)}
                className="flex-1"
              />
              <span className="text-xs font-mono font-medium min-w-10 text-center text-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                +{overrideDelay}d
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end gap-3 pt-1 border-t border-border">
          <Button
            onClick={runSimulation}
            disabled={isLoading}
            className="gap-2 px-6 h-9 text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculating Projection...
              </>
            ) : (
              <>
                Simulate Impact
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Simulation Output Banner */}
        {simulationResult && (
          <div
            className={`rounded-lg p-4 border transition-all ${
              simulationResult.verdict === "SAFE"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                : simulationResult.verdict === "RESERVE_BREACH"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200"
                  : "bg-destructive/10 border-destructive/30 text-destructive-foreground"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {simulationResult.verdict === "SAFE" && (
                  <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                )}
                {simulationResult.verdict === "RESERVE_BREACH" && (
                  <div className="p-2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                )}
                {simulationResult.verdict === "UNSAFE_DEFICIT" && (
                  <div className="p-2 rounded-full bg-destructive/20 text-destructive">
                    <AlertOctagon className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base">
                      {simulationResult.verdict === "SAFE"
                        ? "SAFE: Affordable Expenditure"
                        : simulationResult.verdict === "RESERVE_BREACH"
                          ? "CAUTION: Dips Below Safety Reserve"
                          : "CRITICAL: Severe Cash Deficit Triggered"}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        simulationResult.verdict === "SAFE"
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : simulationResult.verdict === "RESERVE_BREACH"
                            ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                            : "bg-destructive/20 text-destructive"
                      }`}
                    >
                      {simulationResult.verdict}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5 opacity-90">
                    {simulationResult.recommendation}
                  </p>
                </div>
              </div>

              {/* Quick Metrics Comparison */}
              <div className="flex items-center gap-4 bg-background/50 backdrop-blur-xs px-3.5 py-2 rounded-md border border-border text-xs">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-mono">
                    Baseline Min Balance
                  </div>
                  <div className="font-mono font-semibold text-foreground">
                    {symbol}
                    {simulationResult.metrics.baselineMinBalance.toLocaleString()}
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-mono">
                    Simulated Min Balance
                  </div>
                  <div
                    className={`font-mono font-bold ${
                      simulationResult.metrics.simulatedMinBalance < 0
                        ? "text-destructive"
                        : simulationResult.metrics.simulatedMinBalance <
                            minReserveThreshold
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {symbol}
                    {simulationResult.metrics.simulatedMinBalance.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {simulationResult.metrics.firstSimulatedDeficitDate && (
              <div className="mt-2.5 pt-2 border-t border-destructive/20 text-xs flex items-center gap-1.5 text-destructive font-medium">
                <AlertOctagon className="h-3.5 w-3.5" />
                First projected cash deficit date:{" "}
                <span className="font-bold underline">
                  {simulationResult.metrics.firstSimulatedDeficitDate}
                </span>{" "}
                ({simulationResult.metrics.simulatedDeficitDaysCount} days in
                deficit)
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
