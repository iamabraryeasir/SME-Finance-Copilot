import { prisma } from "@/lib/prisma";
import type {
  CreateRecurringScheduleInput,
  UpdateRecurringScheduleInput,
} from "@/validations/recurring";

export interface ProjectedRecurringCommitment {
  scheduleId: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD
}

/**
 * Retrieves all active and inactive recurring overhead commitments for a tenant.
 */
export async function getRecurringSchedules(userId: string) {
  if (!userId) {
    throw new Error("Tenant isolation violation: userId is required");
  }

  return prisma.recurringSchedule.findMany({
    where: { userId },
    orderBy: [{ isActive: "desc" }, { dayOfMonth: "asc" }],
  });
}

/**
 * Creates a new recurring schedule commitment with tenant isolation and audit logging.
 */
export async function createRecurringSchedule(
  userId: string,
  input: CreateRecurringScheduleInput,
  ipAddress?: string,
) {
  if (!userId) {
    throw new Error("Tenant isolation violation: userId is required");
  }

  return prisma.$transaction(async (tx) => {
    const schedule = await tx.recurringSchedule.create({
      data: {
        userId,
        title: input.title,
        category: input.category,
        amount: input.amount,
        currency: input.currency || "BDT",
        frequency: input.frequency || "MONTHLY",
        dayOfMonth: input.dayOfMonth,
        nextDueDate: input.nextDueDate,
        isActive: input.isActive ?? true,
      },
    });

    await tx.auditLog.create({
      data: {
        userId,
        actor: "USER",
        actionType: "SETTINGS_UPDATED",
        entityType: "RecurringSchedule",
        entityId: schedule.id,
        status: "SUCCESS",
        ipAddress: ipAddress ?? null,
        details: {
          action: "RECURRING_SCHEDULE_CREATED",
          title: schedule.title,
          category: schedule.category,
          amount: schedule.amount,
          frequency: schedule.frequency,
          dayOfMonth: schedule.dayOfMonth,
        },
      },
    });

    return schedule;
  });
}

/**
 * Updates an existing recurring schedule commitment.
 */
