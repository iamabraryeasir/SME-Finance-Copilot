import type { Metadata } from "next";
import { LandingBentoFeatures } from "@/components/landing/bento-features";
import { LandingComparisonTable } from "@/components/landing/comparison-table";
import { LandingCtaSection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/footer";
import { LandingHero } from "@/components/landing/hero-section";
import { LandingMetricsTicker } from "@/components/landing/metrics-ticker";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingOmnichannelShowcase } from "@/components/landing/omnichannel-showcase";
import { LandingTechStackSecurity } from "@/components/landing/tech-stack-security";

export const metadata: Metadata = {
  title:
    "CashPilot AI — Autonomous SME Cash-Flow Intelligence & Runway Copilot",
  description:
    "Deterministic 30-day runway forecasting, zero-effort invoice ingestion, and human-in-the-loop payment workflows for forward-thinking SMEs.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground">
      {/* Sticky Glassmorphic Header */}
      <LandingNavbar />

      <main className="flex-1">
        {/* Hero Section & Live Visual Cockpit */}
        <LandingHero />

        {/* High-Density Proof Metrics Ticker */}
        <LandingMetricsTicker />

        {/* Bento Grid: Core Autonomous Pillars */}
        <LandingBentoFeatures />

        {/* Synchronous Omni-Channel Showcase (Telegram + Web) */}
        <LandingOmnichannelShowcase />

        {/* Legacy Spreadsheets vs. CashPilot AI Matrix */}
        <LandingComparisonTable />

        {/* Bank-Grade Security & Technology Stack */}
        <LandingTechStackSecurity />

        {/* High-Impact Final Conversion Funnel */}
        <LandingCtaSection />
      </main>

      {/* Editorial Fintech Footer */}
      <LandingFooter />
    </div>
  );
}
