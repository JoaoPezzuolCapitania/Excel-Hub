import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBranchSchema } from "@/lib/validators";
import { createAuditLog } from "@/lib/audit";

type RouteContext = { params: Promise<{ repoId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { repoId } = await context.params;

    const branches = await prisma.branch.findMany({
      where: { repoId },
      include: {
        headCommit: {
          include: {
            author: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        _count: {
          select: { commits: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(branches);
  } catch (error) {
    console.error("Error fetching branches:", error);
    return NextResponse.json(
      { error: "Failed to fetch branches" },
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
    const parsed = createBranchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, fromBranchId } = parsed.data;

    // Verify the source branch belongs to this repo
    const sourceBranch = await prisma.branch.findFirst({
      where: { id: fromBranchId, repoId },
    });
    if (!sourceBranch) {
      return NextResponse.json(
        { error: "Source branch not found" },
        { status: 404 }
      );
    }

    // Check if branch name already exists in this repo
    const existing = await prisma.branch.findUnique({
      where: { repoId_name: { repoId, name } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A branch with this name already exists" },
        { status: 409 }
      );
    }

    // headCommitId is @unique, so new branch starts without a head
    // and gets its own commit on first upload
    const branch = await prisma.branch.create({
      data: {
        name,
        repoId,
        createdFromBranchId: fromBranchId,
      },
      include: {
        headCommit: {
          include: {
            author: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });

    createAuditLog({
      action: "BRANCH_CREATED",
      userId: session.user.id,
      repoId,
      metadata: {
        branchId: branch.id,
        branchName: name,
        fromBranchId,
        fromBranchName: sourceBranch.name,
      },
      req,
    });

    return NextResponse.json(branch, { status: 201 });
  } catch (error) {
    console.error("Error creating branch:", error);
    return NextResponse.json(
      { error: "Failed to create branch" },
      { status: 500 }
    );
  }
}
