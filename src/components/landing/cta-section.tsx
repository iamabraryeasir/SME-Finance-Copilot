"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function LandingCtaSection() {
  const { data: session, isPending } = authClient.useSession();
  const isLoggedIn = Boolean(session?.user);
  const targetConsoleUrl =
    session?.user?.role === "admin" ? "/admin" : "/dashboard";

  return (
    <section className="py-20 md:py-24 relative overflow-hidden">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl border border-border/80 bg-card/60 p-8 sm:p-12 text-center shadow-lg backdrop-blur-md overflow-hidden">
          {/* Subtle ambient light */}
          <div
            className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-120 -translate-x-1/2 rounded-full opacity-20 blur-3xl"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(200, 252, 88, 0.5) 0%, rgba(14, 75, 47, 0.2) 60%, transparent 80%)",
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl mx-auto space-y-5"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-semibold text-foreground">
              <Image
                src="/app_fill_logo.svg"
                alt="CashPilot"
                width={14}
                height={14}
                className="h-3.5 w-3.5 object-contain"
              />
              Start in Under 2 Minutes
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              Ready to Know Your Real Cash Runway?
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              No complicated accounting onboarding. Connect your receipts, track
              your 30-day balance, and let CashPilot AI monitor cash velocity.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              {isPending ? (
                <div className="h-12 w-44 rounded-xl bg-muted/60 animate-pulse" />
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
                <>
                  <Link href="/sign-in" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto h-12 px-7 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-2 cursor-pointer"
                    >
                      Login
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>

                  <Link href="/sign-up" className="w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto h-12 px-7 text-sm font-semibold border-border hover:bg-muted/60 cursor-pointer"
                    >
                      Get Started Free
                    </Button>
                  </Link>
                </>
              )}
            </div>

            <div className="pt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary-text" /> Free
                tier available
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary-text" /> No
                credit card required
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
