"use client";

import { Check, X } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";

const comparisonRows = [
  {
    feature: "Calculation Accuracy",
    traditional:
      "Prone to spreadsheet formula breaks & LLM mental math hallucinations.",
    cashpilot:
      "100% Deterministic Engine computed via verified database logic.",
  },
  {
    feature: "Runway Forecasting",
    traditional:
      "Manual end-of-month reconciliations with weeks of reporting lag.",
    cashpilot: "Continuous 30-day forward rolling runway with deficit alerts.",
  },
  {
    feature: "Bill & Invoice Entry",
    traditional: "Tedious manual typing and error-prone receipt filing.",
    cashpilot: "Sub-3 second PDF & CSV extraction with strict Zod validation.",
  },
  {
    feature: "Payment Actions",
    traditional: "Ad-hoc manual follow-up messages sent after weeks of delay.",
    cashpilot:
      "Autonomous reminder drafting requiring explicit 1-click human sign-off.",
  },
];

export function LandingComparisonTable() {
  return (
    <section
      id="comparison"
      className="py-20 md:py-28 bg-muted/20 border-t border-border/70"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge
            variant="outline"
            className="mb-3 px-3 py-1 font-mono text-xs bg-primary/10 text-primary-text border-primary/20"
          >
            The Difference
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Spreadsheets vs. CashPilot AI.
          </h2>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            Why modern SME founders and financial operators upgrade from static
            sheets to autonomous cash intelligence.
          </p>
        </div>

        {/* Clean Table Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-xs overflow-hidden shadow-xs"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 border-b border-border/60 bg-muted/40 p-4 font-semibold text-xs text-muted-foreground">
            <div className="md:col-span-4 uppercase tracking-wider">
              Capability
            </div>
            <div className="md:col-span-4 uppercase tracking-wider hidden md:block">
              Traditional Method
            </div>
            <div className="md:col-span-4 uppercase tracking-wider hidden md:block text-primary-text">
              CashPilot AI
            </div>
          </div>

          <div className="divide-y divide-border/50">
            {comparisonRows.map((row) => (
              <div
                key={row.feature}
                className="grid grid-cols-1 md:grid-cols-12 p-4 sm:p-5 gap-3 sm:gap-4 items-center text-xs sm:text-sm hover:bg-muted/20 transition-colors"
              >
                <div className="md:col-span-4 font-semibold text-foreground">
                  {row.feature}
                </div>

                <div className="md:col-span-4 text-muted-foreground flex items-start gap-2">
                  <X className="h-4 w-4 text-destructive/80 shrink-0 mt-0.5" />
                  <span>{row.traditional}</span>
                </div>

                <div className="md:col-span-4 text-foreground font-medium flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary-text shrink-0 mt-0.5" />
                  <span>{row.cashpilot}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
