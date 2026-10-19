"use client";

import {
  Building2,
  Check,
  CreditCard,
  Landmark,
  Loader2,
  Plus,
  Receipt,
  Repeat,
  Trash2,
  Users,
  X,
  Zap,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface RecurringItem {
  id: string;
  title: string;
  category:
    | "RENT"
    | "PAYROLL"
    | "LOAN_REPAYMENT"
    | "UTILITIES"
    | "TAX"
    | "OTHER";
  amount: number;
  currency: string;
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY";
  dayOfMonth: number;
  nextDueDate: string;
  isActive: boolean;
}

interface RecurringSchedulesCardProps {
  currency: string;
  onScheduleChanged?: () => void;
}

export function RecurringSchedulesCard({
  currency,
  onScheduleChanged,
}: RecurringSchedulesCardProps) {
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<RecurringItem["category"]>("RENT");
  const [amount, setAmount] = useState<number>(35000);
  const [frequency, setFrequency] =
    useState<RecurringItem["frequency"]>("MONTHLY");
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [nextDueDate, setNextDueDate] = useState<string>(
    new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0],
  );

  const symbol = currency === "BDT" ? "৳" : "$";

  const fetchSchedules = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/recurring");
      const json = await res.json();
      if (res.ok && json.success) {
        setItems(json.data);
      }
    } catch (err) {
      console.error("Failed to load recurring schedules", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) {
      toast.error("Please enter a valid title and amount");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          amount,
          currency,
          frequency,
          dayOfMonth,
          nextDueDate: new Date(nextDueDate).toISOString(),
          isActive: true,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to create commitment");
      }

      toast.success("Recurring commitment saved!");
      setIsAdding(false);
      setTitle("");
      await fetchSchedules();
      onScheduleChanged?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (item: RecurringItem) => {
    try {
      const res = await fetch(`/api/recurring/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update status");
      }

      toast.success(
        item.isActive ? "Commitment paused" : "Commitment activated",
      );
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, isActive: !item.isActive } : i,
        ),
      );
      onScheduleChanged?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle";
      toast.error(msg);
    }
  };

  const handleDelete = async (id: string, itemTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${itemTitle}"?`)) return;

    try {
      const res = await fetch(`/api/recurring/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to delete");
      }

      toast.success("Commitment deleted");
      setItems((prev) => prev.filter((i) => i.id !== id));
      onScheduleChanged?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      toast.error(msg);
    }
  };

  const getCategoryIcon = (cat: RecurringItem["category"]) => {
    switch (cat) {
      case "RENT":
        return <Building2 className="h-4 w-4 text-blue-500" />;
      case "PAYROLL":
        return <Users className="h-4 w-4 text-emerald-500" />;
      case "LOAN_REPAYMENT":
        return <Landmark className="h-4 w-4 text-amber-500" />;
      case "UTILITIES":
        return <Zap className="h-4 w-4 text-purple-500" />;
      case "TAX":
        return <Receipt className="h-4 w-4 text-rose-500" />;
      default:
        return <CreditCard className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const totalMonthlyCommitment = items
    .filter((i) => i.isActive)
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <Card className="border border-border shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Repeat className="h-4 w-4 text-primary-text" />
                Recurring Overhead & Fixed Commitments
              </CardTitle>
              <Badge variant="secondary" className="text-xs font-mono">
                {items.filter((i) => i.isActive).length} Active
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Automatically projected into the 30-day cash forecast on their due
              dates. Total monthly obligation:{" "}
              <span className="font-mono font-semibold text-foreground">
                {symbol}
                {totalMonthlyCommitment.toLocaleString()}
              </span>
            </CardDescription>
          </div>

          <Button
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
            className="gap-1.5 text-xs h-8"
          >
            {isAdding ? (
              <>
                <X className="h-3.5 w-3.5" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Add Commitment
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Inline Add Form */}
        {isAdding && (
          <form
            onSubmit={handleCreate}
            className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-4 text-xs"
          >
            <div className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary-text" />
              Configure New Overhead Commitment
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="rec-title" className="text-xs">
                  Title / Vendor
                </Label>
                <Input
                  id="rec-title"
                  placeholder="e.g. Head Office Lease"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="rec-category" className="text-xs">
                  Category
                </Label>
                <select
                  id="rec-category"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as RecurringItem["category"])
                  }
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="RENT">Rent / Lease</option>
                  <option value="PAYROLL">Payroll / Salaries</option>
                  <option value="LOAN_REPAYMENT">Loan Repayment</option>
                  <option value="UTILITIES">Utilities / Internet</option>
                  <option value="TAX">Tax / Vat</option>
                  <option value="OTHER">Other Overhead</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="rec-amount" className="text-xs">
                  Amount ({symbol})
                </Label>
                <Input
                  id="rec-amount"
                  type="number"
                  min="1"
                  step="500"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="rec-freq" className="text-xs">
                  Frequency
                </Label>
                <select
                  id="rec-freq"
                  value={frequency}
                  onChange={(e) =>
                    setFrequency(e.target.value as RecurringItem["frequency"])
                  }
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="BIWEEKLY">Biweekly</option>
                  <option value="QUARTERLY">Quarterly</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="rec-day" className="text-xs">
                  Day of Month (1-31)
                </Label>
                <Input
                  id="rec-day"
                  type="number"
                  min="1"
                  max="31"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="rec-due" className="text-xs">
                  Next Due Date
                </Label>
                <Input
                  id="rec-due"
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAdding(false)}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="h-7 text-xs gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3" />
                    Save Commitment
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Commitment Items List */}
        {isLoading ? (
          <div className="py-8 flex justify-center items-center text-muted-foreground gap-2 text-xs">
            <Loader2 className="h-4 w-4 animate-spin text-primary-text" />
            Loading commitments...
          </div>
        ) : items.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg p-6">
            <p className="font-medium text-foreground">
              No recurring overhead commitments configured.
            </p>
            <p className="mt-1">
              Add your monthly rent, payroll, and debt commitments to ensure
              accurate cash-flow forecasting.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => {
              const dueStr = new Date(item.nextDueDate).toLocaleDateString(
                undefined,
                { month: "short", day: "numeric" },
              );

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border transition-all flex flex-col justify-between gap-3 text-xs ${
                    item.isActive
                      ? "bg-card border-border hover:border-primary/40"
                      : "bg-muted/30 border-border/60 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-muted border border-border">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground truncate max-w-[150px]">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase font-mono">
                          {item.category.replace("_", " ")} &bull;{" "}
                          {item.frequency.toLowerCase()}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-foreground">
                        {symbol}
                        {item.amount.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Due: {dueStr} (Day {item.dayOfMonth})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item)}
                      className={`font-medium transition-colors ${
                        item.isActive
                          ? "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {item.isActive ? "● Active" : "○ Paused"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.title)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      title="Delete commitment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
