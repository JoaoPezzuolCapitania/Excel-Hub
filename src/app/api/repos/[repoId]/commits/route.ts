import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCommitHash } from "@/lib/utils";
import { getFileFromLocal } from "@/lib/s3";
import { parseExcelBuffer } from "@/lib/excel";
import { createAuditLogTx } from "@/lib/audit";

type RouteContext = { params: Promise<{ repoId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { repoId } = await context.params;

    const body = await req.json();
    const { fileKey, message, branchId } = body;

    if (!fileKey || !branchId) {
      return NextResponse.json(
        { error: "fileKey and branchId are required" },
        { status: 400 }
      );
    }

    // Verify the branch belongs to this repo
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, repoId },
    });
    if (!branch) {
      return NextResponse.json(
        { error: "Branch not found" },
        { status: 404 }
      );
    }

    // Get file from local storage and parse it
    const fileBuffer = await getFileFromLocal(fileKey);
    const snapshot = parseExcelBuffer(fileBuffer);
    const hash = generateCommitHash();

    const commit = await prisma.$transaction(async (tx) => {
      const newCommit = await tx.commit.create({
        data: {
          hash,
          message: message || "Upload file",
          fileUrl: fileKey,
          jsonSnapshot: JSON.parse(JSON.stringify(snapshot)),
          authorId: session.user.id,
          branchId,
          parentId: branch.headCommitId ?? undefined,
        },
        include: {
          author: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      });

      await tx.branch.update({
        where: { id: branchId },
        data: { headCommitId: newCommit.id },
      });

      await createAuditLogTx(tx, {
        action: "COMMIT_CREATED",
        userId: session.user.id,
        repoId,
        metadata: {
          commitHash: hash,
          message: message || "Upload file",
          branchId,
          branchName: branch.name,
        },
        req,
      });

      return newCommit;
    });

    return NextResponse.json(commit, { status: 201 });
  } catch (error) {
    console.error("Error creating commit:", error);
    return NextResponse.json(
      { error: "Failed to create commit" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { repoId } = await context.params;
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    if (!branchId) {
      return NextResponse.json(
        { error: "branchId query parameter is required" },
        { status: 400 }
      );
    }

    // Verify the branch belongs to this repo
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, repoId },
    });
    if (!branch) {
      return NextResponse.json(
        { error: "Branch not found" },
        { status: 404 }
      );
    }

    const commits = await prisma.commit.findMany({
      where: { branchId },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(commits);
  } catch (error) {
    console.error("Error fetching commits:", error);
    return NextResponse.json(
      { error: "Failed to fetch commits" },
      { status: 500 }
    );
  }
}
