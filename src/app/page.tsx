import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center flex-col gap-5">
      <h1 className="text-4xl font-bold tracking-tight">SME Finance Copilot</h1>
      <p className="text-muted-foreground text-center max-w-md">
        Financial Intelligence & SME Cash-Flow Copilot
      </p>
      <div className="flex items-center gap-3">
        <Link href="/sign-in" className={buttonVariants()}>
          Sign In
        </Link>
        <Link
          href="/sign-up"
          className={buttonVariants({ variant: "outline" })}
        >
          Sign Up
        </Link>
        <Link
          href="http://github.com/iamabraryeasir"
          className={buttonVariants({ variant: "ghost" })}
          target="_blank"
        >
          Developer <ArrowRight />
        </Link>
      </div>
    </div>
  );
}
