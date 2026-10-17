"use client";

import { useForm } from "@tanstack/react-form";
import {
  Building2,
  Coins,
  History,
  Save,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateBusinessProfileSchema } from "@/validations/business-profile";

interface ProfileData {
  companyName: string;
  currency: string;
  openingBalance: number;
  minReserveThreshold: number;
  latePaymentAssumptionDays: number;
  upcomingPaymentAlertDays: number;
  expenseBaselineMonthly?: number | null;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("Failed to load business profile");
        const data = await res.json();
        setProfile(data.data?.profile ?? data.profile);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to load settings";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground font-mono">
            Loading settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Financial Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure SME business profile, operational currency, and forecasting
          parameters.
        </p>
      </div>

      <SettingsForm initialData={profile} />
    </div>
  );
}

function SettingsForm({ initialData }: { initialData: ProfileData | null }) {
  const form = useForm({
    defaultValues: {
      companyName: initialData?.companyName || "My SME Enterprise",
      currency:
        (initialData?.currency as "BDT" | "USD" | "EUR" | "GBP") || "BDT",
      openingBalance: initialData?.openingBalance ?? 0,
      minReserveThreshold: initialData?.minReserveThreshold ?? 50000,
      latePaymentAssumptionDays: initialData?.latePaymentAssumptionDays ?? 7,
      upcomingPaymentAlertDays: initialData?.upcomingPaymentAlertDays ?? 3,
      expenseBaselineMonthly: initialData?.expenseBaselineMonthly ?? 0,
    },
    onSubmit: async ({ value }) => {
      try {
        const parsed = updateBusinessProfileSchema.parse({
          ...value,
          openingBalance: Number(value.openingBalance),
          minReserveThreshold: Number(value.minReserveThreshold),
          latePaymentAssumptionDays: Number(value.latePaymentAssumptionDays),
          upcomingPaymentAlertDays: Number(value.upcomingPaymentAlertDays),
          expenseBaselineMonthly: value.expenseBaselineMonthly
            ? Number(value.expenseBaselineMonthly)
            : null,
        });

        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to update profile");
        }

        toast.success("Settings saved successfully");
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to save settings";
        toast.error(msg);
      }
    },
  });

  const currency = form.getFieldValue("currency");
  const currencySymbol =
    currency === "USD"
      ? "$"
      : currency === "EUR"
        ? "€"
        : currency === "GBP"
          ? "£"
          : "৳";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-5"
    >
      {/* Card 1: Business Profile */}
      <Card className="border-border/80 bg-card shadow-2xs">
        <CardHeader className="border-b border-border/60 py-3 px-5">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              Business Profile
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Company Name */}
            <form.Field
              name="companyName"
              validators={{
                onChange: ({ value }) =>
                  !value || value.length < 2
                    ? "Company name must be at least 2 characters"
                    : undefined,
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name} className="text-xs font-medium">
                    Company Name
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. Acme Industrial Supplies Ltd"
                    className="h-9 text-xs bg-background/50"
                  />
                  {field.state.meta.errors && (
                    <p className="text-xs text-destructive">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            {/* Operational Currency */}
            <form.Field name="currency">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name} className="text-xs font-medium">
                    Operational Currency
                  </Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(val) => {
                      if (val) {
                        field.handleChange(
                          val as "BDT" | "USD" | "EUR" | "GBP",
                        );
                      }
                    }}
                  >
                    <SelectTrigger
                      id={field.name}
                      className="h-9 w-full text-xs bg-background/50 border-input font-medium"
                    >
                      <SelectValue placeholder="Select currency">
                        {(val) => {
                          switch (val) {
                            case "BDT":
                              return "BDT (৳) — Bangladeshi Taka";
                            case "USD":
                              return "USD ($) — US Dollar";
                            case "EUR":
                              return "EUR (€) — Euro";
                            case "GBP":
                              return "GBP (£) — British Pound";
                            default:
                              return val;
                          }
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BDT">
                        BDT (৳) — Bangladeshi Taka
                      </SelectItem>
                      <SelectItem value="USD">USD ($) — US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR (€) — Euro</SelectItem>
                      <SelectItem value="GBP">
                        GBP (£) — British Pound
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Cash Baseline & Reserve */}
      <Card className="border-border/80 bg-card shadow-2xs">
        <CardHeader className="border-b border-border/60 py-3 px-5">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              Cash Baseline & Reserve Floor
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Opening Cash Balance */}
            <form.Field
              name="openingBalance"
              validators={{
                onChange: ({ value }) =>
                  value < 0 ? "Cannot be negative" : undefined,
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name} className="text-xs font-medium">
                    Opening Cash Balance
                  </Label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-mono font-bold text-muted-foreground">
                      {currencySymbol}
                    </span>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="number"
                      step="0.01"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                      className="h-9 pl-8 text-xs font-mono font-medium bg-background/50"
                    />
                  </div>
                  {field.state.meta.errors && (
                    <p className="text-xs text-destructive">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            {/* Minimum Safety Reserve Buffer */}
            <form.Field
              name="minReserveThreshold"
              validators={{
                onChange: ({ value }) =>
                  value < 0 ? "Cannot be negative" : undefined,
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name} className="text-xs font-medium">
                    Safety Reserve Threshold
                  </Label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-mono font-bold text-muted-foreground">
                      {currencySymbol}
                    </span>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="number"
                      step="0.01"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                      className="h-9 pl-8 text-xs font-mono font-medium bg-background/50"
                    />
                  </div>
                  {field.state.meta.errors && (
                    <p className="text-xs text-destructive">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Forecasting Parameters */}
      <Card className="border-border/80 bg-card shadow-2xs">
        <CardHeader className="border-b border-border/60 py-3 px-5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              Forecasting Parameters
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Late Payment Buffer Days */}
            <form.Field
              name="latePaymentAssumptionDays"
              validators={{
                onChange: ({ value }) =>
                  value < 0 || value > 90
                    ? "Buffer must be between 0 and 90 days"
                    : undefined,
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name} className="text-xs font-medium">
                    Customer Delay Buffer
                  </Label>
                  <div className="relative flex items-center">
                    <Input
                      id={field.name}
                      name={field.name}
                      type="number"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                      className="h-9 pr-12 text-xs font-mono font-medium bg-background/50"
                    />
                    <span className="absolute right-3 text-xs text-muted-foreground font-mono">
                      days
                    </span>
                  </div>
                </div>
              )}
            </form.Field>

            {/* Supplier Alert Horizon */}
            <form.Field
              name="upcomingPaymentAlertDays"
              validators={{
                onChange: ({ value }) =>
                  value < 1 || value > 30
                    ? "Horizon must be between 1 and 30 days"
                    : undefined,
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name} className="text-xs font-medium">
                    Supplier Alert Horizon
                  </Label>
                  <div className="relative flex items-center">
                    <Input
                      id={field.name}
                      name={field.name}
                      type="number"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                      className="h-9 pr-12 text-xs font-mono font-medium bg-background/50"
                    />
                    <span className="absolute right-3 text-xs text-muted-foreground font-mono">
                      days
                    </span>
                  </div>
                </div>
              )}
            </form.Field>

            {/* Monthly Expense Baseline */}
            <form.Field
              name="expenseBaselineMonthly"
              validators={{
                onChange: ({ value }) =>
                  value < 0 ? "Cannot be negative" : undefined,
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name} className="text-xs font-medium">
                    Monthly Expense Baseline
                  </Label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-mono font-bold text-muted-foreground">
                      {currencySymbol}
                    </span>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="number"
                      step="0.01"
                      value={field.state.value || 0}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                      className="h-9 pl-8 text-xs font-mono font-medium bg-background/50"
                    />
                  </div>
                </div>
              )}
            </form.Field>
          </div>
        </CardContent>
      </Card>

      {/* Save Action Footer */}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-card px-4 py-3 shadow-2xs">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
          <History className="h-3.5 w-3.5" />
          <span>Audit Logged</span>
        </div>

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="gap-2 px-5 text-xs h-9 font-semibold"
            >
              {isSubmitting ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Settings</span>
                </>
              )}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
