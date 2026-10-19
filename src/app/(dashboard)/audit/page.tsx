"use client";

import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code,
  Copy,
  Cpu,
  Filter,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
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

interface AuditLogItem {
  id: string;
  userId: string;
  actor: "USER" | "AGENT" | "SYSTEM" | "TELEGRAM";
  actionType: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown>;
  status: "SUCCESS" | "FAILURE" | "PENDING";
  ipAddress: string | null;
  createdAt: string;
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedActor, setSelectedActor] = useState<string>("ALL");
  const [selectedAction, setSelectedAction] = useState<string>("ALL");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const [inspectItem, setInspectItem] = useState<AuditLogItem | null>(null);

  const fetchLogs = useCallback(
    async (currentOffset = 0) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("limit", limit.toString());
        params.set("offset", currentOffset.toString());

        if (selectedActor !== "ALL") {
          params.set("actor", selectedActor);
        }
        if (selectedAction !== "ALL") {
          params.set("actionType", selectedAction);
        }

        const res = await fetch(`/api/audit?${params.toString()}`);
        const json = await res.json();

        if (res.ok && json.success) {
          setLogs(json.data.logs);
          setTotalCount(json.data.totalCount);
        } else {
          toast.error(json.message || "Failed to load audit logs");
        }
      } catch {
        toast.error("Failed to connect to audit logging service");
      } finally {
        setLoading(false);
      }
    },
    [selectedActor, selectedAction],
  );

  useEffect(() => {
    setOffset(0);
    fetchLogs(0);
  }, [fetchLogs]);

  const handleNextPage = () => {
    if (offset + limit < totalCount) {
      const nextOffset = offset + limit;
      setOffset(nextOffset);
      fetchLogs(nextOffset);
    }
  };

  const handlePrevPage = () => {
    if (offset - limit >= 0) {
      const prevOffset = offset - limit;
      setOffset(prevOffset);
      fetchLogs(prevOffset);
    }
  };

  const copyPayload = (item: AuditLogItem) => {
    navigator.clipboard.writeText(JSON.stringify(item.details, null, 2));
    toast.success("Payload copied to clipboard");
  };

  const getActorBadge = (actor: string) => {
    switch (actor) {
      case "USER":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <User className="h-2.5 w-2.5" />
            USER
          </span>
        );
      case "AGENT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/20 text-primary-text border border-primary/30">
            <Bot className="h-2.5 w-2.5" />
            AI AGENT
          </span>
        );
      case "TELEGRAM":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <MessageSquare className="h-2.5 w-2.5" />
            TELEGRAM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Cpu className="h-2.5 w-2.5" />
            SYSTEM
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Verified
          </span>
        );
      case "FAILURE":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-destructive">
            <AlertTriangle className="h-3 w-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header matching Editorial Typography Design System */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Security & Compliance Audit Trail
            </h1>
            <Badge variant="outline" className="text-[10px] gap-1 py-0.5">
              <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              Append-Only Ledger
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Tamper-evident operational log recording all AI decisions, ledger
            mutations, Telegram bot triggers, and human approvals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(offset)}
            disabled={loading}
            className="gap-2 h-9 text-xs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh Log
          </Button>
        </div>
      </div>

      {/* Filter Ribbon */}
      <Card className="border border-border shadow-2xs bg-card">
        <CardContent className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5 text-primary-text" />
              <span>Filter:</span>
            </div>

            {/* Actor Select Filter */}
            <select
              value={selectedActor}
              onChange={(e) => setSelectedActor(e.target.value)}
              className="h-8 text-xs rounded-lg border border-border bg-background px-2.5 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/40 font-sans"
            >
              <option value="ALL">All Actors</option>
              <option value="USER">User (Web)</option>
              <option value="AGENT">AI Copilot (Agent)</option>
              <option value="TELEGRAM">Telegram Bot</option>
              <option value="SYSTEM">System (Cron/Worker)</option>
            </select>

            {/* Action Type Select Filter */}
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="h-8 text-xs rounded-lg border border-border bg-background px-2.5 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/40 font-sans"
            >
              <option value="ALL">All Actions</option>
              <option value="INGESTION">Ingestion (CSV/PDF)</option>
              <option value="FORECAST_RUN">Forecast Calculation</option>
              <option value="ALERT_TRIGGER">Risk Alert Triggered</option>
              <option value="DRAFT_CREATED">Action Draft Created</option>
              <option value="DRAFT_APPROVED">Action Approved (HITL)</option>
              <option value="DRAFT_REJECTED">Action Rejected</option>
              <option value="DISPATCH">Reminder Dispatched</option>
              <option value="SETTINGS_UPDATED">Settings Updated</option>
            </select>
          </div>

          <div className="text-xs font-mono text-muted-foreground">
            Total Records:{" "}
            <span className="font-semibold text-foreground">{totalCount}</span>
          </div>
        </CardContent>
      </Card>

      {/* Main Audit Trail Timeline */}
      <Card className="border border-border shadow-xs bg-card overflow-hidden">
        <CardHeader className="p-4 border-b border-border/80">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Chronological Event Stream</span>
            <span className="text-[11px] font-mono font-normal text-muted-foreground">
              Showing {logs.length > 0 ? offset + 1 : 0} -{" "}
              {Math.min(offset + limit, totalCount)} of {totalCount}
            </span>
          </CardTitle>
          <CardDescription className="text-xs">
            Every record contains immutable actor identity, entity keys, and
            JSON deltas.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading && logs.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin text-primary-text" />
              <p className="text-xs">Reading immutable audit records...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground p-6">
              <ShieldCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">
                No audit events recorded for this filter.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Perform actions in the Copilot, ingest invoices, or configure
                schedules to see live records.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {logs.map((log) => {
                const dateObj = new Date(log.createdAt);
                const formattedDate = dateObj.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                const formattedTime = dateObj.toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });

                return (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-muted/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getActorBadge(log.actor)}</div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-foreground">
                            {log.actionType.replace(/_/g, " ")}
                          </span>
                          <span className="text-muted-foreground/60">•</span>
                          <span className="font-mono text-[11px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                            {log.entityType}
                            {log.entityId
                              ? ` #${log.entityId.slice(0, 8)}`
                              : ""}
                          </span>
                          <span className="text-muted-foreground/60">•</span>
                          {getStatusBadge(log.status)}
                        </div>

                        {/* Brief delta preview */}
                        <div className="text-[11px] text-muted-foreground font-mono truncate max-w-xl">
                          {log.details && typeof log.details === "object"
                            ? Object.keys(log.details)
                                .map(
                                  (k) =>
                                    `${k}: ${typeof log.details[k] === "object" ? "..." : log.details[k]}`,
                                )
                                .slice(0, 3)
                                .join(" | ")
                            : "No metadata"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-left sm:text-right text-[11px] text-muted-foreground font-mono">
                        <div>{formattedDate}</div>
                        <div className="text-[10px] text-muted-foreground/70">
                          {formattedTime}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setInspectItem(log)}
                        className="gap-1 text-[11px] h-7"
                      >
                        <Code className="h-3 w-3 text-primary-text" />
                        Payload
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>

        {/* Pagination Footer */}
        {totalCount > limit && (
          <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/10">
            <div>
              Page {Math.floor(offset / limit) + 1} of{" "}
              {Math.ceil(totalCount / limit)}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                onClick={handlePrevPage}
                disabled={offset === 0 || loading}
                className="gap-1 h-7 text-xs"
              >
                <ChevronLeft className="h-3 w-3" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={handleNextPage}
                disabled={offset + limit >= totalCount || loading}
                className="gap-1 h-7 text-xs"
              >
                Next
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* JSON Payload Inspector Modal */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-primary-text" />
                <h3 className="text-sm font-semibold text-foreground">
                  Audit Payload: {inspectItem.actionType}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg border border-border/60">
                <div>
                  <span className="text-muted-foreground">Log ID: </span>
                  <span className="text-foreground">{inspectItem.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Actor: </span>
                  <span className="text-foreground">{inspectItem.actor}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Entity: </span>
                  <span className="text-foreground">
                    {inspectItem.entityType} ({inspectItem.entityId || "N/A"})
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">IP Address: </span>
                  <span className="text-foreground">
                    {inspectItem.ipAddress || "Direct Backend"}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between pb-1">
                  <span className="text-muted-foreground font-semibold">
                    Detailed Execution State:
                  </span>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => copyPayload(inspectItem)}
                    className="gap-1 h-6 text-[10px]"
                  >
                    <Copy className="h-2.5 w-2.5" />
                    Copy JSON
                  </Button>
                </div>
                <pre className="p-3 rounded-lg bg-background border border-border/80 text-foreground overflow-x-auto text-[11px] leading-relaxed max-h-[40vh]">
                  {JSON.stringify(inspectItem.details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-3 border-t border-border flex justify-end bg-muted/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectItem(null)}
                className="text-xs h-8"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
