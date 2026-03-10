import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createReviewCommentSchema } from "@/lib/validators";
import { createAuditLog } from "@/lib/audit";
import { createNotifications } from "@/lib/notifications";

type RouteContext = { params: Promise<{ repoId: string; mrId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { mrId } = await context.params;

    const comments = await prisma.reviewComment.findMany({
      where: { mergeRequestId: mrId, parentId: null },
      include: {
        author: { select: { id: true, name: true, email: true, image: true } },
        replies: {
          include: {
            author: { select: { id: true, name: true, email: true, image: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { repoId, mrId } = await context.params;
    const body = await req.json();
    const parsed = createReviewCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { content, sheetName, row, col, parentId } = parsed.data;

    const mr = await prisma.mergeRequest.findFirst({
      where: { id: mrId, repoId },
      select: { id: true, title: true },
    });

    if (!mr) {
      return NextResponse.json({ error: "Merge request not found" }, { status: 404 });
    }

    const comment = await prisma.reviewComment.create({
      data: {
        content,
        sheetName,
        row,
        col,
        mergeRequestId: mrId,
        authorId: session.user.id,
        parentId,
      },
      include: {
        author: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    createAuditLog({
      action: "REVIEW_COMMENT_ADDED",
      userId: session.user.id,
      repoId,
      metadata: {
        mergeRequestId: mrId,
        mergeRequestTitle: mr.title,
        commentId: comment.id,
        sheetName,
        cell: `${col}${row + 1}`,
      },
      req,
    });

    createNotifications({
      type: "COMMENT_ADDED",
      title: "New review comment",
      message: `${comment.author.name || "Someone"} commented on "${mr.title}" at ${sheetName} ${col}${row + 1}`,
      metadata: { mergeRequestId: mrId, sheetName, cell: `${col}${row + 1}` },
      repoId,
      actorId: session.user.id,
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
