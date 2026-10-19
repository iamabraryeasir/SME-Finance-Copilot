"use client";

import { Activity, Loader2, RefreshCw, Users } from "lucide-react";
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
import type { GlobalAiTelemetry, UserAiTelemetry } from "@/services/telemetry";

export default function AdminTelemetryPage() {
  const [globalAi, setGlobalAi] = useState<GlobalAiTelemetry | null>(null);
  const [userAiList, setUserAiList] = useState<UserAiTelemetry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/telemetry");
      const json = await res.json();
      if (res.ok && json.success) {
        setGlobalAi(json.data.global);
        setUserAiList(json.data.users);
      }
    } catch {
      toast.error("Failed to load AI telemetry");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTelemetry();
    toast.success("AI telemetry refreshed");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              AI Token Telemetry & Tool Usage
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-mono px-2 py-0.5 bg-primary/10 text-primary-text border-primary/30"
            >
              Observability
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Consumption tracking of prompt and completion tokens broken down per
            SME tenant and tool invocations.
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

          {globalAi && (
            <div className="hidden sm:flex items-center gap-2 font-mono text-xs px-3 py-1.5 rounded-xl bg-card border border-border">
              <span className="text-muted-foreground">Avg/Req:</span>
              <span className="font-semibold text-foreground">
                {globalAi.averageTokensPerRequest} tokens
              </span>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary-text" />
          <p className="text-xs font-mono">Aggregating token telemetry...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Token Totals Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-1">
              <span className="text-xs text-muted-foreground">
                Total Prompt Tokens
              </span>
              <div className="text-2xl font-mono font-bold text-foreground">
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
              <div className="text-2xl font-mono font-bold text-foreground">
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
              <div className="text-2xl font-mono font-bold text-primary-text">
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
                Detailed observability into which businesses are using the AI
                agent and token volumes consumed.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {userAiList.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No AI interactions recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono text-[11px]">
                      <tr>
                        <th className="py-3 px-4 font-medium">Tenant / User</th>
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

          {/* Deterministic Tool Invocations Frequency */}
          <Card className="border border-border shadow-2xs">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary-text" />
                Deterministic Tool Execution Frequency
              </CardTitle>
              <CardDescription className="text-xs">
                Invocations performed autonomously by the LangGraph agent across
                all financial tools.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {globalAi?.toolBreakdown &&
                globalAi.toolBreakdown.length > 0 ? (
                  globalAi.toolBreakdown.map((t) => (
                    <div
                      key={t.tool}
                      className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-mono font-semibold text-foreground">
                          {t.tool}
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          Deterministic tool
                        </p>
                      </div>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {t.invocations} calls
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-6 text-center text-xs text-muted-foreground">
                    No autonomous tool executions recorded yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
