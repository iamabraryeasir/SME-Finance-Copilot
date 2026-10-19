import { toUIMessageStream } from "@ai-sdk/langchain";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import type { Prisma } from "@prisma/client";
import { createUIMessageStreamResponse } from "ai";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createFinancialAgent } from "@/lib/ai/agent";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { recordAiTelemetry } from "@/services/telemetry";

export async function POST(req: Request) {
  try {
    // 1. Session verification & Tenant Isolation
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Active session required." },
        { status: 401 },
      );
    }

    const userId = session.user.id;

    // 2. Sliding-window rate limiting via Upstash Redis
    if (redis) {
      const rateLimitKey = `ratelimit:chat:${userId}`;
      const current = await redis.incr(rateLimitKey);
      if (current === 1) {
        await redis.expire(rateLimitKey, 60); // 1-minute window
      }
      if (current > 30) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Rate limit exceeded: Max 30 prompts per minute. Please pause.",
          },
          { status: 429 },
        );
      }
    }

    // 3. Parse and validate incoming payload
    const body = await req.json();
    const { messages, conversationId: requestedConvId } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payload: messages array required.",
        },
        { status: 400 },
      );
    }

    const lastUserMessage = messages[messages.length - 1];
    const userText =
      typeof lastUserMessage.content === "string"
        ? lastUserMessage.content
        : JSON.stringify(lastUserMessage.content);

    // 4. Resolve or initialize persistent conversation
    let conversationId = requestedConvId;
    if (conversationId) {
      const existing = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
      });
      if (!existing) {
        conversationId = null;
      }
    }

    if (!conversationId) {
      const snippet = userText.slice(0, 40).trim() || "Financial Advisory";
      const newConv = await prisma.conversation.create({
        data: {
          userId,
          channel: "WEB",
          title: snippet.length >= 40 ? `${snippet}...` : snippet,
        },
      });
      conversationId = newConv.id;
    }

    // Record incoming user message in PostgreSQL
    await prisma.message.create({
      data: {
        conversationId,
        sender: "USER",
        content: userText,
      },
    });

    // 5. Convert UI messages to LangChain BaseMessage instances directly
    // (Bypasses Vercel AI SDK toBaseMessages message.parts dependency)
    const langchainMessages = messages.map(
      (m: { role: string; content: string }) => {
        if (m.role === "user") {
          return new HumanMessage(m.content);
        }
        if (m.role === "assistant") {
          return new AIMessage(m.content);
        }
        return new SystemMessage(m.content);
      },
    );

    // 6. Instantiate tenant-bound LangGraph financial agent
    const { agent } = await createFinancialAgent(userId);

    // 7. Stream agent graph execution with SSE
    const graphStream = await agent.stream(
      { messages: langchainMessages },
      { streamMode: ["values", "messages"] },
    );

    // 8. Transform into AI SDK UIMessageStream with lifecycle persistence
    let finalAccumulatedText = "";

    const uiStream = toUIMessageStream(graphStream, {
      onText: (delta) => {
        finalAccumulatedText += delta;
      },
      onError: (err) => {
        console.error("[ChatAPI Stream Error]:", err);
      },
      onFinish: async (finalState: unknown) => {
        try {
          const stateObj = finalState as
            | { messages?: Array<{ content?: unknown; tool_calls?: unknown }> }
            | undefined;

          let assistantContent = finalAccumulatedText.trim();
          let toolCallsData: unknown;

          if (stateObj?.messages && stateObj.messages.length > 0) {
            const lastMsg = stateObj.messages[stateObj.messages.length - 1];
            if (lastMsg) {
              toolCallsData = lastMsg.tool_calls;
              if (!assistantContent) {
                if (typeof lastMsg.content === "string") {
                  assistantContent = lastMsg.content;
                } else if (Array.isArray(lastMsg.content)) {
                  assistantContent = lastMsg.content
                    .map((part: unknown) => {
                      if (typeof part === "string") return part;
                      if (
                        typeof part === "object" &&
                        part !== null &&
                        "text" in part
                      ) {
                        return (part as { text: string }).text;
                      }
                      return "";
                    })
                    .join("")
                    .trim();
                }
              }
            }
          }

          if (assistantContent && conversationId) {
            await prisma.message.create({
              data: {
                conversationId,
                sender: "ASSISTANT",
                content: assistantContent,
                toolCalls:
                  (toolCallsData as unknown as Prisma.InputJsonValue) ??
                  undefined,
              },
            });

            // Touch updated timestamp on conversation
            await prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });

            // Track AI telemetry atomically
            const promptChars = langchainMessages.reduce(
              (acc, m) =>
                acc + (typeof m.content === "string" ? m.content.length : 0),
              0,
            );
            const promptTokens = Math.max(100, Math.ceil(promptChars / 4));
            const completionTokens = Math.max(
              20,
              Math.ceil(assistantContent.length / 4),
            );
            const totalTokens = promptTokens + completionTokens;

            const toolsList: string[] = [];
            if (Array.isArray(toolCallsData)) {
              for (const tc of toolCallsData) {
                if (
                  tc &&
                  typeof tc === "object" &&
                  "name" in tc &&
                  typeof tc.name === "string"
                ) {
                  toolsList.push(tc.name);
                }
              }
            }

            await recordAiTelemetry({
              userId,
              model: "gemini-3.5-flash",
              promptTokens,
              completionTokens,
              totalTokens,
              toolsUsed: toolsList,
            });
          }
        } catch (err) {
          console.error(
            "[ChatAPI] Failed to persist assistant completion:",
            err,
          );
        }
      },
    });

    return createUIMessageStreamResponse({
      stream: uiStream,
      headers: {
        "x-conversation-id": conversationId,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[ChatAPI Error]:", error);
    return NextResponse.json(
      { success: false, message: `Chat orchestrator error: ${message}` },
      { status: 500 },
    );
  }
}
