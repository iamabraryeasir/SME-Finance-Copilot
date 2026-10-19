"use client";

import {
  Activity,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code,
  Copy,
  Cpu,
  Database,
  ExternalLink,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import type { GlobalAiTelemetry, UserAiTelemetry } from "@/services/telemetry";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  joinedAt: string;
  companyName: string;
  currency: string;
  openingBalance: number;
  minReserveThreshold: number;
  isTelegramLinked: boolean;
  telegramUsername: string | null;
  stats: {
    invoicesCount: number;
    transactionsCount: number;
    alertsCount: number;
    documentsCount: number;
    conversationsCount: number;
  };
}

interface AdminAuditItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  actor: "USER" | "AGENT" | "SYSTEM" | "TELEGRAM";
  actionType: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown>;
  status: "SUCCESS" | "FAILED" | "PENDING_APPROVAL";
  ipAddress: string | null;
  createdAt: string;
}

export default function AdminMonitorPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "overview" | "ai" | "users" | "audit"
  >("overview");

  // Telemetry state
  const [globalAi, setGlobalAi] = useState<GlobalAiTelemetry | null>(null);
  const [userAiList, setUserAiList] = useState<UserAiTelemetry[]>([]);
  const [loadingAi, setLoadingAi] = useState(true);

  // Users directory state
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AdminAuditItem[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditOffset, setAuditOffset] = useState(0);
  const [selectedActor, setSelectedActor] = useState("ALL");
  const [inspectAuditItem, setInspectAuditItem] =
    useState<AdminAuditItem | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch AI Telemetry
  const fetchTelemetry = useCallback(async () => {
    try {
      setLoadingAi(true);
      const res = await fetch("/api/admin/telemetry");
      const json = await res.json();
      if (res.ok && json.success) {
        setGlobalAi(json.data.global);
        setUserAiList(json.data.users);
      }
    } catch {
      toast.error("Failed to load AI telemetry");
    } finally {
      setLoadingAi(false);
    }
  }, []);

  // Fetch Users
  const fetchUsers = useCallback(async (searchQuery = "") => {
    try {
      setLoadingUsers(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setUsersList(json.data.users);
      }
    } catch {
      toast.error("Failed to load user directory");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Fetch Audit Logs
  const fetchAudit = useCallback(
    async (offset = 0) => {
      try {
        setLoadingAudit(true);
        const params = new URLSearchParams();
        params.set("limit", "25");
        params.set("offset", offset.toString());
        if (selectedActor !== "ALL") params.set("actor", selectedActor);

        const res = await fetch(`/api/admin/audit?${params.toString()}`);
        const json = await res.json();
        if (res.ok && json.success) {
          setAuditLogs(json.data.logs);
          setAuditTotal(json.data.totalCount);
        }
      } catch {
        toast.error("Failed to load audit logs");
      } finally {
        setLoadingAudit(false);
      }
    },
    [selectedActor],
  );

  const refreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchTelemetry(),
      fetchUsers(userSearch),
      fetchAudit(auditOffset),
    ]);
    setIsRefreshing(false);
    toast.success("System monitor telemetry refreshed");
  };

  useEffect(() => {
    fetchTelemetry();
    fetchUsers();
    fetchAudit(0);
  }, [fetchTelemetry, fetchUsers, fetchAudit]);

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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Admin Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary-text border border-primary/30">
                <Image
                  src="/app_logo.svg"
                  alt="CashPilot"
                  width={20}
                  height={20}
                  className="h-5 w-auto object-contain"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold tracking-tight text-foreground leading-none">
                    CashPilot
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-mono px-1.5 py-0 bg-primary/10 text-primary-text border-primary/30"
                  >
                    System Monitor
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  Platform Observability & Telemetry
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
              disabled={isRefreshing}
              className="h-8 gap-1.5 text-xs font-mono"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </span>
            </Button>

            <Link href="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs border-border"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tenant Dashboard</span>
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 border-t border-border/50 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "overview"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Platform Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "ai"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Cpu className="h-4 w-4 text-primary-text" />
            <span>AI & Token Telemetry</span>
            {globalAi && (
              <Badge
                variant="secondary"
                className="text-[10px] font-mono py-0 px-1.5 ml-1"
              >
                {globalAi.totalRequests} reqs
              </Badge>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "users"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Users & Tenants</span>
            <Badge
              variant="secondary"
              className="text-[10px] font-mono py-0 px-1.5 ml-1"
            >
              {usersList.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "audit"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Global Audit Stream</span>
            {auditTotal > 0 && (
              <Badge
                variant="secondary"
                className="text-[10px] font-mono py-0 px-1.5 ml-1"
              >
                {auditTotal}
              </Badge>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Platform Health & Telemetry Overview
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time observability of AI agent usage, active tenants, and
                system operations.
              </p>
            </div>

            {/* KPI Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border border-border shadow-2xs">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Active Tenants</span>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-2xl font-mono font-bold mt-1">
                    {usersList.length}
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
                  Completion:{" "}
                  {(globalAi?.completionTokens ?? 0).toLocaleString()}
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

            {/* Model & Architecture Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="border border-border shadow-2xs lg:col-span-2">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-primary-text" />
                    LLM Provider Routing & Health
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Primary Google Gemini 3.8 Flash model with Groq
                    Llama-3.3-70B automatic failover.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-3">
                  {globalAi?.modelBreakdown.map((item) => (
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
                  ))}
                </CardContent>
              </Card>

              <Card className="border border-border shadow-2xs">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary-text" />
                    Infrastructure Health
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Key service dependencies status.
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
                    <span className="text-muted-foreground">
                      Inngest Engine
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] text-emerald-600 border-emerald-500/40"
                    >
                      Ready (OCR & Nightly Cron)
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

        {/* TAB 2: AI & TOKEN TELEMETRY */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  AI Token Usage & Telemetry
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Detailed consumption tracking of prompt and completion tokens
                  broken down per SME tenant.
                </p>
              </div>

              {globalAi && (
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-muted-foreground">
                    Avg per request:
                  </span>
                  <span className="font-semibold text-foreground px-2 py-1 rounded bg-muted border border-border">
                    {globalAi.averageTokensPerRequest} tokens
                  </span>
                </div>
              )}
            </div>

            {/* Token Totals Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-1">
                <span className="text-xs text-muted-foreground">
                  Total Prompt Tokens
                </span>
                <div className="text-xl font-mono font-bold text-foreground">
                  {(globalAi?.promptTokens ?? 0).toLocaleString()}
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Context window ingestion & tool definitions
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-1">
                <span className="text-xs text-muted-foreground">
                  Total Completion Tokens
                </span>
                <div className="text-xl font-mono font-bold text-foreground">
                  {(globalAi?.completionTokens ?? 0).toLocaleString()}
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Synthesized responses & reminder drafts
                </p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-1">
                <span className="text-xs text-muted-foreground">
                  Total Platform Tokens
                </span>
                <div className="text-xl font-mono font-bold text-primary-text">
                  {(globalAi?.totalTokens ?? 0).toLocaleString()}
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Cumulative LLM bandwidth consumed
                </p>
              </div>
            </div>

            {/* Per-User Token Breakdown Table */}
            <Card className="border border-border shadow-2xs">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary-text" />
                    AI Token Consumption per SME Tenant
                  </span>
                  <Badge variant="outline" className="text-[11px] font-mono">
                    {userAiList.length} Tenants Tracked
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Observability into who is using the AI copilot and token
                  volumes consumed.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loadingAi ? (
                  <div className="py-12 flex justify-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-text" />
                  </div>
                ) : userAiList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No AI interactions recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono text-[11px]">
                        <tr>
                          <th className="py-3 px-4 font-medium">
                            Tenant / User
                          </th>
                          <th className="py-3 px-4 font-medium">Company</th>
                          <th className="py-3 px-4 font-medium text-right">
                            Requests
                          </th>
                          <th className="py-3 px-4 font-medium text-right">
                            Prompt Tokens
                          </th>
                          <th className="py-3 px-4 font-medium text-right">
                            Completion Tokens
                          </th>
                          <th className="py-3 px-4 font-medium text-right">
                            Total Tokens
                          </th>
                          <th className="py-3 px-4 font-medium">Top Tools</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {userAiList.map((user) => (
                          <tr
                            key={user.userId}
                            className="hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="font-semibold text-foreground">
                                {user.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                {user.email}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-medium text-foreground">
                                {user.companyName || "Unconfigured"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-medium">
                              {user.totalRequests}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                              {user.promptTokens.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                              {user.completionTokens.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                              {user.totalTokens.toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              {user.topTools.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {user.topTools.slice(0, 2).map((tool) => (
                                    <Badge
                                      key={tool.name}
                                      variant="outline"
                                      className="text-[9px] font-mono px-1.5 py-0"
                                    >
                                      {tool.name} ({tool.count})
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[11px] text-muted-foreground italic font-mono">
                                  Direct conversation
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tool Invocations Frequency */}
            <Card className="border border-border shadow-2xs">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary-text" />
                  Deterministic Tool Execution Frequency
                </CardTitle>
                <CardDescription className="text-xs">
                  Frequency of tool invocations performed autonomously by the
                  LangGraph agent.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {globalAi?.toolBreakdown.map((t) => (
                    <div
                      key={t.tool}
                      className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-mono font-semibold text-foreground">
                          {t.tool}
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          Deterministic verified tool
                        </p>
                      </div>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {t.invocations} calls
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 3: USERS & TENANTS DIRECTORY */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Users & SME Tenants Directory
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Read-only operational directory of all onboarded businesses,
                  financial profiles, and ledger sizes.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search by name, email..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    fetchUsers(e.target.value);
                  }}
                  className="pl-8 text-xs h-8"
                />
              </div>
            </div>

            <Card className="border border-border shadow-2xs">
              <CardContent className="p-0">
                {loadingUsers ? (
                  <div className="py-12 flex justify-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-text" />
                  </div>
                ) : usersList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No users matching criteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono text-[11px]">
                        <tr>
                          <th className="py-3 px-4 font-medium">
                            User / Contact
                          </th>
                          <th className="py-3 px-4 font-medium">
                            Company Profile
                          </th>
                          <th className="py-3 px-4 font-medium">Role</th>
                          <th className="py-3 px-4 font-medium text-right">
                            Invoices
                          </th>
                          <th className="py-3 px-4 font-medium text-right">
                            Documents
                          </th>
                          <th className="py-3 px-4 font-medium text-right">
                            Risk Alerts
                          </th>
                          <th className="py-3 px-4 font-medium">Telegram</th>
                          <th className="py-3 px-4 font-medium">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {usersList.map((user) => (
                          <tr
                            key={user.id}
                            className="hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="font-semibold text-foreground">
                                {user.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                {user.email}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-foreground">
                                {user.companyName}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                Reserve: {user.currency}{" "}
                                {user.minReserveThreshold.toLocaleString()}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  user.role === "admin"
                                    ? "default"
                                    : "secondary"
                                }
                                className={`text-[10px] font-mono capitalize ${
                                  user.role === "admin"
                                    ? "bg-primary text-primary-foreground font-semibold"
                                    : ""
                                }`}
                              >
                                {user.role}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-medium">
                              {user.stats.invoicesCount}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                              {user.stats.documentsCount}
                            </td>
                            <td className="py-3 px-4 text-right font-mono">
                              {user.stats.alertsCount > 0 ? (
                                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                  {user.stats.alertsCount} active
                                </span>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {user.isTelegramLinked ? (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-mono border-emerald-500/40 text-emerald-600 dark:text-emerald-400 gap-1"
                                >
                                  <Send className="h-2.5 w-2.5" />
                                  Linked
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  Unlinked
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-[11px] text-muted-foreground font-mono">
                              {new Date(user.joinedAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 4: GLOBAL AUDIT STREAM */}
        {activeTab === "audit" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Global System Audit Stream
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cross-tenant immutable record of all state transitions, agent
                  recommendations, and user decisions.
                </p>
              </div>

              {/* Actor Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {["ALL", "USER", "AGENT", "SYSTEM", "TELEGRAM"].map((actor) => (
                  <Button
                    key={actor}
                    type="button"
                    variant={selectedActor === actor ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedActor(actor);
                      setAuditOffset(0);
                    }}
                    className={`h-7 text-xs font-mono px-2.5 ${
                      selectedActor === actor
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground"
                    }`}
                  >
                    {actor}
                  </Button>
                ))}
              </div>
            </div>

            <Card className="border border-border shadow-2xs">
              <CardContent className="p-0">
                {loadingAudit ? (
                  <div className="py-12 flex justify-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-text" />
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No audit records found matching criteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono text-[11px]">
                        <tr>
                          <th className="py-3 px-4 font-medium">Timestamp</th>
                          <th className="py-3 px-4 font-medium">Actor</th>
                          <th className="py-3 px-4 font-medium">User</th>
                          <th className="py-3 px-4 font-medium">Action</th>
                          <th className="py-3 px-4 font-medium">
                            Target Entity
                          </th>
                          <th className="py-3 px-4 font-medium">Status</th>
                          <th className="py-3 px-4 font-medium text-right">
                            Payload
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {auditLogs.map((log) => (
                          <tr
                            key={log.id}
                            className="hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleTimeString(
                                "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                },
                              )}{" "}
                              ·{" "}
                              {new Date(log.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                },
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono px-1.5 py-0"
                              >
                                {log.actor}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px]">
                              <span className="font-semibold text-foreground">
                                {log.userName}
                              </span>
                              <div className="text-muted-foreground truncate max-w-xs">
                                {log.userEmail}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono font-semibold text-foreground">
                              {log.actionType}
                            </td>
                            <td className="py-3 px-4 font-mono text-muted-foreground">
                              {log.entityType}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-mono ${
                                  log.status === "SUCCESS"
                                    ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                                    : "border-destructive/40 text-destructive"
                                }`}
                              >
                                {log.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setInspectAuditItem(log)}
                                className="h-7 px-2 text-[11px] font-mono gap-1"
                              >
                                <Code className="h-3 w-3" />
                                Inspect
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pagination Controls */}
            {auditTotal > 25 && (
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>
                  Showing {auditOffset + 1}–
                  {Math.min(auditOffset + 25, auditTotal)} of {auditTotal}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={auditOffset === 0}
                    onClick={() => {
                      const next = Math.max(0, auditOffset - 25);
                      setAuditOffset(next);
                      fetchAudit(next);
                    }}
                    className="h-8 gap-1 text-xs"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={auditOffset + 25 >= auditTotal}
                    onClick={() => {
                      const next = auditOffset + 25;
                      setAuditOffset(next);
                      fetchAudit(next);
                    }}
                    className="h-8 gap-1 text-xs"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* JSON Payload Inspector Modal */}
      {inspectAuditItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-primary-text" />
                <h3 className="font-semibold text-sm">
                  Audit Execution Payload Delta
                </h3>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {inspectAuditItem.actionType}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => setInspectAuditItem(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono p-3 rounded-lg bg-muted/40 border border-border/60">
                <div>
                  <span className="text-muted-foreground block text-[10px]">
                    ACTOR
                  </span>
                  <span className="font-semibold">
                    {inspectAuditItem.actor}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">
                    USER
                  </span>
                  <span className="font-semibold truncate block">
                    {inspectAuditItem.userName}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">
                    STATUS
                  </span>
                  <span className="font-semibold">
                    {inspectAuditItem.status}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">
                    IP ORIGIN
                  </span>
                  <span className="font-semibold">
                    {inspectAuditItem.ipAddress || "Internal"}
                  </span>
                </div>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between pb-1.5 text-xs text-muted-foreground font-mono">
                  <span>State Details & Metadata</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        JSON.stringify(inspectAuditItem.details, null, 2),
                      );
                      toast.success("Payload copied to clipboard");
                    }}
                    className="flex items-center gap-1 hover:text-foreground cursor-pointer"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy JSON</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-muted/60 border border-border text-[11px] font-mono overflow-x-auto text-foreground max-h-72">
                  {JSON.stringify(inspectAuditItem.details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-3 border-t border-border bg-muted/10 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectAuditItem(null)}
                className="h-8 text-xs"
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
