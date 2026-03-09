import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateRepoSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";
import { CollaboratorRole } from "@prisma/client";

type RouteContext = { params: Promise<{ repoId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { repoId } = await context.params;

    const repo = await prisma.repository.findUnique({
      where: { id: repoId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        branches: {
          include: {
            headCommit: true,
          },
        },
        _count: {
          select: {
            collaborators: true,
            mergeRequests: true,
            branches: true,
          },
        },
      },
    });

    if (!repo) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }

    // If private, check auth
    if (repo.visibility === "PRIVATE") {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const collaborator = await prisma.collaborator.findUnique({
        where: {
          userId_repoId: { userId: session.user.id, repoId },
        },
      });
      if (!collaborator) {
        return NextResponse.json(
          { error: "Repository not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(repo);
  } catch (error) {
    console.error("Error fetching repository:", error);
    return NextResponse.json(
      { error: "Failed to fetch repository" },
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

    const { repoId } = await context.params;

    const collaborator = await prisma.collaborator.findUnique({
      where: {
        userId_repoId: { userId: session.user.id, repoId },
      },
    });
    if (
      !collaborator ||
      (collaborator.role !== CollaboratorRole.OWNER &&
        collaborator.role !== CollaboratorRole.EDITOR)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateRepoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.name) {
      data.slug = slugify(parsed.data.name);
    }

    const repo = await prisma.repository.update({
      where: { id: repoId },
      data,
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json(repo);
  } catch (error) {
    console.error("Error updating repository:", error);
    return NextResponse.json(
      { error: "Failed to update repository" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { repoId } = await context.params;

    const collaborator = await prisma.collaborator.findUnique({
      where: {
        userId_repoId: { userId: session.user.id, repoId },
      },
    });
    if (!collaborator || collaborator.role !== CollaboratorRole.OWNER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.repository.delete({
      where: { id: repoId },
    });

    return NextResponse.json({ message: "Repository deleted" });
  } catch (error) {
    console.error("Error deleting repository:", error);
    return NextResponse.json(
      { error: "Failed to delete repository" },
      { status: 500 }
    );
  }
}
