import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ repoId: string; webhookId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { repoId, webhookId } = await context.params;
    const body = await req.json();
    const { url, events, active } = body as {
      url?: string;
      events?: string[];
      active?: boolean;
    };

    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, repoId },
    });

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        ...(url !== undefined && { url }),
        ...(events !== undefined && { events }),
        ...(active !== undefined && { active }),
      },
    });

    return NextResponse.json({
      ...updated,
      secret: updated.secret.slice(0, 4) + "****",
    });
  } catch (error) {
    console.error("Error updating webhook:", error);
    return NextResponse.json(
      { error: "Failed to update webhook" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { repoId, webhookId } = await context.params;

    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, repoId },
    });

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404 }
      );
    }

    await prisma.webhook.delete({ where: { id: webhookId } });

    return NextResponse.json({ message: "Webhook deleted" });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return NextResponse.json(
      { error: "Failed to delete webhook" },
      { status: 500 }
    );
  }
}
