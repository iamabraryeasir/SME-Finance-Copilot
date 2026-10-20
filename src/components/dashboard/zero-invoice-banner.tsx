"use client";

import {
  FileSpreadsheet,
  FileText,
  LineChart,
  Loader2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ZeroInvoiceBannerProps {
  onDataLoaded?: () => void;
  className?: string;
}

export function ZeroInvoiceBanner({
  onDataLoaded,
  className = "",
}: ZeroInvoiceBannerProps) {
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const handleLoadSampleData = async () => {
    try {
      setIsLoadingSample(true);
      const res = await fetch("/api/invoices/sample", {
        method: "POST",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load sample invoices");
      }

      toast.success(
        json.data?.importedCount > 0
          ? `✓ Loaded ${json.data.importedCount} demo invoices! Your radar is now active.`
          : "Sample data is already present in your ledger.",
      );

      if (onDataLoaded) {
        onDataLoaded();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load sample data";
      toast.error(message);
    } finally {
      setIsLoadingSample(false);
    }
  };

  return (
    <Card
      className={`relative overflow-hidden border border-primary/30 bg-linear-to-r from-primary/10 via-card to-background p-5 sm:p-6 shadow-md transition-all ${className}`}
    >
      {/* Decorative background glow */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 -z-10 h-64 w-64 rounded-full opacity-15 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(200, 252, 88, 0.8) 0%, transparent 70%)",
        }}
      />

      <CardContent className="p-0 space-y-4">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-black shadow-xs font-bold shrink-0">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-foreground">
                  Activate Your Financial Radar
                </h3>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] bg-primary/15 text-primary-text border-primary/30 hidden sm:inline-flex"
                >
                  0 Invoices in Ledger
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your cash runway forecast, deficit alerts, and AI Copilot need
                invoice records to generate live financial intelligence.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="rounded-xl border border-border/70 bg-background/60 p-3 flex items-start gap-2.5 text-xs">
            <LineChart className="h-4 w-4 text-primary-text shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground block">
                30-Day Cash Runway
              </span>
              <span className="text-muted-foreground text-[11px] leading-relaxed">
                Deterministic daily closing balances from real receivables &
                bills.
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/60 p-3 flex items-start gap-2.5 text-xs">
            <FileSpreadsheet className="h-4 w-4 text-primary-text shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground block">
                Zero Mental Math
              </span>
              <span className="text-muted-foreground text-[11px] leading-relaxed">
                Reconciled customer receipts and upcoming supplier liabilities.
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/60 p-3 flex items-start gap-2.5 text-xs">
            <ShieldCheck className="h-4 w-4 text-primary-text shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground block">
                Automated Reminders
              </span>
              <span className="text-muted-foreground text-[11px] leading-relaxed">
                Draft customer payment notices with 1-click human confirmation.
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Primary Action 1: Load 30-Day Sample Data */}
            <Button
              type="button"
              onClick={handleLoadSampleData}
              disabled={isLoadingSample}
              className="w-full sm:w-auto h-9 text-xs font-semibold bg-primary text-black hover:bg-primary/90 gap-1.5 shadow-xs cursor-pointer"
            >
              {isLoadingSample ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Loading 30-Day Sample Data...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Load 30-Day Sample Dataset</span>
                </>
              )}
            </Button>

            {/* Primary Action 2: Upload Real Invoices */}
            <Link href="/invoices" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto h-9 text-xs font-medium border-border hover:bg-muted/60 gap-1.5 cursor-pointer"
              >
                <UploadCloud className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Upload Invoices (PDF / CSV)</span>
              </Button>
            </Link>
          </div>

          <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3 w-3" />
            Includes 30 realistic Bangladeshi SME bills & receipts
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
