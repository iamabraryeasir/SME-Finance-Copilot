import { z } from "zod";

export const simulateScenarioSchema = z.object({
  expenseAmount: z
    .number()
    .positive("Simulated expense amount must be greater than zero")
    .max(1_000_000_000, "Amount exceeds system limit"),
  expenseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  dayIndex: z.number().int().min(1).max(30).optional(),
  expenseTitle: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(100)
    .default("Simulated One-Off Purchase"),
  category: z.string().trim().default("SUPPLIER_PAYMENT"),
  overrideLateDelayDays: z.number().int().min(0).max(60).optional(),
});

export type SimulateScenarioInput = z.infer<typeof simulateScenarioSchema>;
