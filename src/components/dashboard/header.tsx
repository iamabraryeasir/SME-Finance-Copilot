"use client";

import { Bot, ChevronRight, Menu, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
  "/audit": { group: "Governance", title: "Audit & Security" },
  "/settings": { group: "Configuration", title: "Financial Settings" },
  "/admin": { group: "System Monitoring", title: "Platform Overview" },
  "/admin/telemetry": {
    group: "System Monitoring",
    title: "AI & Token Telemetry",
  },
  "/admin/users": { group: "Tenancy & Directory", title: "Users & Tenants" },
  "/admin/audit": { group: "Platform Security", title: "Global Audit Stream" },
};

export function DashboardHeader({ onMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const isOnAdminRoute = pathname.startsWith("/admin");

  const currentRoute = routeTitles[pathname] || {
    group: isOnAdminRoute ? "Administration" : "Configuration",
    title: isOnAdminRoute ? "System Monitor & Security" : "Financial Settings",
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

      {/* Right: Role-specific tools, Notification Bell & User Avatar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {isOnAdminRoute ? (
          <Badge
            variant="outline"
            className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono border-primary/30 bg-primary/10 text-primary-text px-2 py-0.5"
          >
            <ShieldCheck className="h-3 w-3" />
            Security Monitor
          </Badge>
        ) : (
          <Link
            href="/copilot"
            className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-foreground/30 hover:bg-muted/40"
          >
            <Bot className="h-3.5 w-3.5 text-primary-text" />
            <span>AI Copilot</span>
          </Link>
        )}

        {/* User Avatar Circle (Display only, does nothing on click) */}
        <div className="flex items-center pl-2 sm:pl-3 border-l border-border/60">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary-text font-bold text-xs ring-1 ring-primary/40 select-none"
            title={session?.user?.name || "User"}
          >
            {userInitials}
          </div>
        </div>
      </div>
    </header>
  );
}
