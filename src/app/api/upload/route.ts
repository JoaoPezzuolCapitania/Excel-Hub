import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToLocal, getStorageKey } from "@/lib/s3";
import { generateCommitHash } from "@/lib/utils";
import { parseExcelBuffer } from "@/lib/excel";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { fileName, fileData, repoId, branchId, message } = body;

    if (!fileName || !fileData || !repoId || !branchId) {
      return NextResponse.json(
        { error: "fileName, fileData, repoId, and branchId are required" },
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

    // Decode base64 file
    const buffer = Buffer.from(fileData, "base64");

    // Save file locally
    const commitHash = generateCommitHash();
    const key = getStorageKey(
      session.user.id,
      repoId,
      branchId,
      commitHash,
      fileName
    );
    await uploadToLocal(buffer, key);

    // Parse Excel file
    const snapshot = parseExcelBuffer(buffer);
    const hash = generateCommitHash();

    // Create commit and update branch head in a transaction
    const commit = await prisma.$transaction(async (tx) => {
      const newCommit = await tx.commit.create({
        data: {
          hash,
          message: message || `Upload ${fileName}`,
          fileUrl: key,
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

      return newCommit;
    });

    return NextResponse.json(commit, { status: 201 });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
