"use client";

import { Bell, Bot, ChevronRight, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

interface HeaderProps {
  onMenuToggle?: () => void;
}

const routeTitles: Record<string, { group: string; title: string }> = {
  "/dashboard": { group: "Operations", title: "Dashboard Overview" },
  "/invoices": { group: "Operations", title: "Invoices & Ledger" },
  "/forecast": { group: "Operations", title: "Cash-Flow Forecast" },
  "/alerts": { group: "Operations", title: "Risk Alerts" },
  "/copilot": { group: "Intelligence", title: "AI Copilot" },
  "/settings": { group: "Configuration", title: "Financial Settings" },
  "/admin": { group: "Administration", title: "Admin Console" },
};

export function DashboardHeader({ onMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();

  const currentRoute = routeTitles[pathname] || {
    group: "Configuration",
    title: "Financial Settings",
  };

  const userInitials =
    session?.user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "CP";

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border/80 bg-card/90 px-4 sm:px-6 backdrop-blur-md">
      {/* Left: Mobile Toggle & Exact Navigation Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="lg:hidden h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label="Toggle navigation"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Corporate Breadcrumb matching exact sidebar nav */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-medium text-muted-foreground">CashPilot</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="text-muted-foreground">{currentRoute.group}</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="font-semibold text-foreground tracking-tight">
            {currentRoute.title}
          </span>
        </div>
      </div>

      {/* Right: Copilot Link, Notification Bell & User Avatar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Link to Copilot Button */}
        <Link
          href="/copilot"
          className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-foreground/30 hover:bg-muted/40"
        >
          <Bot className="h-3.5 w-3.5 text-primary-text" />
          <span>AI Copilot</span>
        </Link>

        {/* Notification Bell */}
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-background/60 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
          aria-label="View notifications"
        >
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>

        {/* User Avatar Circle */}
        <div className="flex items-center pl-3 border-l border-border/60">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary-text font-bold text-xs ring-1 ring-primary/40">
            {userInitials}
          </div>
        </div>
      </div>
    </header>
  );
}
