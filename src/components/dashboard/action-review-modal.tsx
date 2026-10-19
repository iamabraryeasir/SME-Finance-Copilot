"use client";

import { Loader2, Mail, Send, Sparkles, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ActionDraftDetails {
  id: string;
  invoiceNumber: string;
  recipientName: string;
  recipientContact?: string;
  amount?: number;
  dueDate?: string;
  subject?: string;
  content?: string;
  currencySymbol?: string;
}

interface ActionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: ActionDraftDetails | null;
  onDecisionComplete?: (
    draftId: string,
    decision: "APPROVED" | "REJECTED",
  ) => void;
}

type ReminderTone = "PROFESSIONAL" | "URGENT" | "FINAL_NOTICE";

export function ActionReviewModal({
  isOpen,
  onClose,
  draft,
  onDecisionComplete,
}: ActionReviewModalProps) {
  const [tone, setTone] = useState<ReminderTone>("PROFESSIONAL");
  const [recipientContact, setRecipientContact] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when draft opens or changes
  useEffect(() => {
    if (draft) {
      setRecipientContact(draft.recipientContact || "billing@customer.com");
      setSubject(
        draft.subject ||
          `Friendly Reminder: Payment for Invoice #${draft.invoiceNumber}`,
      );
      setContent(
        draft.content ||
          `Dear ${draft.recipientName},\n\nWe hope this email finds you well. This is a gentle reminder that invoice #${draft.invoiceNumber} for ${draft.currencySymbol || "৳"}${draft.amount?.toLocaleString() || "0"} was due on ${draft.dueDate ? new Date(draft.dueDate).toLocaleDateString() : "the scheduled date"}.\n\nPlease let us know once payment has been initiated or if you require an additional copy of the invoice.\n\nThank you for your business,\nFinance & Accounts Operations`,
      );
      setTone("PROFESSIONAL");
    }
  }, [draft]);

  if (!isOpen || !draft) return null;

  const symbol = draft.currencySymbol || "৳";
  const formattedAmount = draft.amount
    ? `${symbol}${draft.amount.toLocaleString()}`
    : "";
  const formattedDueDate = draft.dueDate
    ? new Date(draft.dueDate).toLocaleDateString()
    : "Past Due";

  const applyTonePreset = (newTone: ReminderTone) => {
    setTone(newTone);
    if (newTone === "PROFESSIONAL") {
      setSubject(
        `Friendly Reminder: Payment for Invoice #${draft.invoiceNumber}`,
      );
      setContent(
        `Dear ${draft.recipientName},\n\nWe hope this message finds you well. This is a friendly reminder that invoice #${draft.invoiceNumber} (${formattedAmount}) was due on ${formattedDueDate}.\n\nIf payment has already been sent, please disregard this note. Otherwise, kindly confirm the expected remittance date at your convenience.\n\nBest regards,\nFinance & Accounts Operations`,
      );
    } else if (newTone === "URGENT") {
      setSubject(`URGENT: Past Due Notice for Invoice #${draft.invoiceNumber}`);
      setContent(
        `Dear ${draft.recipientName},\n\nOur accounts receivable records indicate that invoice #${draft.invoiceNumber} in the amount of ${formattedAmount} is overdue (original due date: ${formattedDueDate}).\n\nTo ensure continuity of service and maintain your credit terms, please process payment promptly or share the transfer confirmation.\n\nSincerely,\nFinance & Accounts Operations`,
      );
    } else if (newTone === "FINAL_NOTICE") {
      setSubject(
        `FINAL NOTICE: Immediate Settlement Required - Invoice #${draft.invoiceNumber}`,
      );
      setContent(
        `Dear ${draft.recipientName},\n\nDespite previous reminders, invoice #${draft.invoiceNumber} for ${formattedAmount} remains unsettled as of today.\n\nPlease remit payment immediately to prevent account suspension and further collection escalation under our agreement.\n\nAccounts Receivable Team`,
      );
    }
  };

  const handleSubmit = async (decision: "APPROVED" | "REJECTED") => {
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/actions/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: decision,
          subject: decision === "APPROVED" ? subject : undefined,
          content: decision === "APPROVED" ? content : undefined,
          recipientContact:
            decision === "APPROVED" ? recipientContact : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.message || `Action failed with status ${res.status}`,
        );
      }

      toast.success(
        decision === "APPROVED"
          ? "Payment reminder approved and dispatched!"
          : "Action draft dismissed.",
      );

      if (onDecisionComplete) {
        onDecisionComplete(draft.id, decision);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Action failed";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-modal-title"
        className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary-text">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="action-modal-title"
                  className="text-lg font-bold text-foreground"
                >
                  Human-in-the-Loop Action Review
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium"
                >
                  Pending Authorization
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Verify and personalize reminder copy before dispatching to the
                counterparty.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Target Metadata Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl border border-border/80 bg-muted/30 text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                Counterparty
              </span>
              <span className="font-medium text-foreground truncate block">
                {draft.recipientName}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                Invoice Number
              </span>
              <span className="font-mono font-medium text-foreground truncate block">
                {draft.invoiceNumber}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                Due Date
              </span>
              <span className="font-medium text-foreground truncate block">
                {formattedDueDate}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                Outstanding Balance
              </span>
              <span className="font-mono font-bold text-foreground block">
                {formattedAmount}
              </span>
            </div>
          </div>

          {/* Tone Selector */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary-text" />{" "}
                Communication Tone
              </span>
              <span className="text-[11px] font-normal text-muted-foreground">
                Selects tailored copy preset
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyTonePreset("PROFESSIONAL")}
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  tone === "PROFESSIONAL"
                    ? "border-primary bg-primary/10 text-primary-text shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:border-border/80"
                }`}
              >
                <span>Professional</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Gentle & Polite
                </span>
              </button>

              <button
                type="button"
                onClick={() => applyTonePreset("URGENT")}
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  tone === "URGENT"
                    ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:border-border/80"
                }`}
              >
                <span>Urgent</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Firm & Prompt
                </span>
              </button>

              <button
                type="button"
                onClick={() => applyTonePreset("FINAL_NOTICE")}
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  tone === "FINAL_NOTICE"
                    ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:border-border/80"
                }`}
              >
                <span>Final Notice</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Escalation Risk
                </span>
              </button>
            </div>
          </div>

          {/* Recipient Contact */}
          <div className="space-y-1.5">
            <label
              htmlFor="recipient-contact-input"
              className="text-xs font-semibold text-foreground flex items-center justify-between"
            >
              <span>Recipient Email / Contact</span>
              <span className="text-[10px] text-muted-foreground">
                Delivered via verified channel
              </span>
            </label>
            <input
              id="recipient-contact-input"
              type="text"
              value={recipientContact}
              onChange={(e) => setRecipientContact(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/40 font-sans"
              placeholder="billing@customer.com"
            />
          </div>

          {/* Subject Line */}
          <div className="space-y-1.5">
            <label
              htmlFor="reminder-subject-input"
              className="text-xs font-semibold text-foreground"
            >
              Subject Line
            </label>
            <input
              id="reminder-subject-input"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/40 font-sans"
              placeholder="Invoice payment reminder"
            />
          </div>

          {/* Message Content */}
          <div className="space-y-1.5">
            <label
              htmlFor="reminder-body-input"
              className="text-xs font-semibold text-foreground flex items-center justify-between"
            >
              <span>Message Body</span>
              <span className="text-[10px] text-muted-foreground">
                Audited & recorded in ledger
              </span>
            </label>
            <textarea
              id="reminder-body-input"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/40 font-sans resize-none leading-relaxed"
              placeholder="Reminder message body..."
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-border bg-muted/10 gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSubmit("REJECTED")}
            disabled={isSubmitting}
            className="text-xs text-muted-foreground hover:text-red-600 dark:hover:text-red-400 gap-1.5 h-9"
          >
            <XCircle className="h-3.5 w-3.5" />
            Dismiss Draft
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs h-9"
            >
              Cancel
            </Button>

            <Button
              size="sm"
              onClick={() => handleSubmit("APPROVED")}
              disabled={isSubmitting}
              className="text-xs h-9 font-medium bg-primary text-black hover:bg-primary/90 gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Dispatching...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Approve & Dispatch
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
