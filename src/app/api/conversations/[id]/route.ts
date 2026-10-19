import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, message: "Conversation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: conversation.id,
        title: conversation.title,
        channel: conversation.channel,
        createdAt: conversation.createdAt.toISOString(),
        messages: conversation.messages.map((m) => ({
          id: m.id,
          sender: m.sender,
          content: m.content,
          toolCalls: m.toolCalls,
          toolResults: m.toolResults,
          createdAt: m.createdAt.toISOString(),
        })),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { success: false, message: `Failed to load conversation: ${message}` },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, message: "Conversation not found" },
        { status: 404 },
      );
    }

    await prisma.conversation.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Conversation deleted",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { success: false, message: `Failed to delete conversation: ${message}` },
      { status: 500 },
    );
  }
}
