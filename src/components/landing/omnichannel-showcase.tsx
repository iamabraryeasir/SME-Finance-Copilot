"use client";

import { CheckCircle2, FileText, Monitor, Smartphone } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";

export function LandingOmnichannelShowcase() {
  return (
    <section id="omnichannel" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge
            variant="outline"
            className="mb-3 px-3 py-1 font-mono text-xs bg-primary/10 text-primary-text border-primary/20"
          >
            Omni-Channel
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            One Single Ledger. Two Native Frontends.
          </h2>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            Snap invoice receipts on Telegram during lunch or review your cash
            runway on your desktop console. Both surfaces share the exact same
            database, calculation engine, and agent state in real time.
          </p>
        </div>

        {/* 2 Clean Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Card 1: Telegram Mobile */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-border/70 bg-card/50 p-6 sm:p-7 backdrop-blur-xs flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">
                      Telegram Bot
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      Mobile Ingestion & Inquiries
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  @CashPilotAIBot
                </Badge>
              </div>

              {/* Simplified conversation snippet */}
              <div className="rounded-xl border border-border/60 bg-background/60 p-4 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground border-b border-border/40 pb-2">
                  <FileText className="h-3.5 w-3.5 text-primary-text" />
                  <span>Photo receipt uploaded: INV-2026-08</span>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">
                    CashPilot Bot:
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Extracted <strong>৳120,000.00</strong> from Apex Textiles
                    due Oct 28. Reconciled into your 30-day runway projection.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary-text shrink-0" />
              <span>Zero-lag webhook synchronization</span>
            </div>
          </motion.div>

          {/* Card 2: Web Management Console */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-border/70 bg-card/50 p-6 sm:p-7 backdrop-blur-xs flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary-text flex items-center justify-center">
                    <Monitor className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">
                      Web Dashboard
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      Deep Runway Intelligence & Approvals
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  Desktop & Tablet
                </Badge>
              </div>

              {/* Simplified console snippet */}
              <div className="rounded-xl border border-border/60 bg-background/60 p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">
                    Active Action Item:
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/20"
                  >
                    Awaiting Approval
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">
                    Reminder Draft: Rahim Retailers (৳60k)
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Polite reminder draft generated. 1-click &ldquo;Approve &
                    Send&rdquo; to notify counterparty.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary-text shrink-0" />
              <span>Full audit trail & state machine isolation</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
