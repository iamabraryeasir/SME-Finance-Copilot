"use client";

import { AlertCircle, Calendar, Clock, FileText, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  dueDate: string;
  status: "OVERDUE" | "PENDING" | "PAID" | "DRAFT" | "CANCELLED";
  currency?: string;
  daysOverdue?: number;
}

interface InvoiceWidgetProps {
  invoices: InvoiceItem[];
  currencySymbol?: string;
  onDraftReminder?: (invoice: InvoiceItem) => void;
}

export function InvoiceWidget({
  invoices = [],
  currencySymbol = "৳",
  onDraftReminder,
}: InvoiceWidgetProps) {
  if (!invoices || invoices.length === 0) return null;

  return (
    <div className="my-3 space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
        <span>Relevant Invoices ({invoices.length})</span>
        <span className="text-[10px] lowercase font-normal">
          Click action to draft reminder
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {invoices.map((inv) => {
          const isOverdue =
            inv.status === "OVERDUE" ||
            (inv.daysOverdue && inv.daysOverdue > 0);
          const isPaid = inv.status === "PAID";

          return (
            <div
              key={inv.id || inv.invoiceNumber}
              className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-3 shadow-xs transition-all hover:border-primary-text/40 hover:shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-mono text-xs font-semibold text-foreground truncate">
                        {inv.invoiceNumber}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-muted-foreground truncate">
                      {inv.customerName}
                    </p>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 font-medium ${
                      isOverdue
                        ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"
                        : isPaid
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {isOverdue ? (
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-2.5 w-2.5" />
                        {inv.daysOverdue
                          ? `${inv.daysOverdue}d Overdue`
                          : "Overdue"}
                      </span>
                    ) : isPaid ? (
                      "Paid"
                    ) : (
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" /> Pending
                      </span>
                    )}
                  </Badge>
                </div>

                <div className="mt-2.5 flex items-baseline justify-between border-t border-border/40 pt-2">
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Due {new Date(inv.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="font-mono text-sm font-bold text-foreground">
                    {currencySymbol}
                    {Number(inv.amount).toLocaleString()}
                  </div>
                </div>
              </div>

              {isOverdue && onDraftReminder && (
                <div className="mt-2.5 pt-2 border-t border-border/30">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDraftReminder(inv)}
                    className="w-full h-7 text-xs font-medium text-primary-text border-primary/40 bg-primary/10 hover:bg-primary/20 gap-1.5"
                  >
                    <Send className="h-3 w-3" />
                    Draft Reminder
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
