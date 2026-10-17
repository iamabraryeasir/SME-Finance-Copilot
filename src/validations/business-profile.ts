import { z } from "zod";

export const updateBusinessProfileSchema = z.object({
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be at most 100 characters"),
  currency: z.enum(["BDT", "USD", "EUR", "GBP"]).default("BDT"),
  openingBalance: z.number().min(0, "Opening balance cannot be negative"),
  openingBalanceDate: z
    .union([z.string(), z.date()])
    .optional()
    .transform((val) => (val ? new Date(val) : new Date())),
  minReserveThreshold: z
    .number()
    .min(0, "Reserve threshold cannot be negative"),
  latePaymentAssumptionDays: z
    .number()
    .int("Delay days must be an integer")
    .min(0, "Delay buffer cannot be negative")
    .max(90, "Delay buffer cannot exceed 90 days"),
  upcomingPaymentAlertDays: z
    .number()
    .int("Alert days must be an integer")
    .min(1, "Alert horizon must be at least 1 day")
    .max(30, "Alert horizon cannot exceed 30 days"),
  expenseBaselineMonthly: z
    .number()
    .min(0, "Baseline expense cannot be negative")
    .optional()
    .nullable(),
});

export type UpdateBusinessProfileInput = z.infer<
  typeof updateBusinessProfileSchema
>;
