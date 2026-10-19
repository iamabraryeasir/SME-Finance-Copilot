"use client";

import {
  ChevronLeft,
  ChevronRight,
  Code,
  Copy,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminAuditItem } from "@/types/admin";

export default function AdminAuditPage() {
  const [auditLogs, setAuditLogs] = useState<AdminAuditItem[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditOffset, setAuditOffset] = useState(0);
  const [selectedActor, setSelectedActor] = useState("ALL");
  const [inspectAuditItem, setInspectAuditItem] =
    useState<AdminAuditItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAudit = useCallback(
    async (offset = 0) => {
      try {
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
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedActor],
  );

  useEffect(() => {
    fetchAudit(auditOffset);
  }, [fetchAudit, auditOffset]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAudit(auditOffset);
    toast.success("Audit stream refreshed");
  };

  const handleActorChange = (actor: string) => {
    setSelectedActor(actor);
    setAuditOffset(0);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Global Platform Audit Stream
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-mono px-2 py-0.5 bg-primary/10 text-primary-text border-primary/30"
            >
              Security
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Cross-tenant immutable record of all state transitions, agent
            decisions, and security events.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Actor Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {["ALL", "USER", "AGENT", "SYSTEM", "TELEGRAM"].map((actor) => (
              <Button
                key={actor}
                type="button"
                variant={selectedActor === actor ? "default" : "outline"}
                size="sm"
                onClick={() => handleActorChange(actor)}
                className={`h-8 text-xs font-mono px-2.5 rounded-xl ${
                  selectedActor === actor
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                {actor}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="gap-2 h-8 rounded-xl text-xs border-border bg-card hover:bg-muted font-mono"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>{isRefreshing ? "Refreshing..." : "Sync"}</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary-text" />
          <p className="text-xs font-mono">Loading security audit stream...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="border border-border shadow-2xs">
            <CardContent className="p-0">
              {auditLogs.length === 0 ? (
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
                        <th className="py-3 px-4 font-medium">Target Entity</th>
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
