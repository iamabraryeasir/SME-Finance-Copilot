"use client";

import {
  ArrowRight,
  ChevronRight,
  LineChart,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function LandingHero() {
  const { data: session, isPending } = authClient.useSession();
  const isLoggedIn = Boolean(session?.user);
  const targetConsoleUrl =
    session?.user?.role === "admin" ? "/admin" : "/dashboard";
  return (
    <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24">
      {/* Subtle ambient background glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-130 w-200 -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(200, 252, 88, 0.45) 0%, rgba(14, 75, 47, 0.15) 50%, transparent 80%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Top Tagline Pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3.5 py-1 text-xs font-medium text-foreground backdrop-blur-md shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-primary" />
            <span className="text-muted-foreground font-mono text-[11px]">
              CashPilot AI 2.0
            </span>
            <span className="text-border">|</span>
            <span className="text-foreground">
              Deterministic SME Cash Copilot
            </span>
          </div>
        </motion.div>

        {/* Hero Title & Subheading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 text-center max-w-3xl mx-auto"
        >
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            Know Your Runway.{" "}
            <span className="bg-linear-to-r from-secondary via-emerald-600 to-primary-text bg-clip-text text-transparent dark:from-primary dark:via-emerald-300 dark:to-lime-200">
              Never Run Out of Cash.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto font-normal leading-relaxed">
            Eliminate mental arithmetic and messy spreadsheets. CashPilot AI
            continuously projects your 30-day cash position from real invoices,
            alerts you before deficits occur, and automates payment follow-ups.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            {isPending ? (
              <div className="h-12 w-40 rounded-xl bg-muted/60 animate-pulse" />
            ) : isLoggedIn ? (
              <Link href={targetConsoleUrl} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-12 px-7 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-2 cursor-pointer"
                >
                  Console
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href="/sign-in" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-12 px-7 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-2 cursor-pointer"
                >
                  Login
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}

            <a href="#features" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-12 px-7 text-sm font-semibold border-border hover:bg-muted/60 gap-1.5 cursor-pointer"
              >
                Explore Capabilities
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </a>
          </div>

          {/* Key Value Badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary-text" /> 100%
              Deterministic Math
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary-text" /> Multi-Modal
              Invoice OCR
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary-text" /> Telegram Bot
              Sync
            </span>
          </div>
        </motion.div>

        {/* Clean, Refined Product Preview */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12 max-w-5xl mx-auto"
        >
          <div className="rounded-2xl border border-border/80 bg-card/70 p-4 sm:p-6 backdrop-blur-xl shadow-xl">
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <Image
                    src="/app_fill_logo.svg"
                    alt="CashPilot"
                    width={18}
                    height={18}
                    className="h-4 w-4 object-contain"
                  />
                  <span className="text-xs font-semibold text-foreground">
                    Cash Runway Overview
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="font-mono text-[11px] bg-primary/10 text-primary-text border-primary/20"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse mr-1.5" />
                  Live Reconciled
                </Badge>
              </div>
            </div>

            {/* 3 Clean Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                <span className="text-xs text-muted-foreground font-medium">
                  Current Balance
                </span>
                <p className="text-2xl font-bold font-mono tracking-tight text-foreground mt-1">
                  ৳1,480,000
                </p>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-3 w-3" /> Reconciled with bank
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                <span className="text-xs text-muted-foreground font-medium">
                  30-Day Inflows (Receivables)
                </span>
                <p className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
                  +৳940,000
                </p>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
                  12 verified invoices
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                <span className="text-xs text-muted-foreground font-medium">
                  30-Day Outflows (Payables)
                </span>
                <p className="text-2xl font-bold font-mono tracking-tight text-destructive mt-1">
                  -৳620,000
                </p>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
                  <TrendingDown className="h-3 w-3 text-destructive" /> Supplier
                  & rent due
                </div>
              </div>
            </div>

            {/* Clean Runway Projection Chart */}
            <div className="rounded-xl border border-border/60 bg-background/60 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <LineChart className="h-4 w-4 text-primary-text" />
                  <span className="text-xs sm:text-sm font-semibold text-foreground">
                    Continuous 30-Day Cash Trajectory
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-muted-foreground">
                    Safety Reserve:{" "}
                    <strong className="text-foreground">৳300,000</strong>
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Net Surplus: +৳320,000
                  </span>
                </div>
              </div>

              {/* Minimal SVG Graphic */}
              <div className="relative h-44 w-full">
                <svg
                  viewBox="0 0 600 150"
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label="30-Day Continuous Cash Runway Projection"
                >
                  <defs>
                    <linearGradient
                      id="cleanChartGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="rgb(200, 252, 88)"
                        stopOpacity="0.35"
                      />
                      <stop
                        offset="100%"
                        stopColor="transparent"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>

                  {/* Safety Line */}
                  <line
                    x1="0"
                    y1="105"
                    x2="600"
                    y2="105"
                    stroke="rgba(255, 91, 55, 0.4)"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />
                  <text
                    x="8"
                    y="100"
                    fill="rgba(255, 91, 55, 0.85)"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    Safety Reserve (৳300k)
                  </text>

                  {/* Area */}
                  <path
                    d="M 0,65 Q 90,45 150,75 T 300,35 T 450,85 T 600,20 L 600,150 L 0,150 Z"
                    fill="url(#cleanChartGrad)"
                  />

                  {/* Stroke */}
                  <path
                    d="M 0,65 Q 90,45 150,75 T 300,35 T 450,85 T 600,20"
                    fill="none"
                    stroke="rgb(14, 75, 47)"
                    strokeWidth="2.5"
                    className="dark:stroke-[#c8fc58]"
                  />

                  {/* Key Points */}
                  <circle
                    cx="150"
                    cy="75"
                    r="4"
                    fill="#c8fc58"
                    stroke="#0e4b2f"
                    strokeWidth="2"
                  />
                  <circle
                    cx="300"
                    cy="35"
                    r="4"
                    fill="#c8fc58"
                    stroke="#0e4b2f"
                    strokeWidth="2"
                  />
                  <circle
                    cx="450"
                    cy="85"
                    r="4"
                    fill="#ff5b37"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <circle
                    cx="600"
                    cy="20"
                    r="4"
                    fill="#c8fc58"
                    stroke="#0e4b2f"
                    strokeWidth="2"
                  />
                </svg>

                {/* Day 30 Tag */}
                <div className="absolute top-2 right-4 rounded-lg bg-card border border-border px-2.5 py-1 text-xs font-mono shadow-xs">
                  Day 30:{" "}
                  <span className="font-bold text-foreground">৳1,800,000</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
