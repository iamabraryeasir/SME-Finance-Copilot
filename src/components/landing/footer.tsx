"use client";

import { ArrowUpRight, Code2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/80 bg-background/95 pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Footer Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-12 border-b border-border/60">
          {/* Brand Info (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden shadow-2xs">
                <Image
                  src="/app_fill_logo.svg"
                  alt="CashPilot AI Logo"
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
                />
              </div>
              <span className="font-bold text-base tracking-tight text-foreground flex items-center gap-1.5">
                CashPilot{" "}
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary-text font-mono font-medium">
                  AI
                </span>
              </span>
            </Link>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              The autonomous agentic financial copilot engineered for SME
              cash-flow management. Deterministic forecasting, multimodal
              invoice ingestion, and strict human-in-the-loop governance.
            </p>

            {/* Operational Status Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-mono text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-foreground">
                All Systems Operational
              </span>
              <span className="text-border">&bull;</span>
              <span>Gemini 3.5 Flash Active</span>
            </div>
          </div>

          {/* Nav Column 1 (2 cols) */}
          <div className="md:col-span-2 space-y-3">
            <p className="text-xs font-semibold text-foreground tracking-wider uppercase">
              Platform
            </p>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-foreground transition-colors"
                >
                  Overview Console
                </Link>
              </li>
              <li>
                <Link
                  href="/forecast"
                  className="hover:text-foreground transition-colors"
                >
                  Runway Forecast
                </Link>
              </li>
              <li>
                <Link
                  href="/invoices"
                  className="hover:text-foreground transition-colors"
                >
                  AR/AP Ledger
                </Link>
              </li>
              <li>
                <Link
                  href="/copilot"
                  className="hover:text-foreground transition-colors"
                >
                  AI Financial Chat
                </Link>
              </li>
              <li>
                <Link
                  href="/alerts"
                  className="hover:text-foreground transition-colors"
                >
                  Deficit Alerts
                </Link>
              </li>
            </ul>
          </div>

          {/* Nav Column 2 (2 cols) */}
          <div className="md:col-span-2 space-y-3">
            <p className="text-xs font-semibold text-foreground tracking-wider uppercase">
              Architecture
            </p>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <a
                  href="#features"
                  className="hover:text-foreground transition-colors"
                >
                  Deterministic Core
                </a>
              </li>
              <li>
                <a
                  href="#omnichannel"
                  className="hover:text-foreground transition-colors"
                >
                  Telegram Bot Sync
                </a>
              </li>
              <li>
                <a
                  href="#security"
                  className="hover:text-foreground transition-colors"
                >
                  Zero-Trust Zod
                </a>
              </li>
              <li>
                <Link
                  href="/admin/telemetry"
                  className="hover:text-foreground transition-colors"
                >
                  System Telemetry
                </Link>
              </li>
            </ul>
          </div>

          {/* Nav Column 3 (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <p className="text-xs font-semibold text-foreground tracking-wider uppercase">
              Technology Stack
            </p>
            <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                Next.js 16
              </span>
              <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                Bun Runtime
              </span>
              <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                Prisma 7
              </span>
              <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                PostgreSQL Supabase
              </span>
              <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                LangGraph.js
              </span>
              <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                Upstash Redis
              </span>
              <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                Inngest
              </span>
            </div>
            <div className="pt-2">
              <a
                href="https://github.com/iamabraryeasir"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                <Code2 className="h-3.5 w-3.5 text-primary-text" />
                Designed & Built by Abrar Yeasir
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>
            &copy; 2026 CashPilot AI. Enterprise Agentic Financial
            Infrastructure.
          </p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1 text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5 text-primary-text" /> 100%
              Deterministic Financial Safety
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
