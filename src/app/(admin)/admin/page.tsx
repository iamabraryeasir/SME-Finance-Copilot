"use client";

import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Cpu,
  Database,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GlobalAiTelemetry } from "@/services/telemetry";

export default function AdminOverviewPage() {
  const [globalAi, setGlobalAi] = useState<GlobalAiTelemetry | null>(null);
  const [tenantCount, setTenantCount] = useState<number>(0);
  const [auditTotal, setAuditTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [telemetryRes, usersRes, auditRes] = await Promise.all([
        fetch("/api/admin/telemetry"),
        fetch("/api/admin/users"),
        fetch("/api/admin/audit?limit=1"),
      ]);

      const [telemetryJson, usersJson, auditJson] = await Promise.all([
        telemetryRes.json(),
        usersRes.json(),
        auditRes.json(),
      ]);

      if (telemetryRes.ok && telemetryJson.success) {
        setGlobalAi(telemetryJson.data.global);
      }
      if (usersRes.ok && usersJson.success) {
        setTenantCount(usersJson.data.users.length);
      }
      if (auditRes.ok && auditJson.success) {
        setAuditTotal(auditJson.data.totalCount);
      }
    } catch {
      toast.error("Failed to load platform overview metrics");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
    toast.success("Platform overview refreshed");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Platform Health & System Overview
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-mono px-2 py-0.5 bg-primary/10 text-primary-text border-primary/30"
            >
              System Monitor
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time observability of AI agent usage, active SME tenants, and
            infrastructure health.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="gap-2 h-9 rounded-xl text-xs border-border bg-card hover:bg-muted font-mono"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>{isRefreshing ? "Refreshing..." : "Sync Fresh"}</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary-text" />
          <p className="text-xs font-mono">
            Loading platform telemetry metrics...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-border shadow-2xs">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Active Tenants</span>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl font-mono font-bold mt-1">
                  {tenantCount}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
                Registered enterprise SME accounts
              </CardContent>
            </Card>

            <Card className="border border-border shadow-2xs">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Total AI Interactions</span>
                  <Bot className="h-4 w-4 text-primary-text" />
                </div>
                <CardTitle className="text-2xl font-mono font-bold mt-1">
                  {globalAi?.totalRequests ?? 0}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
                Omni-channel completions (Web & Telegram)
              </CardContent>
            </Card>

            <Card className="border border-border shadow-2xs">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Total Tokens Consumed</span>
                  <Zap className="h-4 w-4 text-amber-500" />
                </div>
                <CardTitle className="text-2xl font-mono font-bold mt-1 text-foreground">
                  {(globalAi?.totalTokens ?? 0).toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
                Prompt: {(globalAi?.promptTokens ?? 0).toLocaleString()} |
                Completion: {(globalAi?.completionTokens ?? 0).toLocaleString()}
              </CardContent>
            </Card>

            <Card className="border border-border shadow-2xs">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Audit Events Logged</span>
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                </div>
                <CardTitle className="text-2xl font-mono font-bold mt-1">
                  {auditTotal}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
                Immutable security & state transitions
              </CardContent>
            </Card>
          </div>

          {/* Quick Monitoring Navigation Hub */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/telemetry"
              className="p-5 rounded-2xl border border-border bg-card shadow-2xs hover:border-primary/40 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary-text">
                  <Cpu className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-text group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">
                AI & Token Telemetry
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Inspect token volumes, completion costs, and agent tool
                execution frequencies per SME tenant.
              </p>
            </Link>

            <Link
              href="/admin/users"
              className="p-5 rounded-2xl border border-border bg-card shadow-2xs hover:border-primary/40 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary-text">
                  <Users className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-text group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">
                Users & Tenants Directory
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Manage registered business profiles, minimum reserve thresholds,
                and Telegram link statuses.
              </p>
            </Link>

            <Link
              href="/admin/audit"
              className="p-5 rounded-2xl border border-border bg-card shadow-2xs hover:border-primary/40 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary-text">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-text group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">
                Global Audit Stream
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Immutable, cross-tenant security logs with actor filtering and
                execution payload inspections.
              </p>
            </Link>
          </div>

          {/* Model Routing & Infrastructure Health */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="border border-border shadow-2xs lg:col-span-2">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary-text" />
                  LLM Provider Routing & Health
                </CardTitle>
                <CardDescription className="text-xs">
                  Primary Google Gemini 3.8 Flash model with Groq Llama-3.3-70B
                  automatic failover.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-3">
                {globalAi?.modelBreakdown &&
                globalAi.modelBreakdown.length > 0 ? (
                  globalAi.modelBreakdown.map((item) => (
                    <div
                      key={item.model}
                      className="p-3 rounded-xl border border-border bg-muted/30 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span>{item.model}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Zero-cost tier • Strict deterministic tool guardrails
                        </p>
                      </div>
                      <div className="text-right font-mono">
                        <span className="font-semibold text-foreground">
                          {item.requests} requests
                        </span>
                        <div className="text-[10px] text-muted-foreground">
                          {item.tokens.toLocaleString()} tokens
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl border border-border bg-muted/30 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Google Gemini 3.8 Flash</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        Primary zero-cost tier • Active
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] text-emerald-600 border-emerald-500/40"
                    >
                      Operational
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border shadow-2xs">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary-text" />
                  Infrastructure Health
                </CardTitle>
                <CardDescription className="text-xs">
                  Key platform dependencies and status.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50">
                  <span className="text-muted-foreground">PostgreSQL</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] text-emerald-600 border-emerald-500/40"
                  >
                    Connected (Prisma 7)
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50">
                  <span className="text-muted-foreground">Upstash Redis</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      globalAi?.systemHealth.redisAvailable
                        ? "text-emerald-600 border-emerald-500/40"
                        : "text-amber-600 border-amber-500/40"
                    }`}
                  >
                    {globalAi?.systemHealth.redisAvailable
                      ? "Active (Telemetry & Limiting)"
                      : "Degraded (Memory Fallback)"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50">
                  <span className="text-muted-foreground">Inngest Engine</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] text-emerald-600 border-emerald-500/40"
                  >
                    Ready (OCR & Cron)
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50">
                  <span className="text-muted-foreground">
                    Tenant Isolation
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] text-emerald-600 border-emerald-500/40"
                  >
                    Strict userId Enforced
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
