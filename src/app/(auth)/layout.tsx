import { ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-background text-foreground overflow-x-hidden selection:bg-primary/30 selection:text-foreground">
      {/* Background ambient decorative glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden">
        <div className="h-180 w-180 rounded-full bg-primary/10 blur-[130px] dark:bg-primary/15" />
      </div>

      {/* Top Header */}
      <header className="p-4 sm:p-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border shadow-2xs group-hover:border-foreground/30 transition-colors p-1.5">
            <Image
              src="/app_logo.svg"
              alt="CashPilot AI Logo"
              width={26}
              height={18}
              priority
              className="h-5 w-auto object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-foreground leading-none">
              CashPilot AI
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono mt-0.5">
              Financial Intelligence
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground font-mono shadow-2xs backdrop-blur-xs">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">
            Encrypted Ledger &bull; Strict Tenant Isolation
          </span>
          <span className="sm:hidden">Encrypted</span>
        </div>
      </header>

      {/* Center Main Form */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 w-full max-w-md mx-auto my-auto">
        {children}
      </main>

      {/* Footer */}
      <footer className="p-4 sm:p-6 text-center text-xs text-muted-foreground border-t border-border/50 font-mono">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          <span>&copy; 2026 CashPilot AI</span>
          <span className="hidden sm:inline">&bull;</span>
          <span>Deterministic Financial Copilot for Growing SMEs</span>
          <span className="hidden sm:inline">&bull;</span>
          <span className="text-emerald-600 dark:text-emerald-400">
            Zero Hallucination Arithmetic
          </span>
        </div>
      </footer>
    </div>
  );
}
