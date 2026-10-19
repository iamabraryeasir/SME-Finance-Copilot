import { NextResponse } from "next/server";
import { createFinancialAgent } from "@/lib/ai/agent";
import { prisma } from "@/lib/prisma";
import {
  approveActionDraft,
  generateOutreachPlan,
  rejectActionDraft,
} from "@/services/action-planner";
import { evaluateAndSyncFinancialAlerts } from "@/services/alerts";
import { recordAuditLog } from "@/services/audit";
import { getOrCreateBusinessProfile } from "@/services/business-profile";
import { calculate30DayCashForecast } from "@/services/forecast";
import {
  answerTelegramCallbackQuery,
  editTelegramMessageText,
  resolveUserByTelegramChatId,
  sendTelegramMessage,
  verifyAndPairTelegramAccount,
} from "@/services/telegram";
import { inngest } from "@/utils/inngest/client";

export const dynamic = "force-dynamic";

/**
 * Health check & webhook verification endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "CashPilot AI Telegram Omni-Channel Webhook",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Main Telegram Webhook Handler
 */
export async function POST(req: Request) {
  try {
    const update = await req.json();

    // -------------------------------------------------------------------------
    // 1. Handle Inline Keyboard Button Clicks (Callback Queries)
    // -------------------------------------------------------------------------
    if (update.callback_query) {
      const cb = update.callback_query;
      const data = String(cb.data || "");
      const chatId = String(cb.message?.chat?.id || "");
      const messageId = cb.message?.message_id;

      const userAccount = await resolveUserByTelegramChatId(chatId);
      if (!userAccount) {
        await answerTelegramCallbackQuery(
          cb.id,
          "Unauthorized: Account not linked.",
        );
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("draft:approve:")) {
        const draftId = data.replace("draft:approve:", "");
        try {
          await approveActionDraft(draftId, userAccount.userId);
          await answerTelegramCallbackQuery(cb.id, "Approved & Dispatched!");
          if (messageId) {
            await editTelegramMessageText(
              chatId,
              messageId,
              "✅ *Reminder Approved & Dispatched*\n\nThe payment reminder has been processed and logged in the audit trail.",
            );
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Error approving";
          await answerTelegramCallbackQuery(cb.id, `Failed: ${msg}`);
        }
      } else if (data.startsWith("draft:reject:")) {
        const draftId = data.replace("draft:reject:", "");
        try {
          await rejectActionDraft(
            draftId,
            userAccount.userId,
            "Rejected via Telegram",
          );
          await answerTelegramCallbackQuery(cb.id, "Reminder Dismissed.");
          if (messageId) {
            await editTelegramMessageText(
              chatId,
              messageId,
              "❌ *Reminder Dismissed*\n\nThe action draft was rejected and will not be dispatched.",
            );
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Error rejecting";
          await answerTelegramCallbackQuery(cb.id, `Failed: ${msg}`);
        }
      }

      return NextResponse.json({ ok: true });
    }

    // -------------------------------------------------------------------------
    // 2. Handle Incoming Messages (Commands, Text, Documents)
    // -------------------------------------------------------------------------
    if (!update.message) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const chatId = String(message.chat.id);
    const fromId = String(message.from?.id || "");
    const username = message.from?.username;
    const text = (message.text || "").trim();

    // Command: /start [optional PIN]
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      const potentialCode = parts[1]?.trim();

      if (potentialCode) {
        const pairResult = await verifyAndPairTelegramAccount({
          telegramUserId: fromId,
          telegramUsername: username,
          chatId,
          code: potentialCode,
        });

        if (pairResult.success && pairResult.userId) {
          const profile = await getOrCreateBusinessProfile(pairResult.userId);
          await sendTelegramMessage(
            chatId,
            `🎉 *Welcome to CashPilot AI!*\n\nYour Telegram account is now connected to *${profile.companyName || "your business"}*.\n\nUse these commands anytime:\n• /summary - Instant financial snapshot\n• /forecast - 30-day cash projection\n• /alerts - Active risk alerts\n• /plan - Overdue receivables & reminder drafts\n\nOr simply type any financial question or upload an invoice!`,
          );
          return NextResponse.json({ ok: true });
        }
      }

      const existing = await resolveUserByTelegramChatId(chatId);
      if (existing) {
        const profile = await getOrCreateBusinessProfile(existing.userId);
        await sendTelegramMessage(
          chatId,
          `👋 Welcome back to *CashPilot AI* for *${profile.companyName || "your business"}*!\n\nHow can I help you today?\n• /summary - Current financial position\n• /forecast - 30-day cash flow runway\n• /alerts - Risk warnings\n• /plan - Overdue receivables & outreach drafts`,
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `👋 *Welcome to CashPilot AI!*\n\nTo connect your business account:\n1. Log into your CashPilot Web Dashboard\n2. Go to *Settings* or *Copilot*\n3. Click *Connect Telegram* to generate your 6-digit PIN\n4. Reply here with: \`/link CP-XXXXXX\``,
        );
      }
      return NextResponse.json({ ok: true });
    }

    // Command: /link <CODE>
    if (text.startsWith("/link")) {
      const parts = text.split(" ");
      const code = parts[1]?.trim();

      if (!code) {
        await sendTelegramMessage(
          chatId,
          "⚠️ Please provide your pairing PIN code.\n\nExample:\n`/link CP-884213`",
        );
        return NextResponse.json({ ok: true });
      }

      const pairResult = await verifyAndPairTelegramAccount({
        telegramUserId: fromId,
        telegramUsername: username,
        chatId,
        code,
      });

      if (pairResult.success && pairResult.userId) {
        const profile = await getOrCreateBusinessProfile(pairResult.userId);
        await sendTelegramMessage(
          chatId,
          `🎉 *Account Connected!*\n\nCashPilot AI is now linked to *${profile.companyName || "your business"}*.\n\nAvailable commands:\n• /summary - Financial snapshot\n• /forecast - 30-day projection\n• /alerts - Risk monitoring\n• /plan - Overdue collection planner`,
        );
      } else {
        await sendTelegramMessage(chatId, `❌ ${pairResult.message}`);
      }
      return NextResponse.json({ ok: true });
    }

    // All subsequent actions require authenticated paired user context
    const userAccount = await resolveUserByTelegramChatId(chatId);
    if (!userAccount) {
      await sendTelegramMessage(
        chatId,
        "🔒 *Account Not Linked*\n\nPlease link your Telegram account to your CashPilot business profile by sending:\n`/link <YOUR-6-DIGIT-PIN>`",
      );
      return NextResponse.json({ ok: true });
    }

    const userId = userAccount.userId;

    // -------------------------------------------------------------------------
    // 3. Handle File & Document Ingestion via Telegram
    // -------------------------------------------------------------------------
    if (message.document || message.photo) {
      let fileId = "";
      let fileName = "invoice_telegram";
      let fileType: "PDF" | "IMAGE" = "IMAGE";

      if (message.document) {
        fileId = message.document.file_id;
        fileName = message.document.file_name || "document.pdf";
        fileType = fileName.toLowerCase().endsWith(".pdf") ? "PDF" : "IMAGE";
      } else if (message.photo && message.photo.length > 0) {
        const bestPhoto = message.photo[message.photo.length - 1];
        fileId = bestPhoto.file_id;
        fileName = `receipt_${Date.now()}.jpg`;
        fileType = "IMAGE";
      }

      // Download file bytes from Telegram Bot API if configured
      let fileBase64 = "";
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken && botToken !== "your-telegram-bot-token" && fileId) {
        try {
          const fileInfoRes = await fetch(
            `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`,
          );
          const fileInfo = await fileInfoRes.json();
          if (fileInfo.ok && fileInfo.result?.file_path) {
            const downloadRes = await fetch(
              `https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`,
            );
            const arrayBuffer = await downloadRes.arrayBuffer();
            fileBase64 = Buffer.from(arrayBuffer).toString("base64");
          }
        } catch (fetchErr) {
          console.warn("[Telegram File Download Warning]:", fetchErr);
        }
      }

      const dataUri = fileBase64
        ? `data:${fileType === "PDF" ? "application/pdf" : "image/jpeg"};base64,${fileBase64}`
        : null;

      const doc = await prisma.documentUpload.create({
        data: {
          userId,
          fileName,
          fileType,
          fileUrl: dataUri || `telegram://${fileId}`,
          status: "PENDING",
          source: "TELEGRAM",
          telegramFileId: fileId || null,
        },
      });

      await recordAuditLog({
        userId,
        actor: "TELEGRAM",
        actionType: "INGESTION",
        entityType: "DocumentUpload",
        entityId: doc.id,
        details: {
          fileName,
          fileType,
          source: "TELEGRAM",
          telegramFileId: fileId,
        },
      });

      try {
        await inngest.send({
          name: "invoice.document.uploaded",
          data: {
            uploadId: doc.id,
            userId,
            fileName,
            fileType,
            source: "TELEGRAM",
            fileBase64,
            telegramFileId: fileId,
          },
        });
      } catch (inngestErr) {
        console.warn("[Telegram Inngest Dispatch Warning]:", inngestErr);
      }

      await sendTelegramMessage(
        chatId,
        `📄 *Document Received!*\n\nReceived \`${fileName}\`. Our background OCR worker is extracting invoice records. Once verified, it will update your ledger and forecasts automatically.`,
      );
      return NextResponse.json({ ok: true });
    }

    // -------------------------------------------------------------------------
    // 4. Handle Telegram Commands
    // -------------------------------------------------------------------------
    if (text === "/summary") {
      const profile = await getOrCreateBusinessProfile(userId);
      const currency = profile.currency || "BDT";
      const symbol = currency === "BDT" ? "৳" : "$";

      const forecast = await calculate30DayCashForecast(userId, {
        skipCache: false,
      });
      const opening = profile.openingBalance ?? 0;
      const minBalance = forecast.summary.minProjectedBalance;
      const deficitDate = forecast.summary.firstDeficitDate;

      const pendingInvoices = await prisma.invoice.findMany({
        where: {
          userId,
          status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] },
          remainingAmount: { gt: 0 },
        },
        select: { type: true, remainingAmount: true },
      });

      const ar = pendingInvoices
        .filter((i) => i.type === "RECEIVABLE")
        .reduce((sum, i) => sum + i.remainingAmount, 0);
      const ap = pendingInvoices
        .filter((i) => i.type === "PAYABLE")
        .reduce((sum, i) => sum + i.remainingAmount, 0);

      const statusEmoji = deficitDate ? "🚨 Deficit Risk" : "✅ Stable";

      const summaryMsg =
        `📊 *Financial Summary: ${profile.companyName || "Your Business"}*\n\n` +
        `• *Current Liquidity:* ${symbol}${opening.toLocaleString()}\n` +
        `• *Accounts Receivable (AR):* ${symbol}${ar.toLocaleString()}\n` +
        `• *Accounts Payable (AP):* ${symbol}${ap.toLocaleString()}\n` +
        `• *30-Day Min Balance:* ${symbol}${minBalance.toLocaleString()}\n` +
        `• *Runway Status:* ${statusEmoji}\n` +
        (deficitDate ? `⚠️ *Projected Deficit on:* ${deficitDate}\n` : "");

      await sendTelegramMessage(chatId, summaryMsg);
      return NextResponse.json({ ok: true });
    }

    if (text === "/forecast") {
      const profile = await getOrCreateBusinessProfile(userId);
      const currency = profile.currency || "BDT";
      const symbol = currency === "BDT" ? "৳" : "$";

      const forecast = await calculate30DayCashForecast(userId, {
        skipCache: false,
      });
      const sum = forecast.summary;

      let msg =
        `📈 *30-Day Cash Forecast*\n\n` +
        `• *Starting Cash:* ${symbol}${sum.startingCash.toLocaleString()}\n` +
        `• *Projected Inflows:* +${symbol}${sum.totalProjectedInflow.toLocaleString()}\n` +
        `• *Projected Outflows:* -${symbol}${sum.totalProjectedOutflow.toLocaleString()}\n` +
        `• *30-Day Net Cash Flow:* ${sum.netProjectedCashFlow >= 0 ? "+" : ""}${symbol}${sum.netProjectedCashFlow.toLocaleString()}\n` +
        `• *Lowest Point:* ${symbol}${sum.minProjectedBalance.toLocaleString()} (on ${sum.minBalanceDate})\n\n`;

      if (sum.firstDeficitDate) {
        msg += `🚨 *CRITICAL WARNING:*\nProjected cash deficit begins on *${sum.firstDeficitDate}*. You need at least ${symbol}${Math.abs(sum.minProjectedBalance).toLocaleString()} in collections to prevent negative cash balance.`;
      } else {
        msg += `✅ *Healthy Runway:*\nNo cash deficit projected over the next 30 days.`;
      }

      await sendTelegramMessage(chatId, msg);
      return NextResponse.json({ ok: true });
    }

    if (text === "/alerts") {
      const alertData = await evaluateAndSyncFinancialAlerts(userId);
      const activeAlerts = alertData.activeAlerts;

      if (activeAlerts.length === 0) {
        await sendTelegramMessage(
          chatId,
          "✅ *All Clear!* No critical or active risk alerts at this time.",
        );
        return NextResponse.json({ ok: true });
      }

      let msg = `🚨 *Active Financial Alerts (${activeAlerts.length})*\n\n`;
      for (const a of activeAlerts.slice(0, 5)) {
        const icon =
          a.severity === "CRITICAL"
            ? "🔴"
            : a.severity === "HIGH"
              ? "🟠"
              : "🟡";
        msg += `${icon} *[${a.severity}] ${a.title}*\n${a.description}\n💡 _Action:_ ${a.suggestedAction}\n\n`;
      }

      await sendTelegramMessage(chatId, msg);
      return NextResponse.json({ ok: true });
    }

    if (text === "/plan") {
      const plan = await generateOutreachPlan(userId, 2);

      if (plan.prioritizedReceivables.length === 0) {
        await sendTelegramMessage(
          chatId,
          "✅ *No Overdue Receivables!* All customer invoices are current.",
        );
        return NextResponse.json({ ok: true });
      }

      let msg = `📋 *Overdue Receivables Collection Plan*\n\n`;
      for (const item of plan.prioritizedReceivables.slice(0, 3)) {
        msg += `• *${item.invoiceNumber}* - ${item.customerName}\n  ৳${item.remainingAmount.toLocaleString()} (${item.daysOverdue} days overdue) [${item.urgencyLevel}]\n`;
      }

      if (plan.createdDrafts.length > 0) {
        msg += `\n💬 *Staged Follow-Up Drafts Awaiting Approval:*`;
        for (const draft of plan.createdDrafts) {
          const inlineButtons = {
            inline_keyboard: [
              [
                {
                  text: `✅ Send Reminder (${draft.invoiceNumber})`,
                  callback_data: `draft:approve:${draft.id}`,
                },
                {
                  text: `❌ Dismiss`,
                  callback_data: `draft:reject:${draft.id}`,
                },
              ],
            ],
          };

          await sendTelegramMessage(
            chatId,
            `${msg}\n\n*Subject:* ${draft.subject}\n*To:* ${draft.recipientName}\n*Amount:* ৳${draft.amount.toLocaleString()}`,
            { replyMarkup: inlineButtons },
          );
          msg = ""; // Prevent duplicate header
        }
      } else {
        await sendTelegramMessage(chatId, msg);
      }

      return NextResponse.json({ ok: true });
    }

    // -------------------------------------------------------------------------
    // 5. Handle Natural Language Chat via Shared LangGraph Agent
    // -------------------------------------------------------------------------
    if (text) {
      try {
        const { agent } = await createFinancialAgent(userId);
        const result = await agent.invoke({
          messages: [{ role: "user", content: text }],
        });

        const messages = result.messages || [];
        const lastMsg = messages[messages.length - 1];
        const replyText =
          typeof lastMsg?.content === "string"
            ? lastMsg.content
            : JSON.stringify(
                lastMsg?.content || "Unable to formulate response.",
              );

        // Check if any draft was created in PENDING_APPROVAL
        const pendingDraft = await prisma.actionDraft.findFirst({
          where: { userId, status: "PENDING_APPROVAL" },
          orderBy: { createdAt: "desc" },
          include: { invoice: true },
        });

        const isRecentDraft =
          pendingDraft &&
          Date.now() - new Date(pendingDraft.createdAt).getTime() < 30000;

        if (isRecentDraft && pendingDraft) {
          const inlineButtons = {
            inline_keyboard: [
              [
                {
                  text: "✅ Approve & Send",
                  callback_data: `draft:approve:${pendingDraft.id}`,
                },
                {
                  text: "❌ Dismiss",
                  callback_data: `draft:reject:${pendingDraft.id}`,
                },
              ],
            ],
          };

          await sendTelegramMessage(chatId, replyText, {
            replyMarkup: inlineButtons,
          });
        } else {
          await sendTelegramMessage(chatId, replyText);
        }
      } catch (agentErr) {
        console.error("[Telegram Agent Error]:", agentErr);
        await sendTelegramMessage(
          chatId,
          "⚠️ I encountered an issue analyzing your financial records. Please try again in a moment.",
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[Telegram Webhook Exception]:", err);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}
