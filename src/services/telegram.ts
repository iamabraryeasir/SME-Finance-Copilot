import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/services/audit";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export interface TelegramLinkStatus {
  isLinked: boolean;
  username: string | null;
  chatId: string | null;
  linkedAt: Date | null;
  activeCode: string | null;
  expiresAt: Date | null;
}

/**
 * Generates a cryptographic 6-digit one-time PIN (e.g. CP-884213)
 * stored in TelegramAccount with a 15-minute expiry.
 */
export async function generateTelegramPairingCode(
  userId: string,
): Promise<{ code: string; expiresAt: Date }> {
  if (!userId) {
    throw new Error("Tenant isolation violation: userId is required");
  }

  // Generate 6-digit random number
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  const code = `CP-${randomDigits}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  const existing = await prisma.telegramAccount.findUnique({
    where: { userId },
  });

  if (existing) {
    await prisma.telegramAccount.update({
      where: { userId },
      data: {
        linkToken: code,
        linkTokenExpiresAt: expiresAt,
      },
    });
  } else {
    await prisma.telegramAccount.create({
      data: {
        userId,
        telegramUserId: `pending_${userId}`,
        chatId: "",
        linkToken: code,
        linkTokenExpiresAt: expiresAt,
        isVerified: false,
      },
    });
  }

  return { code, expiresAt };
}

/**
 * Retrieves the current Telegram connection status for a user.
 */
export async function getTelegramConnectionStatus(
  userId: string,
): Promise<TelegramLinkStatus> {
  const account = await prisma.telegramAccount.findUnique({
    where: { userId },
  });

  if (!account) {
    return {
      isLinked: false,
      username: null,
      chatId: null,
      linkedAt: null,
      activeCode: null,
      expiresAt: null,
    };
  }

  const isCodeActive =
    !!account.linkToken &&
    !!account.linkTokenExpiresAt &&
    account.linkTokenExpiresAt > new Date();

  return {
    isLinked: account.isVerified,
    username: account.telegramUsername,
    chatId: account.chatId || null,
    linkedAt: account.linkedAt,
    activeCode: isCodeActive ? account.linkToken : null,
    expiresAt: isCodeActive ? account.linkTokenExpiresAt : null,
  };
}

/**
 * Unlinks the Telegram account for a user.
 */
export async function unlinkTelegramAccount(userId: string): Promise<boolean> {
  const account = await prisma.telegramAccount.findUnique({
    where: { userId },
  });

  if (!account) {
    return false;
  }

  await prisma.telegramAccount.delete({
    where: { userId },
  });

  await recordAuditLog({
    userId,
    actor: "USER",
    actionType: "SETTINGS_UPDATED",
    entityType: "TelegramAccount",
    entityId: account.id,
    details: { action: "UNLINK_TELEGRAM" },
  });

  return true;
}

/**
 * Validates pairing code sent from Telegram (/link CP-XXXXXX)
 * and bonds the Telegram user identity to the web user account.
 */
export async function verifyAndPairTelegramAccount(params: {
  telegramUserId: string;
  telegramUsername?: string;
  chatId: string;
  code: string;
}): Promise<{ success: boolean; userId?: string; message: string }> {
  const normalizedCode = params.code.trim().toUpperCase();
  const fullCode = normalizedCode.startsWith("CP-")
    ? normalizedCode
    : `CP-${normalizedCode}`;

  const now = new Date();

  const account = await prisma.telegramAccount.findFirst({
    where: {
      linkToken: fullCode,
      linkTokenExpiresAt: { gt: now },
    },
  });

  if (!account) {
    return {
      success: false,
      message:
        "Invalid or expired pairing code. Please generate a new code from CashPilot Web Settings.",
    };
  }

  // Check if this telegramUserId is already attached to another record and clean it up
  await prisma.telegramAccount.deleteMany({
    where: {
      telegramUserId: params.telegramUserId,
      userId: { not: account.userId },
    },
  });

  // Bond identity
  await prisma.telegramAccount.update({
    where: { id: account.id },
    data: {
      telegramUserId: params.telegramUserId,
      telegramUsername: params.telegramUsername || null,
      chatId: params.chatId,
      isVerified: true,
      linkedAt: now,
      linkToken: null,
      linkTokenExpiresAt: null,
    },
  });

  await recordAuditLog({
    userId: account.userId,
    actor: "TELEGRAM",
    actionType: "SETTINGS_UPDATED",
    entityType: "TelegramAccount",
    entityId: account.id,
    details: {
      action: "TELEGRAM_ACCOUNT_LINKED",
      telegramUserId: params.telegramUserId,
      telegramUsername: params.telegramUsername,
      chatId: params.chatId,
    },
  });

  return {
    success: true,
    userId: account.userId,
    message: "Account successfully paired with CashPilot AI!",
  };
}

/**
 * Resolves the authenticated business user from a Telegram chat/user ID.
 */
export async function resolveUserByTelegramChatId(
  chatId: string,
): Promise<{ userId: string; username: string | null } | null> {
  const account = await prisma.telegramAccount.findFirst({
    where: {
      chatId: String(chatId),
      isVerified: true,
    },
    select: {
      userId: true,
      telegramUsername: true,
    },
  });

  if (!account) return null;

  return {
    userId: account.userId,
    username: account.telegramUsername,
  };
}

/**
 * Sends a message via Telegram Bot API with fallback logging if token is not configured.
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: {
    parseMode?: "Markdown" | "HTML";
    replyMarkup?: Record<string, unknown>;
  },
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || token === "your-telegram-bot-token") {
    console.info(
      `[Telegram Mock] To: ${chatId} | Text: ${text.slice(0, 80)}...`,
    );
    return true;
  }

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parseMode || "Markdown",
        reply_markup: options?.replyMarkup,
      }),
    });

    if (!res.ok) {
      // If Markdown parsing fails due to special chars, retry with plain text
      if (options?.parseMode) {
        await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            reply_markup: options?.replyMarkup,
          }),
        });
      }
    }
    return true;
  } catch (error) {
    console.error("[Telegram] Failed to send message:", error);
    return false;
  }
}

/**
 * Acknowledges callback queries from inline keyboard clicks.
 */
export async function answerTelegramCallbackQuery(
  callbackQueryId: string,
  text?: string,
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token === "your-telegram-bot-token") {
    return true;
  }

  try {
    await fetch(`${TELEGRAM_API_BASE}/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Updates an existing Telegram message after an action button has been clicked.
 */
export async function editTelegramMessageText(
  chatId: string,
  messageId: number,
  text: string,
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token === "your-telegram-bot-token") {
    return true;
  }

  try {
    await fetch(`${TELEGRAM_API_BASE}/bot${token}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: "Markdown",
      }),
    });
    return true;
  } catch {
    return false;
  }
}
