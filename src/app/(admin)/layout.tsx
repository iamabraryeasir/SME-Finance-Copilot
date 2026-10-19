"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { cn } from "@/lib/utils";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isManuallyClosed, setIsManuallyClosed] = useState(false);

  // Closed by default: shows icon-only rail (w-16)
  // On hover: expands to full sidebar (w-64)
  const isExpanded = isHovered && !isManuallyClosed;

  const handleMinimize = () => {
    setIsManuallyClosed(true);
    setIsHovered(false);
  };

  const handleMouseEnter = () => {
    setIsManuallyClosed(false);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsManuallyClosed(false);
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col">
      {/* Desktop Persistent Sidebar (Icon rail by default, expands to full on hover) */}
      <aside
        aria-label="Sidebar navigation"
        className={cn(
          "hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
          isExpanded ? "w-64 shadow-2xl" : "w-16 shadow-none",
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <DashboardSidebar isExpanded={isExpanded} onMinimize={handleMinimize} />
      </aside>

      {/* Mobile Slide-over Drawer */}
      {mobileMenuOpen && (
        <div
          className="relative z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close navigation drawer"
            className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity w-full h-full border-0 cursor-default"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute top-3 right-3 z-10">
                <button
                  type="button"
                  aria-label="Close navigation"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground shadow-xs"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <DashboardSidebar
                isExpanded={true}
                onNavClick={() => setMobileMenuOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area: Identical responsive margins as User Dashboard layout */}
      <div
        className={cn(
          "flex flex-1 flex-col min-w-0 transition-all duration-300 ease-in-out",
          isExpanded ? "lg:pl-64" : "lg:pl-16",
        )}
      >
        <DashboardHeader onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full">{children}</main>
      </div>
    </div>
  );
}
