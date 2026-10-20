import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/toaster";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CashPilot AI - SME Financial Intelligence",
  description:
    "Agentic AI for SME Financial Management & Liquidity Command Center",
  icons: {
    icon: [
      { url: "/app_fill_logo.svg", type: "image/svg+xml" },
      { url: "/app_fill_logo.svg", sizes: "any" },
    ],
    shortcut: "/app_fill_logo.svg",
    apple: "/app_fill_logo.svg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
      )}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
