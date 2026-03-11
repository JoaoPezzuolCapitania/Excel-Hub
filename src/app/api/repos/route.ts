import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRepoSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { CollaboratorRole } from "@prisma/client";
import { createAuditLogTx } from "@/lib/audit";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const collaborations = await prisma.collaborator.findMany({
      where: { userId: session.user.id },
      include: {
        repo: {
          include: {
            owner: {
              select: { id: true, name: true, email: true, image: true },
            },
            branches: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { repo: { updatedAt: "desc" } },
    });

    const repos = collaborations.map((c) => ({
      ...c.repo,
      role: c.role,
    }));

    return NextResponse.json(repos);
  } catch (error) {
    console.error("Error listing repositories:", error);
    return NextResponse.json(
      { error: "Failed to list repositories" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createRepoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, description, visibility } = parsed.data;
    const slug = slugify(name);

    const existing = await prisma.repository.findUnique({
      where: { ownerId_slug: { ownerId: session.user.id, slug } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A repository with this name already exists" },
        { status: 409 }
      );
    }

    const repo = await prisma.$transaction(async (tx) => {
      const repository = await tx.repository.create({
        data: {
          name,
          slug,
          description,
          visibility,
          ownerId: session.user.id,
          branches: {
            create: {
              name: "main",
            },
          },
          collaborators: {
            create: {
              userId: session.user.id,
              role: CollaboratorRole.OWNER,
            },
          },
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true, image: true },
          },
          branches: true,
          collaborators: true,
        },
      });

      await createAuditLogTx(tx, {
        action: "REPO_CREATED",
        userId: session.user.id,
        repoId: repository.id,
        metadata: { repoName: name, slug, visibility },
        req,
      });

      return repository;
    });

    return NextResponse.json(repo, { status: 201 });
  } catch (error) {
    console.error("Error creating repository:", error);
    return NextResponse.json(
      { error: "Failed to create repository" },
      { status: 500 }
    );
  }
}