export async function updateRecurringSchedule(
  userId: string,
  scheduleId: string,
  input: UpdateRecurringScheduleInput,
  ipAddress?: string,
) {
  if (!userId) {
    throw new Error("Tenant isolation violation: userId is required");
  }

  const existing = await prisma.recurringSchedule.findFirst({
    where: { id: scheduleId, userId },
  });

  if (!existing) {
    throw new Error("Recurring schedule commitment not found");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.recurringSchedule.update({
      where: { id: scheduleId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.amount !== undefined && { amount: input.amount }),
        ...(input.currency !== undefined && { currency: input.currency }),
        ...(input.frequency !== undefined && { frequency: input.frequency }),
        ...(input.dayOfMonth !== undefined && {
          dayOfMonth: input.dayOfMonth,
        }),
        ...(input.nextDueDate !== undefined && {
          nextDueDate: input.nextDueDate,
        }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    await tx.auditLog.create({
      data: {
        userId,
        actor: "USER",
        actionType: "SETTINGS_UPDATED",
        entityType: "RecurringSchedule",
        entityId: scheduleId,
        status: "SUCCESS",
        ipAddress: ipAddress ?? null,
        details: {
          action: "RECURRING_SCHEDULE_UPDATED",
          previous: {
            title: existing.title,
            amount: existing.amount,
            category: existing.category,
            isActive: existing.isActive,
          },
          updated: {
            title: updated.title,
            amount: updated.amount,
            category: updated.category,
            isActive: updated.isActive,
          },
        },
      },
    });

    return updated;
  });
}

/**
 * Deletes a recurring schedule commitment.
 */
export async function deleteRecurringSchedule(
  userId: string,
  scheduleId: string,
  ipAddress?: string,
) {
  if (!userId) {
    throw new Error("Tenant isolation violation: userId is required");
  }

  const existing = await prisma.recurringSchedule.findFirst({
    where: { id: scheduleId, userId },
  });

  if (!existing) {
    throw new Error("Recurring schedule commitment not found");
  }

  return prisma.$transaction(async (tx) => {
    await tx.recurringSchedule.delete({
      where: { id: scheduleId },
    });

    await tx.auditLog.create({
      data: {
        userId,
        actor: "USER",
        actionType: "SETTINGS_UPDATED",
        entityType: "RecurringSchedule",
        entityId: scheduleId,
        status: "SUCCESS",
        ipAddress: ipAddress ?? null,
        details: {
          action: "RECURRING_SCHEDULE_DELETED",
          deletedTitle: existing.title,
          amount: existing.amount,
        },
      },
    });

    return { id: scheduleId, deleted: true };
  });
}

/**
 * Projects all recurring commitments occurring within a specified date window [startDate, endDate].
 * Operates purely mathematically with zero LLM text generation.
 */
export function projectRecurringCommitments(
  schedules: Array<{
    id: string;
    title: string;
    category: string;
    amount: number;
    currency: string;
    frequency: string;
    dayOfMonth: number;
    nextDueDate: Date;
    isActive: boolean;
  }>,
  startDate: Date,
  endDate: Date,
): ProjectedRecurringCommitment[] {
  const commitments: ProjectedRecurringCommitment[] = [];
  const startMs = new Date(startDate.toISOString().slice(0, 10)).getTime();
  const endMs = new Date(endDate.toISOString().slice(0, 10)).getTime();

  for (const schedule of schedules) {
    if (!schedule.isActive || schedule.amount <= 0) continue;

    if (schedule.frequency === "MONTHLY") {
      // Iterate through months from startDate to endDate
      const currentCursor = new Date(startMs);
      currentCursor.setUTCDate(1);

      while (currentCursor.getTime() <= endMs) {
        const year = currentCursor.getUTCFullYear();
        const month = currentCursor.getUTCMonth(); // 0-indexed

        // Get max days in this specific month
        const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        const executionDay = Math.min(schedule.dayOfMonth, daysInMonth);

        const occurrenceDate = new Date(Date.UTC(year, month, executionDay));
        const occurrenceMs = occurrenceDate.getTime();

        if (occurrenceMs >= startMs && occurrenceMs <= endMs) {
          commitments.push({
            scheduleId: schedule.id,
            title: schedule.title,
            category: schedule.category,
            amount: Math.round(schedule.amount * 100) / 100,
            currency: schedule.currency,
            date: occurrenceDate.toISOString().slice(0, 10),
          });
        }

        // Advance to next month
        currentCursor.setUTCMonth(currentCursor.getUTCMonth() + 1);
      }
    } else if (schedule.frequency === "WEEKLY") {
      let cursor = new Date(schedule.nextDueDate.toISOString().slice(0, 10));
      while (cursor.getTime() < startMs) {
        cursor = new Date(cursor.getTime() + 7 * 86400000);
      }
      while (cursor.getTime() <= endMs) {
        commitments.push({
          scheduleId: schedule.id,
          title: schedule.title,
          category: schedule.category,
          amount: Math.round(schedule.amount * 100) / 100,
          currency: schedule.currency,
          date: cursor.toISOString().slice(0, 10),
        });
        cursor = new Date(cursor.getTime() + 7 * 86400000);
      }
    } else if (schedule.frequency === "BIWEEKLY") {
      let cursor = new Date(schedule.nextDueDate.toISOString().slice(0, 10));
      while (cursor.getTime() < startMs) {
        cursor = new Date(cursor.getTime() + 14 * 86400000);
      }
      while (cursor.getTime() <= endMs) {
        commitments.push({
          scheduleId: schedule.id,
          title: schedule.title,
          category: schedule.category,
          amount: Math.round(schedule.amount * 100) / 100,
          currency: schedule.currency,
          date: cursor.toISOString().slice(0, 10),
        });
        cursor = new Date(cursor.getTime() + 14 * 86400000);
      }
    } else {
      // QUARTERLY, ANNUALLY or single nextDueDate fallback
      const dueMs = new Date(
        schedule.nextDueDate.toISOString().slice(0, 10),
      ).getTime();
      if (dueMs >= startMs && dueMs <= endMs) {
        commitments.push({
          scheduleId: schedule.id,
          title: schedule.title,
          category: schedule.category,
          amount: Math.round(schedule.amount * 100) / 100,
          currency: schedule.currency,
          date: schedule.nextDueDate.toISOString().slice(0, 10),
        });
      }
    }
  }

  // Sort chronologically by date
  return commitments.sort((a, b) => a.date.localeCompare(b.date));
}
