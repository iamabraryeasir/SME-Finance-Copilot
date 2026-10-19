import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const conversations = await prisma.conversation.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        channel: c.channel,
        messageCount: c._count.messages,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { success: false, message: `Failed to fetch conversations: ${message}` },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
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

    const body = await req.json().catch(() => ({}));
    const title =
      typeof body.title === "string" ? body.title : "New Advisory Session";

    const conversation = await prisma.conversation.create({
      data: {
        userId: session.user.id,
        channel: "WEB",
        title,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: conversation.id,
        title: conversation.title,
        channel: conversation.channel,
        createdAt: conversation.createdAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { success: false, message: `Failed to create conversation: ${message}` },
      { status: 500 },
    );
  }
}
