import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  generateTelegramPairingCode,
  getTelegramConnectionStatus,
  unlinkTelegramAccount,
} from "@/services/telegram";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const status = await getTelegramConnectionStatus(session.user.id);

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { success: false, message: `Failed to get status: ${message}` },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { code, expiresAt } = await generateTelegramPairingCode(
      session.user.id,
    );

    return NextResponse.json({
      success: true,
      data: {
        code,
        expiresAt,
        instruction: `Open CashPilot Telegram Bot and send: /link ${code}`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { success: false, message: `Failed to generate code: ${message}` },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    await unlinkTelegramAccount(session.user.id);

    return NextResponse.json({
      success: true,
      message: "Telegram account successfully disconnected.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { success: false, message: `Failed to disconnect: ${message}` },
      { status: 500 },
    );
  }
}
