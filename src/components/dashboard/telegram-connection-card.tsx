"use client";

import {
  CheckCircle2,
  Copy,
  MessageSquare,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  Unlink,
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

interface TelegramStatus {
  isLinked: boolean;
  username: string | null;
  chatId: string | null;
  linkedAt: string | null;
  activeCode: string | null;
  expiresAt: string | null;
}

export function TelegramConnectionCard() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [status, setStatus] = useState<TelegramStatus | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/telegram/pair");
      const json = await res.json();
      if (res.ok && json.success) {
        setStatus(json.data);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleGeneratePin = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/telegram/pair", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Pairing PIN generated!");
        fetchStatus();
      } else {
        toast.error(json.message || "Failed to generate pairing PIN");
      }
    } catch {
      toast.error("Network error while generating PIN");
    } finally {
      setGenerating(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !confirm("Are you sure you want to disconnect your Telegram account?")
    ) {
      return;
    }
    setUnlinking(true);
    try {
      const res = await fetch("/api/telegram/pair", { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Telegram account disconnected");
        fetchStatus();
      } else {
        toast.error(json.message || "Failed to disconnect");
      }
    } catch {
      toast.error("Network error while disconnecting");
    } finally {
      setUnlinking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("PIN copied to clipboard!");
  };

  if (loading) {
    return (
      <Card className="border-border/80">
        <CardContent className="p-6 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 shadow-2xs">
      <CardHeader className="pb-3 border-b border-border/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                Telegram Omni-Channel Assistant
                {status?.isLinked ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-muted text-muted-foreground text-[10px]"
                  >
                    Not Linked
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Query forecasts, receive cash deficit warnings, and approve
                invoice reminders directly from Telegram.
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchStatus}
            className="h-8 w-8 p-0"
            title="Refresh Status"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {status?.isLinked ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/20 text-primary-text flex items-center justify-center font-bold text-xs">
                  TG
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    {status.username ? `@${status.username}` : "Telegram User"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Connected on{" "}
                    {status.linkedAt
                      ? new Date(status.linkedAt).toLocaleDateString()
                      : "Recently"}
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={unlinking}
                className="text-destructive hover:bg-destructive/10 text-xs h-8 border-destructive/30"
              >
                <Unlink className="h-3.5 w-3.5 mr-1" />
                {unlinking ? "Disconnecting..." : "Disconnect Bot"}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-md border border-border/60 bg-background flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <div>
                  <div className="font-medium text-[11px]">
                    Tenant Isolation
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Encrypted Chat Session
                  </div>
                </div>
              </div>
              <div className="p-2.5 rounded-md border border-border/60 bg-background flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary-text shrink-0" />
                <div>
                  <div className="font-medium text-[11px]">Shared Engine</div>
                  <div className="text-[10px] text-muted-foreground">
                    Synced With Web Ledger
                  </div>
                </div>
              </div>
              <div className="p-2.5 rounded-md border border-border/60 bg-background flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-sky-500 shrink-0" />
                <div>
                  <div className="font-medium text-[11px]">HITL Approvals</div>
                  <div className="text-[10px] text-muted-foreground">
                    Inline Button Actions
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {status?.activeCode ? (
              <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    Your One-Time Pairing PIN
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-background text-muted-foreground"
                  >
                    Expires in 15 mins
                  </Badge>
                </div>

                <div className="flex items-center justify-between bg-background p-3 rounded-lg border border-border">
                  <span className="font-mono text-xl font-bold tracking-widest text-primary-text">
                    {status.activeCode}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(status.activeCode || "")}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">
                    How to complete pairing:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                    <li>Open Telegram and search for your CashPilot Bot</li>
                    <li>
                      Send the command:{" "}
                      <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground font-bold border border-border/60">
                        /link {status.activeCode}
                      </code>
                    </li>
                    <li>
                      Wait 3 seconds for instant verification confirmation!
                    </li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg border border-border/60 bg-muted/20">
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    Pair Telegram for Omni-Channel Access
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Generate a secure 6-digit PIN to link your mobile Telegram
                    app to this business ledger.
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={handleGeneratePin}
                  disabled={generating}
                  className="gap-1.5 text-xs h-9 shrink-0"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  {generating ? "Generating..." : "Connect Telegram"}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
