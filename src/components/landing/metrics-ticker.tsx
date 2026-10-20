"use client";

import { Calculator, Calendar, Clock, Lock } from "lucide-react";
import { motion } from "motion/react";

const metrics = [
  {
    icon: Calculator,
    value: "৳0.00",
    label: "LLM Arithmetic",
    description:
      "Calculations run through verified deterministic engines, never generative hallucinations.",
  },
  {
    icon: Calendar,
    value: "30 Days",
    label: "Rolling Horizon",
    description:
      "Continuous cash runway projection based on real invoice due dates and fixed overhead.",
  },
  {
    icon: Clock,
    value: "< 2.8s",
    label: "Invoice Ingestion",
    description:
      "Instant PDF and CSV bill extraction with strict runtime Zod schema validation.",
  },
  {
    icon: Lock,
    value: "100%",
    label: "Human Approval",
    description:
      "Payment reminders and external actions always require explicit operator sign-off.",
  },
];

export function LandingMetricsTicker() {
  return (
    <section className="border-y border-border/60 bg-muted/20 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary-text">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
                    {item.value}
                  </span>
                </div>
                <p className="text-xs font-semibold text-foreground">
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
