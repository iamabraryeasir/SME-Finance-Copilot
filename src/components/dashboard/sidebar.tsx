"use client";

import {
  AlertTriangle,
  Bot,
  FileText,
  LayoutDashboard,
  LogOut,
  Receipt,
  Shield,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onNavClick?: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Operations",
    items: [
      {
        title: "Dashboard Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Invoices & Ledger",
        href: "/invoices",
        icon: FileText,
      },
      {
        title: "Cash-Flow Forecast",
        href: "/forecast",
        icon: TrendingUp,
      },
      {
        title: "Risk Alerts",
        href: "/alerts",
        icon: AlertTriangle,
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        title: "AI Copilot",
        href: "/copilot",
        icon: Bot,
      },
    ],
  },
  {
    label: "Configuration",
    items: [
      {
        title: "Financial Settings",
        href: "/settings",
        icon: SlidersHorizontal,
      },
    ],
  },
];

export function DashboardSidebar({ onNavClick }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const isItemActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success("Signed out successfully");
            router.push("/sign-in");
            router.refresh();
          },
        },
      });
    } catch {
      toast.error("Failed to sign out");
    }
  };

  const userInitials =
    session?.user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "CP";

  return (
    <aside className="flex h-full w-full flex-col justify-between border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Top: Enterprise Workspace Switcher & Navigation */}
      <div className="flex flex-col gap-6 p-4">
        {/* Workspace Brand Tile */}
        <div className="flex items-center gap-2.5 rounded-lg border border-sidebar-border/80 bg-card p-2.5 shadow-2xs">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold shadow-xs">
            <Receipt className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate text-xs font-bold tracking-tight text-foreground">
              CashPilot AI
            </span>
            <span className="truncate text-[0.65rem] text-muted-foreground font-mono">
              Enterprise SME Suite
            </span>
          </div>
        </div>

        {/* Grouped Navigation */}
        <div className="flex flex-col gap-5">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-2 pb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                {group.label}
              </p>
              <nav className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(item.href);

                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      onClick={onNavClick}
                      className={cn(
                        "group flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs"
                          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            active
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground",
                          )}
                        />
                        <span>{item.title}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}

          {/* Admin Role Section */}
          {session?.user?.role === "admin" && (
            <div className="space-y-1">
              <p className="px-2 pb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                Administration
              </p>
              <nav className="flex flex-col gap-0.5">
                <Link
                  href="/admin"
                  onClick={onNavClick}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                    pathname === "/admin"
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                  )}
                >
                  <Shield className="h-4 w-4 shrink-0 text-primary" />
                  <span>Admin Console</span>
                </Link>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Unified Enterprise User Tile */}
      <div className="border-t border-sidebar-border p-3">
        {isPending ? (
          <div className="flex items-center gap-3 animate-pulse p-2">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="h-2 w-28 rounded bg-muted" />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-sidebar-border/80 bg-card p-2 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[0.7rem] ring-1 ring-primary/20">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {session?.user?.name || "Operator"}
                  </p>
                  <span className="rounded bg-muted px-1 py-0.2 text-[0.55rem] font-bold uppercase text-muted-foreground">
                    {session?.user?.role || "User"}
                  </span>
                </div>
                <p className="truncate text-[0.65rem] text-muted-foreground font-mono">
                  {session?.user?.email || "Signed in"}
                </p>
              </div>
            </div>

            {/* Seamless Inline Sign Out Button */}
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign Out"
              aria-label="Sign out of account"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
