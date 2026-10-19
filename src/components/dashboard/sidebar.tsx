"use client";

import {
  Bot,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  Shield,
  SlidersHorizontal,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

// Custom SVG Icons matching design system assets in public/
function CashFlowIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <title>Cash Flow</title>
      <path
        d="M6.99982 9.33333V12.25M9.33334 8.16667V12.25M11.6669 5.83333V12.25M12.8336 1.75L7.78971 6.7935C7.76262 6.82066 7.73043 6.84221 7.69499 6.85691C7.65955 6.87162 7.62156 6.87919 7.5832 6.87919C7.54483 6.87919 7.50684 6.87162 7.4714 6.85691C7.43596 6.84221 7.40378 6.82066 7.37668 6.7935L5.45619 4.87317C5.40149 4.81849 5.32731 4.78777 5.24997 4.78777C5.17262 4.78777 5.09844 4.81849 5.04374 4.87317L1.16602 8.75M2.33278 10.5V12.25M4.6663 8.16667V12.25"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InvoicesIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 11 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <title>Invoices</title>
      <path
        d="M6.63255 0.799988H1.96635C1.65697 0.799988 1.36025 0.922916 1.14148 1.14173C0.922709 1.36054 0.799805 1.65731 0.799805 1.96675V11.3008C0.799805 11.6103 0.922709 11.907 1.14148 12.1259C1.36025 12.3447 1.65697 12.4676 1.96635 12.4676H8.96565C9.27504 12.4676 9.57176 12.3447 9.79053 12.1259C10.0093 11.907 10.1322 11.6103 10.1322 11.3008V4.30027M6.63255 0.799988C6.81719 0.79969 7.00006 0.835927 7.17064 0.906613C7.34122 0.977299 7.49613 1.08104 7.62645 1.21186L9.71924 3.30502C9.85039 3.43541 9.9544 3.5905 10.0253 3.76132C10.0962 3.93214 10.1325 4.11532 10.1322 4.30027M6.63255 0.799988V3.71689C6.63255 3.87161 6.69401 4.01999 6.80339 4.1294C6.91278 4.2388 7.06113 4.30027 7.21583 4.30027L10.1322 4.30027M4.29945 4.88365H3.1329M7.7991 7.21717H3.1329M7.7991 9.55069H3.1329"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AlertsIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <title>Risk Alerts</title>
      <path
        d="M5.98894 12.2505C6.09134 12.4278 6.23862 12.5751 6.41597 12.6775C6.59333 12.7799 6.79451 12.8338 6.99929 12.8338C7.20408 12.8338 7.40526 12.7799 7.58261 12.6775C7.75997 12.5751 7.90725 12.4278 8.00965 12.2505M1.90241 8.94036C1.8262 9.02389 1.77591 9.12776 1.75766 9.23935C1.7394 9.35094 1.75396 9.46543 1.79957 9.56889C1.84518 9.67235 1.91987 9.76033 2.01456 9.82212C2.10925 9.88391 2.21985 9.91685 2.33292 9.91694H11.6664C11.7795 9.91698 11.8901 9.88417 11.9849 9.82249C12.0796 9.76082 12.1544 9.67294 12.2001 9.56954C12.2459 9.46615 12.2606 9.35169 12.2425 9.24009C12.2244 9.12849 12.1742 9.02456 12.0981 8.94094C11.3223 8.14112 10.4998 7.29113 10.4998 4.66649C10.4998 3.73816 10.131 2.84784 9.47461 2.19141C8.81822 1.53498 7.92796 1.1662 6.99968 1.1662C6.07141 1.1662 5.18115 1.53498 4.52476 2.19141C3.86837 2.84784 3.49961 3.73816 3.49961 4.66649C3.49961 7.29113 2.67651 8.14112 1.90241 8.94036Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface SidebarProps {
  onNavClick?: () => void;
  isExpanded?: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
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
        title: "Cash Flow",
        href: "/forecast",
        icon: CashFlowIcon,
      },
      {
        title: "Invoices & Ledger",
        href: "/invoices",
        icon: InvoicesIcon,
      },
      {
        title: "Risk Alerts",
        href: "/alerts",
        icon: AlertsIcon,
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

export function DashboardSidebar({
  onNavClick,
  isExpanded = true,
  onMinimize,
}: SidebarProps) {
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
      .toUpperCase() || "RT";

  return (
    <aside className="flex h-full w-full flex-col justify-between bg-card text-foreground select-none overflow-x-hidden">
      {/* Top: Logo Brand Tile & Navigation */}
      <div className={cn("flex flex-col gap-4", isExpanded ? "p-4" : "p-2")}>
        {/* Brand Header */}
        <div
          className={cn(
            "flex items-center pb-2 border-b border-border/60 transition-all",
            isExpanded ? "justify-between" : "justify-center",
          )}
        >
          <Link
            href="/dashboard"
            onClick={onNavClick}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-85 min-w-0"
            title="CashPilot AI"
          >
            {/* Logo image from public/app_logo.svg */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 p-1">
              <Image
                src="/app_logo.svg"
                alt="CashPilot AI"
                width={24}
                height={16}
                className="h-5 w-auto object-contain"
              />
            </div>
            {isExpanded && (
              <div className="flex flex-col min-w-0">
                <span className="font-serif text-base font-bold tracking-tight text-foreground leading-none truncate">
                  CashPilot AI
                </span>
                <span className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
                  Financial Management
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Sidebar Minimize Button */}
          {isExpanded && onMinimize && (
            <button
              type="button"
              onClick={onMinimize}
              title="Minimize sidebar"
              aria-label="Minimize sidebar"
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Grouped Navigation */}
        <div className="flex flex-col gap-3">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              {isExpanded ? (
                <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 font-mono truncate">
                  {group.label}
                </p>
              ) : (
                <div className="h-px bg-border/40 my-1.5 mx-2" />
              )}
              <nav className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(item.href);

                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      onClick={onNavClick}
                      title={item.title}
                      className={cn(
                        "group flex items-center rounded-xl text-xs font-medium transition-all duration-150",
                        isExpanded
                          ? "justify-between px-3 py-2"
                          : "justify-center h-10 w-10 mx-auto",
                        active
                          ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            active
                              ? "text-primary-foreground"
                              : "text-muted-foreground group-hover:text-foreground",
                          )}
                        />
                        {isExpanded && (
                          <span className="truncate">{item.title}</span>
                        )}
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
              {isExpanded ? (
                <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 font-mono truncate">
                  Administration
                </p>
              ) : (
                <div className="h-px bg-border/40 my-1.5 mx-2" />
              )}
              <nav className="flex flex-col gap-1">
                <Link
                  href="/admin"
                  onClick={onNavClick}
                  title="Admin Console"
                  className={cn(
                    "flex items-center rounded-xl text-xs font-medium transition-colors",
                    isExpanded
                      ? "justify-between px-3 py-2"
                      : "justify-center h-10 w-10 mx-auto",
                    pathname === "/admin"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Shield className="h-4 w-4 shrink-0 text-current" />
                    {isExpanded && (
                      <span className="truncate">Admin Console</span>
                    )}
                  </div>
                </Link>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Workspace Switcher Card */}
      <div className={cn("border-t border-border", isExpanded ? "p-3" : "p-2")}>
        {isPending ? (
          <div
            className={cn(
              "flex items-center animate-pulse",
              isExpanded ? "gap-3 p-2" : "justify-center",
            )}
          >
            <div className="h-8 w-8 rounded-lg bg-muted" />
            {isExpanded && (
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="h-2 w-28 rounded bg-muted" />
              </div>
            )}
          </div>
        ) : isExpanded ? (
          <div className="flex items-center justify-between rounded-xl border border-border bg-[#F9F9F6] dark:bg-muted/40 p-2.5 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs ring-1 ring-primary/30">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground leading-tight">
                  {session?.user?.name || "Rahman Trading"}
                </p>
                <p className="truncate text-[10px] text-muted-foreground font-sans">
                  {session?.user?.role === "admin"
                    ? "Admin access"
                    : "Owner access"}
                </p>
              </div>
            </div>

            {/* Sign Out Button */}
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
        ) : (
          <div className="flex justify-center">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xs ring-1 ring-primary/30 cursor-pointer"
              title={`${session?.user?.name || "Rahman Trading"} (Owner access)`}
            >
              {userInitials}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
