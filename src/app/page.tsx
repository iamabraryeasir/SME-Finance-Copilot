import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center flex-col gap-5">
      <h1 className="text-4xl">SME Finance Copilot</h1>
      <Link
        href="http://github.com/iamabraryeasir"
        className={buttonVariants()}
        target="_blank"
      >
        Developer <ArrowRight />
      </Link>
    </div>
  );
}
