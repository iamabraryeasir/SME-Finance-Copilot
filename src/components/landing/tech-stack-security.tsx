"use client";

import { Database, Lock, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";

const securityPillars = [
  {
    icon: ShieldCheck,
    title: "100% Deterministic Engine",
    description:
      "All balances, runway projections, and aggregations run via verified code and database queries. AI models never perform arithmetic.",
  },
  {
    icon: Database,
    title: "Sovereign Tenant Isolation",
    description:
      "Every query and transaction strictly scopes to your verified organization id. No unqualified reads or cross-tenant exposure.",
  },
  {
    icon: Lock,
    title: "Human-In-The-Loop Sign-Off",
    description:
      "Customer payment reminders and financial mutations require explicit human approval before any external action executes.",
  },
];

export function LandingTechStackSecurity() {
  return (
    <section id="security" className="py-16 md:py-24 border-t border-border/70">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge
            variant="outline"
            className="mb-3 px-3 py-1 font-mono text-xs bg-primary/10 text-primary-text border-primary/20"
          >
            Security & Governance
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Bank-Grade Architectural Safety.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Engineered from day one with strict zero-trust ingestion and
            deterministic safeguards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {securityPillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="rounded-2xl border border-border/70 bg-card/40 p-6 backdrop-blur-xs text-left space-y-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary-text">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">
                  {pillar.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {pillar.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
