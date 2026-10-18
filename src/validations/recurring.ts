import { z } from "zod";

export const recurringScheduleCategories = [
  "RENT",
  "PAYROLL",
  "LOAN_REPAYMENT",
  "UTILITIES",
  "TAX",
  "OTHER",
] as const;

export const recurringScheduleFrequencies = [
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "ANNUALLY",
] as const;

export const createRecurringScheduleSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(100, "Title cannot exceed 100 characters"),
  category: z.enum(recurringScheduleCategories, {
    message: "Invalid commitment category",
  }),
  amount: z
    .number()
    .positive("Commitment amount must be greater than zero")
    .max(1_000_000_000, "Amount exceeds system limit"),
  currency: z.string().trim().default("BDT"),
  frequency: z.enum(recurringScheduleFrequencies).default("MONTHLY"),
  dayOfMonth: z
    .number()
    .int("Day must be an integer")
    .min(1, "Day must be between 1 and 31")
    .max(31, "Day must be between 1 and 31"),
  nextDueDate: z
    .string()
    .datetime({ message: "Invalid ISO date string for nextDueDate" })
    .or(z.date())
    .transform((val) => (val instanceof Date ? val : new Date(val))),
  isActive: z.boolean().default(true),
});

export const updateRecurringScheduleSchema =
  createRecurringScheduleSchema.partial();

export type CreateRecurringScheduleInput = z.infer<
  typeof createRecurringScheduleSchema
>;
export type UpdateRecurringScheduleInput = z.infer<
  typeof updateRecurringScheduleSchema
>;
