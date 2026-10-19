"use client";

import {
  AlertOctagon,
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
  User,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ChatMessage {
  id: string;
  sender: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  toolCalls?: Array<{ name: string; args?: Record<string, unknown> }>;
  createdAt?: string;
  actionDraft?: {
    id: string;
    invoiceNumber: string;
    recipientName: string;
    amount?: number;
    subject: string;
    status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  };
}

interface ConversationItem {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
}

interface CopilotChatProps {
  companyName?: string;
  currency?: string;
}

function ChatMarkdown({
  content,
  isUser,
}: {
  content: string;
  isUser: boolean;
}) {
  if (isUser) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  return (
    <div className="text-xs sm:text-[13px] leading-relaxed space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-sm font-bold text-foreground mt-2 mb-1 border-b border-border/50 pb-1">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[13px] font-bold text-foreground mt-2 mb-1 border-b border-border/40 pb-0.5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-foreground mt-2 mb-1">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-1.5 last:mb-0 leading-normal">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-4 space-y-1 my-1.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 space-y-1 my-1.5">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-normal">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          hr: () => <hr className="my-2 border-border/60" />,
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 rounded-lg border border-border/80 bg-background/60">
              <table className="w-full text-left text-[11px] divide-y divide-border/60">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/60 font-semibold text-foreground">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-2.5 py-1.5 font-semibold text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2.5 py-1.5 border-t border-border/40 text-muted-foreground">
              {children}
            </td>
          ),
          code: ({ children }) => (
            <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] text-foreground font-semibold border border-border/60">
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary-text pl-2.5 italic text-muted-foreground my-1.5">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function getToolStepLabel(toolName: string): string {
  switch (toolName) {
    case "get_invoices":
      return "Querying persistent ledger for invoices...";
    case "get_financial_summary":
      return "Aggregating revenue, receivables, and cash balances...";
    case "get_upcoming_payables":
      return "Checking upcoming supplier payables and commitments...";
    case "get_upcoming_receivables":
      return "Checking expected customer receivables...";
    case "forecast_cash_balance":
      return "Running 30-day deterministic cash flow projection...";
    case "get_financial_alerts":
      return "Evaluating rule-based financial risk indicators...";
    case "create_reminder_draft":
      return "Drafting customer payment reminder for human approval...";
    case "record_action_status":
      return "Recording audit trail in ledger...";
    default:
      return `Consulting ${toolName.replace(/_/g, " ")}...`;
  }
}

export function CopilotChat({
  companyName = "your business",
  currency = "BDT",
}: CopilotChatProps) {
  const symbol = currency === "USD" ? "$" : "৳";

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeToolStep, setActiveToolStep] = useState<{
    name: string;
    label: string;
  } | null>(null);
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(
    null,
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (messages.length >= 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Fetch list of conversations
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const json = await res.json();
      if (res.ok && json.success) {
        setConversations(json.data);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  // Fetch messages for active conversation
  const loadMessages = useCallback(async (convId: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/conversations/${convId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setMessages(
          json.data.messages.map((m: ChatMessage) => ({
            id: m.id,
            sender: m.sender,
            content: m.content,
            toolCalls: m.toolCalls,
            createdAt: m.createdAt,
          })),
        );
      }
    } catch {
      toast.error("Failed to load chat history");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    } else {
      // Default welcome state
      setMessages([
        {
          id: "welcome",
          sender: "ASSISTANT",
          content: `Hello! I am **CashPilot AI**, your financial copilot for ${companyName}.\n\nI operate purely over verified deterministic tools and mathematical engines—never guessing numbers or fabricating ledger entries.\n\nHow can I help preserve your liquidity today?`,
        },
      ]);
    }
  }, [activeConvId, companyName, loadMessages]);

  // Handle sending message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    setInputPrompt("");

    const tempUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "USER",
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      const payloadMessages = [...messages, tempUserMessage].map((m) => ({
        role: m.sender === "USER" ? "user" : "assistant",
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          conversationId: activeConvId,
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || `Server error (${res.status})`);
      }

      // Check header for updated conversation ID
      const newConvId = res.headers.get("x-conversation-id");
      if (newConvId && newConvId !== activeConvId) {
        setActiveConvId(newConvId);
        loadConversations();
      }

      // Parse streaming response text
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body stream");

      const decoder = new TextDecoder();
      let assistantText = "";
      const accumulatedToolCalls: Array<{
        name: string;
        args?: Record<string, unknown>;
      }> = [];
      const assistantMessageId = `assist-${Date.now()}`;
      let messageAppended = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]" || trimmed === "[DONE]") {
            continue;
          }

          if (line.startsWith("0:") || line.startsWith("data:")) {
            try {
              const raw = line.startsWith("0:")
                ? line.slice(2)
                : line.slice(5).trim();

              if (raw === "[DONE]") continue;

              const parsed = JSON.parse(raw);

              // 1. Text streaming deltas
              if (typeof parsed === "string") {
                assistantText += parsed;
              } else if (
                parsed?.type === "text-delta" &&
                typeof parsed?.delta === "string"
              ) {
                assistantText += parsed.delta;
              } else if (typeof parsed?.text === "string") {
                assistantText += parsed.text;
              } else if (typeof parsed?.delta === "string") {
                assistantText += parsed.delta;
              }

              // 2. Tool invocation lifecycle
              else if (
                parsed?.type === "tool-input-start" ||
                parsed?.type === "tool-input-available"
              ) {
                const toolName = (parsed.toolName as string) || "tool";
                const toolArgs =
                  (parsed.input as Record<string, unknown>) || {};
                setActiveToolStep({
                  name: toolName,
                  label: getToolStepLabel(toolName),
                });
                if (!accumulatedToolCalls.some((tc) => tc.name === toolName)) {
                  accumulatedToolCalls.push({ name: toolName, args: toolArgs });
                }
              }

              // 3. Tool output available
              else if (parsed?.type === "tool-output-available") {
                const toolName = (parsed.toolName as string) || "tool";
                setActiveToolStep({
                  name: toolName,
                  label: `Retrieved verified data from ${toolName.replace(/_/g, " ")}`,
                });
              }

              // 4. Server-emitted error events
              else if (parsed?.type === "error") {
                const errText =
                  parsed.errorText || "An internal error occurred.";
                assistantText += `\n\n⚠️ **Notice:** ${errText}`;
                toast.error(errText);
              }
            } catch {
              // Raw text chunk fallback (ignore protocol sentinels)
              if (
                !line.includes("[DONE]") &&
                !line.startsWith("d:") &&
                !line.startsWith("e:")
              ) {
                const stripped = line
                  .replace(/^[0-9]:"|^data:\s*"/, "")
                  .replace(/"$/, "");
                if (stripped !== line) {
                  assistantText += stripped.replace(/\\n/g, "\n");
                }
              }
            }
          }
        }

        // Only append or update assistant message if we have text or completed tool calls
        if (
          assistantText.trim().length > 0 ||
          accumulatedToolCalls.length > 0
        ) {
          if (!messageAppended) {
            messageAppended = true;
            setMessages((prev) => [
              ...prev,
              {
                id: assistantMessageId,
                sender: "ASSISTANT",
                content: assistantText,
                toolCalls:
                  accumulatedToolCalls.length > 0
                    ? [...accumulatedToolCalls]
                    : undefined,
              },
            ]);
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content: assistantText,
                      toolCalls:
                        accumulatedToolCalls.length > 0
                          ? [...accumulatedToolCalls]
                          : m.toolCalls,
                    }
                  : m,
              ),
            );
          }
        }
      }

      // Safety finalization: ensure no hanging empty bubble
      if (!messageAppended) {
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            sender: "ASSISTANT",
            content:
              assistantText.trim() ||
              "Financial query processed. No records found for the requested parameters.",
            toolCalls:
              accumulatedToolCalls.length > 0
                ? [...accumulatedToolCalls]
                : undefined,
          },
        ]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Chat failed";
      toast.error(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "ASSISTANT",
          content: `⚠️ **Error:** ${msg}\n\nPlease try again or verify your connection.`,
        },
      ]);
    } finally {
      setIsLoading(false);
      setActiveToolStep(null);
    }
  };

  // Handle HITL Action Approval / Rejection
  const handleActionDecision = async (
    draftId: string,
    decision: "APPROVED" | "REJECTED",
  ) => {
    try {
      setActionProcessingId(draftId);
      const res = await fetch(`/api/actions/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: decision }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Action decision failed");
      }

      toast.success(
        decision === "APPROVED"
          ? "Reminder approved and dispatched!"
          : "Action draft dismissed.",
      );

      // Append confirmation to chat
      setMessages((prev) => [
        ...prev,
        {
          id: `decision-${Date.now()}`,
          sender: "ASSISTANT",
          content:
            decision === "APPROVED"
              ? `✅ **Action Approved:** Draft ${draftId} has been confirmed and dispatched. Ledger audit trail updated.`
              : `❌ **Action Rejected:** Draft ${draftId} was dismissed. No messages were dispatched.`,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Decision error";
      toast.error(msg);
    } finally {
      setActionProcessingId(null);
    }
  };

  const handleStartNewChat = () => {
    setActiveConvId(null);
    setMessages([
      {
        id: "welcome",
        sender: "ASSISTANT",
        content: `Hello! I am **CashPilot AI**, your financial copilot for ${companyName}.\n\nI operate purely over verified deterministic tools and mathematical engines—never guessing numbers or fabricating ledger entries.\n\nHow can I help preserve your liquidity today?`,
      },
    ]);
  };

  const handleDeleteConversation = async (
    convId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    try {
      await fetch(`/api/conversations/${convId}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) {
        handleStartNewChat();
      }
      toast.success("Conversation deleted");
    } catch {
      toast.error("Failed to delete conversation");
    }
  };

  // Quick Prompt Suggestion Pills
  const quickPrompts = [
    {
      title: "Affordability Check",
      prompt: `Can I afford to purchase ${symbol}150,000 of inventory on Day 10?`,
    },
    {
      title: "Top Debtors",
      prompt:
        "Who owes me the most money right now, and which invoices are overdue?",
    },
    {
      title: "Cash Position",
      prompt:
        "Summarize my cash position, upcoming bills, and 30-day liquidity risks.",
    },
    {
      title: "Upcoming Liabilities",
      prompt:
        "What supplier payments and fixed overhead obligations are due this week?",
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-10rem)] min-h-150">
      {/* Left Column: Chat Sessions History */}
      <Card className="hidden lg:flex flex-col border border-border h-full overflow-hidden shadow-xs">
        <CardHeader className="p-4 border-b border-border/80 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-primary-text" />
              Advisory Sessions
            </CardTitle>
            <CardDescription className="text-xs">
              {conversations.length} saved threads
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleStartNewChat}
            className="h-8 gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </CardHeader>

        <CardContent className="p-2 flex-1 overflow-y-auto space-y-1">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No previous conversations. Start a new advisory session!
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`w-full p-1 rounded-lg text-xs transition-colors group flex items-center justify-between gap-1 ${
                  activeConvId === conv.id
                    ? "bg-primary/20 text-primary-text font-bold border border-primary/40"
                    : "hover:bg-muted/50 text-foreground"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveConvId(conv.id)}
                  className="space-y-0.5 truncate flex-1 text-left p-1.5 focus:outline-hidden"
                >
                  <div className="truncate font-medium">{conv.title}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(conv.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 hover:text-destructive text-muted-foreground transition-opacity rounded hover:bg-muted shrink-0"
                  title="Delete chat"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Main Column: Active Copilot Chat Window */}
      <Card className="lg:col-span-3 border border-border flex flex-col h-full overflow-hidden shadow-xs bg-card">
        {/* Top Header */}
        <CardHeader className="p-3.5 px-4 border-b border-border/80 flex flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center text-primary-text border border-primary/30">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold text-foreground">
                  CashPilot AI Financial Copilot
                </CardTitle>
                <Badge
                  variant="success"
                  className="text-[10px] gap-1 py-0 px-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Gemini 3.8 Flash + Multi-Tier Failover &bull; 8 Deterministic
                Tools Bound
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartNewChat}
              className="lg:hidden h-8 text-xs gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </Button>
          </div>
        </CardHeader>

        {/* Message Thread Area */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === "USER";
            if (
              !isUser &&
              !msg.content.trim() &&
              (!msg.toolCalls || msg.toolCalls.length === 0)
            ) {
              return null;
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="h-7 w-7 rounded-md bg-primary/20 text-primary-text flex items-center justify-center shrink-0 border border-primary/30 mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-xl p-3.5 space-y-2 leading-relaxed ${
                    isUser
                      ? "bg-primary text-primary-foreground font-normal rounded-tr-none shadow-xs"
                      : "bg-muted/40 border border-border/80 text-foreground rounded-tl-none shadow-2xs"
                  }`}
                >
                  {/* Tool Invocations Badge if any */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pb-1 border-b border-border/50 text-[10px] font-mono text-muted-foreground">
                      {msg.toolCalls.map((tc, idx) => (
                        <span
                          key={`${tc.name}-${idx}`}
                          className="bg-background px-1.5 py-0.5 rounded border border-border flex items-center gap-1"
                        >
                          <Wand2 className="h-2.5 w-2.5 text-primary-text" />
                          {tc.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Message Body text */}
                  <ChatMarkdown content={msg.content} isUser={isUser} />

                  {/* Optional HITL Action Approval Widget */}
                  {msg.actionDraft &&
                    msg.actionDraft.status === "PENDING_APPROVAL" && (
                      <div className="mt-3 p-3 rounded-lg bg-background border border-amber-500/40 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400">
                          <span className="flex items-center gap-1.5">
                            <AlertOctagon className="h-3.5 w-3.5" />
                            Human-in-the-Loop Action Approval Required
                          </span>
                          <Badge variant="warning" className="text-[10px]">
                            PENDING
                          </Badge>
                        </div>

                        <div className="text-[11px] text-muted-foreground font-mono bg-muted/30 p-2 rounded border border-border/50">
                          <div>
                            <strong>Target:</strong>{" "}
                            {msg.actionDraft.recipientName} (
                            {msg.actionDraft.invoiceNumber})
                          </div>
                          <div>
                            <strong>Subject:</strong> {msg.actionDraft.subject}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => {
                              if (msg.actionDraft?.id) {
                                handleActionDecision(
                                  msg.actionDraft.id,
                                  "APPROVED",
                                );
                              }
                            }}
                            disabled={actionProcessingId === msg.actionDraft.id}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Approve & Send
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (msg.actionDraft?.id) {
                                handleActionDecision(
                                  msg.actionDraft.id,
                                  "REJECTED",
                                );
                              }
                            }}
                            disabled={actionProcessingId === msg.actionDraft.id}
                            className="h-7 text-xs text-destructive hover:bg-destructive/10"
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    )}
                </div>

                {isUser && (
                  <div className="h-7 w-7 rounded-md bg-secondary text-secondary-foreground flex items-center justify-center shrink-0 border border-border mt-0.5">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 text-xs justify-start animate-in fade-in duration-200">
              <div className="h-7 w-7 rounded-md bg-primary/20 text-primary-text flex items-center justify-center shrink-0 border border-primary/30">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-muted/40 border border-border/80 rounded-xl rounded-tl-none p-3.5 flex items-center gap-2 text-muted-foreground shadow-2xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-text" />
                <span className="font-medium text-foreground/80">
                  {activeToolStep?.label ||
                    "Consulting deterministic tools and verifying balances..."}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Quick Action Suggestion Pills */}
        <div className="p-2 px-4 border-t border-border/60 bg-muted/20 flex items-center gap-2 overflow-x-auto text-xs shrink-0 no-scrollbar">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary-text" />
            Quick:
          </span>
          {quickPrompts.map((qp) => (
            <button
              key={qp.title}
              type="button"
              onClick={() => handleSendMessage(qp.prompt)}
              disabled={isLoading}
              className="bg-background hover:bg-muted border border-border/80 text-muted-foreground hover:text-foreground text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors shrink-0 shadow-2xs"
            >
              {qp.title}
            </button>
          ))}
        </div>

        {/* Bottom Input Field */}
        <div className="p-3 border-t border-border/80 bg-background shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask about cash runway, what-if purchases, overdue debtors, or supplier bills..."
              disabled={isLoading}
              className="flex-1 bg-muted/30 border border-border rounded-lg px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary transition-all"
            />
            <Button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              size="sm"
              className="h-9 px-3.5 gap-1.5 text-xs"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Ask</span>
                </>
              )}
            </Button>
          </form>
          <div className="text-[10px] text-muted-foreground mt-1 text-center font-mono">
            Deterministic Engine &bull; Zero Mental Arithmetic &bull; HITL Gated
            Actions
          </div>
        </div>
      </Card>
    </div>
  );
}
