"use client";

import { useEffect, useState } from "react";
import { CopilotChat } from "@/components/dashboard/copilot-chat";

interface ProfileData {
  companyName?: string;
  currency?: string;
}

export default function CopilotPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        const json = await res.json();
        if (res.ok && json.success) {
          setProfile(json.data?.profile ?? json.profile);
        }
      } catch {
        // Fallback to defaults
      }
    }
    loadProfile();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Financial Copilot
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Multi-turn agentic advisor with deterministic calculation engines,
          30-day runway analysis, and Human-in-the-Loop action planning.
        </p>
      </div>

      <CopilotChat
        companyName={profile?.companyName}
        currency={profile?.currency}
      />
    </div>
  );
}
