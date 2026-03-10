import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMergeRequestSchema } from "@/lib/validators";
import { createAuditLog } from "@/lib/audit";
import { createNotifications } from "@/lib/notifications";

type RouteContext = { params: Promise<{ repoId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { repoId } = await context.params;

    const mergeRequests = await prisma.mergeRequest.findMany({
      where: { repoId },
      include: {
        sourceBranch: {
          select: { id: true, name: true },
        },
        targetBranch: {
          select: { id: true, name: true },
        },
        author: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(mergeRequests);
  } catch (error) {
    console.error("Error fetching merge requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch merge requests" },
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
    const parsed = createMergeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, description, sourceBranchId, targetBranchId } = parsed.data;

    // Verify both branches belong to this repo
    const [sourceBranch, targetBranch] = await Promise.all([
      prisma.branch.findFirst({ where: { id: sourceBranchId, repoId } }),
      prisma.branch.findFirst({ where: { id: targetBranchId, repoId } }),
    ]);

    if (!sourceBranch) {
      return NextResponse.json(
        { error: "Source branch not found" },
        { status: 404 }
      );
    }
    if (!targetBranch) {
      return NextResponse.json(
        { error: "Target branch not found" },
        { status: 404 }
      );
    }

    if (sourceBranchId === targetBranchId) {
      return NextResponse.json(
        { error: "Source and target branches must be different" },
        { status: 400 }
      );
    }

    const mergeRequest = await prisma.mergeRequest.create({
      data: {
        title,
        description,
        repoId,
        sourceBranchId,
        targetBranchId,
        authorId: session.user.id,
      },
      include: {
        sourceBranch: {
          select: { id: true, name: true },
        },
        targetBranch: {
          select: { id: true, name: true },
        },
        author: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    createAuditLog({
      action: "MERGE_REQUEST_CREATED",
      userId: session.user.id,
      repoId,
      metadata: {
        mergeRequestId: mergeRequest.id,
        title,
        sourceBranchName: sourceBranch?.name,
        targetBranchName: targetBranch?.name,
      },
      req,
    });

    createNotifications({
      type: "MR_OPENED",
      title: "New merge request",
      message: `${mergeRequest.author.name || "Someone"} opened "${title}" (${sourceBranch.name} → ${targetBranch.name})`,
      metadata: { mergeRequestId: mergeRequest.id, title },
      repoId,
      actorId: session.user.id,
    });

    return NextResponse.json(mergeRequest, { status: 201 });
  } catch (error) {
    console.error("Error creating merge request:", error);
    return NextResponse.json(
      { error: "Failed to create merge request" },
      { status: 500 }
    );
  }
}
