import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCommitHash } from "@/lib/utils";
import { MergeRequestStatus } from "@prisma/client";
import { createAuditLog, createAuditLogTx } from "@/lib/audit";
import { createNotifications } from "@/lib/notifications";
import { findCommonAncestor, threeWayMerge } from "@/lib/merge";
import type { ExcelSnapshot } from "@/types";

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

      const sourceSnapshot = sourceHeadCommit.jsonSnapshot as unknown as ExcelSnapshot;

      // Get target head snapshot
      const targetBranch = await prisma.branch.findUnique({
        where: { id: mergeRequest.targetBranchId },
        include: { headCommit: true },
      });
      const targetSnapshot = targetBranch?.headCommit?.jsonSnapshot as unknown as ExcelSnapshot | undefined;

      let finalSnapshot: ExcelSnapshot;

      if (!targetSnapshot) {
        // Target has no commits — just copy source
        finalSnapshot = JSON.parse(JSON.stringify(sourceSnapshot));
      } else {
        // Try three-way merge
        const baseSnapshot = await findCommonAncestor(
          mergeRequest.sourceBranchId,
          mergeRequest.targetBranchId
        );

        if (baseSnapshot) {
          const { merged, conflicts } = threeWayMerge(baseSnapshot, sourceSnapshot, targetSnapshot);
          if (conflicts.length > 0) {
            return NextResponse.json(
              { error: "Merge conflicts detected", conflicts },
              { status: 409 }
            );
          }
          finalSnapshot = merged;
        } else {
          // No common ancestor — fallback to source snapshot
          finalSnapshot = JSON.parse(JSON.stringify(sourceSnapshot));
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        const hash = generateCommitHash();

        const mergeCommit = await tx.commit.create({
          data: {
            hash,
            message: `Merge: ${mergeRequest.title}`,
            fileUrl: sourceHeadCommit.fileUrl,
            jsonSnapshot: JSON.parse(JSON.stringify(finalSnapshot)),
            authorId: session.user.id,
            branchId: mergeRequest.targetBranchId,
            parentId: mergeRequest.targetBranch.headCommitId ?? undefined,
          },
        });

        await tx.branch.update({
          where: { id: mergeRequest.targetBranchId },
          data: { headCommitId: mergeCommit.id },
        });

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

      createNotifications({
        type: "MR_MERGED",
        title: "Merge request merged",
        message: `"${mergeRequest.title}" was merged (${mergeRequest.sourceBranch.name} → ${mergeRequest.targetBranch.name})`,
        metadata: { mergeRequestId: mrId, title: mergeRequest.title },
        repoId,
        actorId: session.user.id,
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

    createNotifications({
      type: "MR_CLOSED",
      title: "Merge request closed",
      message: `"${mergeRequest.title}" was closed`,
      metadata: { mergeRequestId: mrId, title: mergeRequest.title },
      repoId,
      actorId: session.user.id,
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
