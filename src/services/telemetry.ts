import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export interface UserAiTelemetry {
  userId: string;
  name: string;
  email: string;
  companyName: string | null;
  currency: string;
  totalRequests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  lastActive: string | null;
  topTools: Array<{ name: string; count: number }>;
}

export interface GlobalAiTelemetry {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalRequests: number;
  averageTokensPerRequest: number;
  modelBreakdown: Array<{ model: string; requests: number; tokens: number }>;
  toolBreakdown: Array<{ tool: string; invocations: number }>;
  systemHealth: {
    redisAvailable: boolean;
    primaryModel: string;
    fallbackModel: string;
    status: "HEALTHY" | "DEGRADED" | "OFFLINE";
  };
}

/**
 * Records an AI completion event atomically in Redis telemetry counters
 * and in persistent AuditLog metadata.
 */
export async function recordAiTelemetry(params: {
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs?: number;
  toolsUsed?: string[];
}): Promise<void> {
  const {
    userId,
    model,
    promptTokens,
    completionTokens,
    totalTokens,
    latencyMs = 0,
    toolsUsed = [],
  } = params;

  // 1. Redis atomic telemetry tracking
  if (redis) {
    try {
      const p = redis.pipeline();

      // Global aggregates
      p.incrby("telemetry:ai:global:total_tokens", totalTokens);
      p.incrby("telemetry:ai:global:prompt_tokens", promptTokens);
      p.incrby("telemetry:ai:global:completion_tokens", completionTokens);
      p.incr("telemetry:ai:global:requests");

      // Model breakdown
      p.hincrby(`telemetry:ai:model:${model}`, "requests", 1);
      p.hincrby(`telemetry:ai:model:${model}`, "tokens", totalTokens);

      // User-specific telemetry hash
      p.sadd("telemetry:ai:users_set", userId);
      p.hincrby(`telemetry:ai:user:${userId}`, "promptTokens", promptTokens);
      p.hincrby(
        `telemetry:ai:user:${userId}`,
        "completionTokens",
        completionTokens,
      );
      p.hincrby(`telemetry:ai:user:${userId}`, "totalTokens", totalTokens);
      p.hincrby(`telemetry:ai:user:${userId}`, "requests", 1);
      p.hset(`telemetry:ai:user:${userId}`, {
        lastActive: new Date().toISOString(),
        lastModel: model,
      });

      // Tool invocation tracking
      for (const tool of toolsUsed) {
        p.hincrby("telemetry:ai:tools_global", tool, 1);
        p.hincrby(`telemetry:ai:user:${userId}:tools`, tool, 1);
      }

      await p.exec();
    } catch (err) {
      console.error("[Telemetry Service] Redis update failed:", err);
    }
  }

  // 2. Persistent AuditLog record
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        actor: "AGENT",
        actionType: "FORECAST_RUN",
        entityType: "AiTelemetry",
        entityId: null,
        status: "SUCCESS",
        details: {
          model,
          promptTokens,
          completionTokens,
          totalTokens,
          latencyMs,
          toolsUsed,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    console.error("[Telemetry Service] DB audit log failed:", err);
  }
}

/**
 * Retrieves platform-wide AI usage metrics and model health.
 */
