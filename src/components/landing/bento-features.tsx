"use client";

import {
  BellRing,
  FileText,
  LineChart,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: LineChart,
    badge: "Deterministic Core",
    title: "30-Day Cash Runway Forecasting",
    description:
      "Eliminate guesswork. Every daily closing balance is deterministically computed from pending receivables, upcoming payables, and recurring overhead—with clear alerts before safety reserve breaches occur.",
  },
  {
    icon: FileText,
    badge: "Sub-3s Extraction",
    title: "Zero-Effort Invoice & Bill Ingestion",
    description:
      "Drag and drop supplier PDFs or upload bank CSV files. High-accuracy OCR extracts invoice numbers, counterparties, totals, and due dates—validated with strict runtime Zod schemas.",
  },
  {
    icon: BellRing,
    badge: "Human-In-The-Loop",
    title: "Smart Receivable Reminders",
    description:
      "When customer invoices become overdue, CashPilot AI drafts tailored reminder messages. No payment notice is ever sent without your explicit 1-click confirmation.",
  },
  {
    icon: Smartphone,
    badge: "Single Ledger",
    title: "Omni-Channel Telegram Sync",
    description:
      "Forward receipts or ask runway questions directly inside Telegram. Your mobile bot and desktop dashboard share the exact same PostgreSQL ledger and calculation engine in real time.",
  },
];

export function LandingBentoFeatures() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge
            variant="outline"
            className="mb-3 px-3 py-1 font-mono text-xs bg-primary/10 text-primary-text border-primary/20"
          >
            Core Capabilities
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Everything You Need for Cash Flow Clarity.
          </h2>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            Four purpose-built pillars combining deterministic financial safety
            with autonomous agentic execution.
          </p>
        </div>

        {/* 4 Clean Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="rounded-2xl border border-border/70 bg-card/50 p-7 backdrop-blur-xs transition-all hover:border-primary/40 hover:bg-card/80 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-secondary/15 dark:bg-muted text-primary-text flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge
                      variant="outline"
                      className="font-mono text-[11px] bg-background/80 text-muted-foreground"
                    >
                      {feature.badge}
                    </Badge>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-foreground">
                    {feature.title}
                  </h3>

                  <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-border/50 flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary-text shrink-0" />
                  <span>Strict zero-trust validation & tenant isolation</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
