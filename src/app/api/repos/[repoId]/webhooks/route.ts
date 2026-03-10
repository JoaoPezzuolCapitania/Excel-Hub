import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

type RouteContext = { params: Promise<{ repoId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { repoId } = await context.params;

    const webhooks = await prisma.webhook.findMany({
      where: { repoId },
      orderBy: { createdAt: "desc" },
    });

    // Mask secrets in response
    const masked = webhooks.map((wh) => ({
      ...wh,
      secret: wh.secret.slice(0, 4) + "****",
    }));

    return NextResponse.json(masked);
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhooks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { repoId } = await context.params;
    const body = await req.json();
    const { url, events } = body as { url: string; events: string[] };

    if (!url || !events || events.length === 0) {
      return NextResponse.json(
        { error: "url and events are required" },
        { status: 400 }
      );
    }

    const secret = crypto.randomBytes(32).toString("hex");

    const webhook = await prisma.webhook.create({
      data: {
        url,
        secret,
        events,
        repoId,
      },
    });

    return NextResponse.json(webhook, { status: 201 });
  } catch (error) {
    console.error("Error creating webhook:", error);
    return NextResponse.json(
      { error: "Failed to create webhook" },
      { status: 500 }
    );
  }
}