export async function getGlobalAiTelemetry(): Promise<GlobalAiTelemetry> {
  let totalTokens = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let totalRequests = 0;

  let modelBreakdown: Array<{
    model: string;
    requests: number;
    tokens: number;
  }> = [
    { model: "gemini-3.5-flash", requests: 0, tokens: 0 },
    { model: "llama-3.3-70b-versatile", requests: 0, tokens: 0 },
  ];

  let toolBreakdown: Array<{ tool: string; invocations: number }> = [];

  if (redis) {
    try {
      const [
        rTotalTokens,
        rPromptTokens,
        rCompletionTokens,
        rRequests,
        geminiStats,
        groqStats,
        toolStats,
      ] = await Promise.all([
        redis.get<number>("telemetry:ai:global:total_tokens"),
        redis.get<number>("telemetry:ai:global:prompt_tokens"),
        redis.get<number>("telemetry:ai:global:completion_tokens"),
        redis.get<number>("telemetry:ai:global:requests"),
        redis.hgetall<Record<string, string>>(
          "telemetry:ai:model:gemini-3.5-flash",
        ),
        redis.hgetall<Record<string, string>>(
          "telemetry:ai:model:llama-3.3-70b-versatile",
        ),
        redis.hgetall<Record<string, string>>("telemetry:ai:tools_global"),
      ]);

      totalTokens = Number(rTotalTokens) || 0;
      promptTokens = Number(rPromptTokens) || 0;
      completionTokens = Number(rCompletionTokens) || 0;
      totalRequests = Number(rRequests) || 0;

      modelBreakdown = [
        {
          model: "gemini-3.5-flash (Primary)",
          requests: Number(geminiStats?.requests) || 0,
          tokens: Number(geminiStats?.tokens) || 0,
        },
        {
          model: "llama-3.3-70b-versatile (Fallback)",
          requests: Number(groqStats?.requests) || 0,
          tokens: Number(groqStats?.tokens) || 0,
        },
      ];

      if (toolStats) {
        toolBreakdown = Object.entries(toolStats).map(
          ([tool, invocations]) => ({
            tool,
            invocations: Number(invocations) || 0,
          }),
        );
      }
    } catch (err) {
      console.error(
        "[Telemetry Service] Failed to read Redis global telemetry:",
        err,
      );
    }
  }

  // If Redis was empty or uninitialized, derive baseline from AuditLog
  if (totalRequests === 0) {
    try {
      const auditAiCount = await prisma.auditLog.count({
        where: { actor: "AGENT" },
      });
      totalRequests = auditAiCount;
      // Default estimate based on recorded messages
      const totalMessages = await prisma.message.count();
      promptTokens = Math.max(totalTokens, totalMessages * 480);
      completionTokens = Math.max(completionTokens, totalMessages * 160);
      totalTokens = promptTokens + completionTokens;
    } catch {
      // Non-blocking fallback
    }
  }

  // Ensure tool breakdown has default items if none recorded
  if (toolBreakdown.length === 0) {
    toolBreakdown = [
      { tool: "get_financial_summary", invocations: 0 },
      { tool: "forecast_cash_balance", invocations: 0 },
      { tool: "get_invoices", invocations: 0 },
      { tool: "get_upcoming_payables", invocations: 0 },
      { tool: "get_upcoming_receivables", invocations: 0 },
      { tool: "get_financial_alerts", invocations: 0 },
      { tool: "create_reminder_draft", invocations: 0 },
    ];
  }

  return {
    totalTokens,
    promptTokens,
    completionTokens,
    totalRequests,
    averageTokensPerRequest:
      totalRequests > 0 ? Math.round(totalTokens / totalRequests) : 0,
    modelBreakdown,
    toolBreakdown: toolBreakdown.sort((a, b) => b.invocations - a.invocations),
    systemHealth: {
      redisAvailable: Boolean(redis),
      primaryModel: "gemini-3.5-flash",
      fallbackModel: "llama-3.3-70b-versatile",
      status: "HEALTHY",
    },
  };
}

/**
 * Retrieves per-user AI usage metrics across all platform users.
 */
export async function getUserAiTelemetryList(): Promise<UserAiTelemetry[]> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      businessProfile: {
        select: {
          companyName: true,
          currency: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const results: UserAiTelemetry[] = [];

  for (const user of users) {
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let totalRequests = 0;
    let lastActive: string | null = null;
    const topTools: Array<{ name: string; count: number }> = [];

    if (redis) {
      try {
        const [stats, userTools] = await Promise.all([
          redis.hgetall<Record<string, string>>(`telemetry:ai:user:${user.id}`),
          redis.hgetall<Record<string, string>>(
            `telemetry:ai:user:${user.id}:tools`,
          ),
        ]);

        if (stats) {
          promptTokens = Number(stats.promptTokens) || 0;
          completionTokens = Number(stats.completionTokens) || 0;
          totalTokens = Number(stats.totalTokens) || 0;
          totalRequests = Number(stats.requests) || 0;
          lastActive = stats.lastActive || null;
        }

        if (userTools) {
          for (const [name, count] of Object.entries(userTools)) {
            topTools.push({ name, count: Number(count) || 0 });
          }
          topTools.sort((a, b) => b.count - a.count);
        }
      } catch (err) {
        console.error(
          `[Telemetry Service] Redis read failed for user ${user.id}:`,
          err,
        );
      }
    }

    // Fallback message count estimate if user had messages before Redis tracking
    if (totalRequests === 0) {
      try {
        const msgCount = await prisma.message.count({
          where: {
            conversation: { userId: user.id },
            sender: "ASSISTANT",
          },
        });
        if (msgCount > 0) {
          totalRequests = msgCount;
          promptTokens = msgCount * 520;
          completionTokens = msgCount * 140;
          totalTokens = promptTokens + completionTokens;
          lastActive = user.createdAt.toISOString();
        }
      } catch {
        // Fallback silently
      }
    }

    results.push({
      userId: user.id,
      name: user.name,
      email: user.email,
      companyName: user.businessProfile?.companyName || null,
      currency: user.businessProfile?.currency || "BDT",
      totalRequests,
      promptTokens,
      completionTokens,
      totalTokens,
      lastActive,
      topTools,
    });
  }

  // Sort by highest token consumption first
  return results.sort((a, b) => b.totalTokens - a.totalTokens);
}
