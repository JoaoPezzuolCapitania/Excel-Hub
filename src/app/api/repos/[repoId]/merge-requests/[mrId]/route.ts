import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCommitHash } from "@/lib/utils";
import { MergeRequestStatus } from "@prisma/client";
import { createAuditLog, createAuditLogTx } from "@/lib/audit";

type RouteContext = { params: Promise<{ repoId: string; mrId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { repoId, mrId } = await context.params;

    const mergeRequest = await prisma.mergeRequest.findFirst({
      where: { id: mrId, repoId },
      include: {
        sourceBranch: {
          include: {
            headCommit: true,
          },
        },
        targetBranch: {
          include: {
            headCommit: true,
          },
        },
        author: {
          select: { id: true, name: true, email: true, image: true },
        },
        repo: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!mergeRequest) {
      return NextResponse.json(
        { error: "Merge request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(mergeRequest);
  } catch (error) {
    console.error("Error fetching merge request:", error);
    return NextResponse.json(
      { error: "Failed to fetch merge request" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { repoId, mrId } = await context.params;

    const body = await req.json();
    const { status } = body as { status: string };

    if (!status || !["MERGED", "CLOSED"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be MERGED or CLOSED" },
        { status: 400 }
      );
    }

    const mergeRequest = await prisma.mergeRequest.findFirst({
      where: { id: mrId, repoId },
      include: {
        sourceBranch: {
          include: { headCommit: true },
        },
        targetBranch: true,
      },
    });

    if (!mergeRequest) {
      return NextResponse.json(
        { error: "Merge request not found" },
        { status: 404 }
      );
    }

    if (mergeRequest.status !== MergeRequestStatus.OPEN) {
      return NextResponse.json(
        { error: "Merge request is already " + mergeRequest.status.toLowerCase() },
        { status: 400 }
      );
    }

    if (status === "MERGED") {
      const sourceHeadCommit = mergeRequest.sourceBranch.headCommit;
      if (!sourceHeadCommit) {
        return NextResponse.json(
          { error: "Source branch has no commits to merge" },
          { status: 400 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const hash = generateCommitHash();

        // Create a new commit on the target branch with the source's data
        const mergeCommit = await tx.commit.create({
          data: {
            hash,
            message: `Merge: ${mergeRequest.title}`,
            fileUrl: sourceHeadCommit.fileUrl,
            jsonSnapshot: JSON.parse(JSON.stringify(sourceHeadCommit.jsonSnapshot)),
            authorId: session.user.id,
            branchId: mergeRequest.targetBranchId,
            parentId: mergeRequest.targetBranch.headCommitId ?? undefined,
          },
        });

        // Update target branch head
        await tx.branch.update({
          where: { id: mergeRequest.targetBranchId },
          data: { headCommitId: mergeCommit.id },
        });

        // Update merge request status
        const updatedMR = await tx.mergeRequest.update({
          where: { id: mrId },
          data: { status: MergeRequestStatus.MERGED },
          include: {
            sourceBranch: { select: { id: true, name: true } },
            targetBranch: { select: { id: true, name: true } },
            author: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        });

        await createAuditLogTx(tx, {
          action: "MERGE_REQUEST_MERGED",
          userId: session.user.id,
          repoId,
          metadata: {
            mergeRequestId: mrId,
            title: mergeRequest.title,
            sourceBranchName: mergeRequest.sourceBranch.name,
            targetBranchName: mergeRequest.targetBranch.name,
            mergeCommitHash: hash,
          },
          req,
        });

        return updatedMR;
      });

      return NextResponse.json(result);
    }

    // status === "CLOSED"
    const updatedMR = await prisma.mergeRequest.update({
      where: { id: mrId },
      data: { status: MergeRequestStatus.CLOSED },
      include: {
        sourceBranch: { select: { id: true, name: true } },
        targetBranch: { select: { id: true, name: true } },
        author: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    createAuditLog({
      action: "MERGE_REQUEST_CLOSED",
      userId: session.user.id,
      repoId,
      metadata: { mergeRequestId: mrId, title: mergeRequest.title },
      req,
    });

    return NextResponse.json(updatedMR);
  } catch (error) {
    console.error("Error updating merge request:", error);
    return NextResponse.json(
      { error: "Failed to update merge request" },
      { status: 500 }
    );
  }
}
