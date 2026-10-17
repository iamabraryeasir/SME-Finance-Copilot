"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/40 text-foreground">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col z-40">
        <DashboardSidebar />
      </div>

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
              <DashboardSidebar onNavClick={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-64 min-w-0">
        <DashboardHeader onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
