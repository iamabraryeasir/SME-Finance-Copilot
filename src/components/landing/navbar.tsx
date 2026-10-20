"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();

  const isLoggedIn = Boolean(session?.user);
  const targetConsoleUrl =
    session?.user?.role === "admin" ? "/admin" : "/dashboard";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden shadow-2xs transition-transform group-hover:scale-105">
            <Image
              src="/app_fill_logo.svg"
              alt="CashPilot AI Logo"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight leading-none text-foreground flex items-center gap-1.5">
              CashPilot{" "}
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary-text font-mono font-medium">
                AI
              </span>
            </span>
            <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase mt-0.5">
              Autonomous SME Copilot
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a
            href="#features"
            className="transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#omnichannel"
            className="transition-colors hover:text-foreground"
          >
            Omni-Channel
          </a>
          <a
            href="#comparison"
            className="transition-colors hover:text-foreground"
          >
            Why CashPilot
          </a>
          <a
            href="#security"
            className="transition-colors hover:text-foreground"
          >
            Security & Tech
          </a>
        </nav>

        {/* Action Buttons: Console if logged in, Login if not */}
        <div className="hidden sm:flex items-center gap-3">
          {isPending ? (
            <div className="h-8 w-24 rounded-md bg-muted/60 animate-pulse" />
          ) : isLoggedIn ? (
            <Link href={targetConsoleUrl}>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm shadow-sm gap-1.5 transition-all hover:gap-2 cursor-pointer"
              >
                Console
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Link href="/sign-in">
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm shadow-sm gap-1.5 transition-all hover:gap-2 cursor-pointer"
              >
                Login
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex sm:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-border bg-background/95 px-4 pt-3 pb-6 space-y-3">
          <nav className="flex flex-col space-y-3 text-sm font-medium">
            <Link
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="text-muted-foreground hover:text-foreground py-1"
            >
              Features
            </Link>
            <Link
              href="#omnichannel"
              onClick={() => setMobileMenuOpen(false)}
              className="text-muted-foreground hover:text-foreground py-1"
            >
              Omni-Channel
            </Link>
            <Link
              href="#comparison"
              onClick={() => setMobileMenuOpen(false)}
              className="text-muted-foreground hover:text-foreground py-1"
            >
              Why CashPilot
            </Link>
            <Link
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="text-muted-foreground hover:text-foreground py-1"
            >
              Security
            </Link>
          </nav>
          <div className="pt-3 border-t border-border flex flex-col gap-2">
            {isLoggedIn ? (
              <Link
                href={targetConsoleUrl}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full"
              >
                <Button className="w-full bg-primary text-primary-foreground gap-1.5 cursor-pointer">
                  Console <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link
                href="/sign-in"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full"
              >
                <Button className="w-full bg-primary text-primary-foreground gap-1.5 cursor-pointer">
                  Login <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
