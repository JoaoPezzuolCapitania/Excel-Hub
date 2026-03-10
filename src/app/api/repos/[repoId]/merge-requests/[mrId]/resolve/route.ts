import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCommitHash } from "@/lib/utils";
import { MergeRequestStatus } from "@prisma/client";
import { createAuditLogTx } from "@/lib/audit";
import { findCommonAncestor, threeWayMerge, applyResolutions } from "@/lib/merge";
import type { ExcelSnapshot } from "@/types";

type RouteContext = { params: Promise<{ repoId: string; mrId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { repoId, mrId } = await context.params;
    const body = await req.json();
    const { resolutions } = body as {
      resolutions: Array<{ sheetName: string; row: number; col: string; value: unknown; formula?: string }>;
    };

    if (!resolutions || !Array.isArray(resolutions)) {
      return NextResponse.json(
        { error: "resolutions array is required" },
        { status: 400 }
      );
    }

    const mergeRequest = await prisma.mergeRequest.findFirst({
      where: { id: mrId, repoId },
      include: {
        sourceBranch: { include: { headCommit: true } },
        targetBranch: { include: { headCommit: true } },
      },
    });

    if (!mergeRequest) {
      return NextResponse.json({ error: "Merge request not found" }, { status: 404 });
    }

    if (mergeRequest.status !== MergeRequestStatus.OPEN) {
      return NextResponse.json(
        { error: "Merge request is already " + mergeRequest.status.toLowerCase() },
        { status: 400 }
      );
    }

    const sourceHeadCommit = mergeRequest.sourceBranch.headCommit;
    const targetHeadCommit = mergeRequest.targetBranch.headCommit;

    if (!sourceHeadCommit || !targetHeadCommit) {
      return NextResponse.json(
        { error: "Both branches must have commits" },
        { status: 400 }
      );
    }

    const sourceSnapshot = sourceHeadCommit.jsonSnapshot as unknown as ExcelSnapshot;
    const targetSnapshot = targetHeadCommit.jsonSnapshot as unknown as ExcelSnapshot;

    const baseSnapshot = await findCommonAncestor(
      mergeRequest.sourceBranchId,
      mergeRequest.targetBranchId
    );

    if (!baseSnapshot) {
      return NextResponse.json(
        { error: "Cannot find common ancestor for merge" },
        { status: 400 }
      );
    }

    const { merged } = threeWayMerge(baseSnapshot, sourceSnapshot, targetSnapshot);

    // Apply user resolutions to the merged snapshot
    const finalSnapshot = applyResolutions(merged, resolutions);

    const result = await prisma.$transaction(async (tx) => {
      const hash = generateCommitHash();

      const mergeCommit = await tx.commit.create({
        data: {
          hash,
          message: `Merge: ${mergeRequest.title} (conflicts resolved)`,
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
          conflictsResolved: resolutions.length,
        },
        req,
      });

      return updatedMR;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error resolving merge conflicts:", error);
    return NextResponse.json(
      { error: "Failed to resolve merge conflicts" },
      { status: 500 }
    );
  }
}
