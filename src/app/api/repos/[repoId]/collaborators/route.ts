import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addCollaboratorSchema } from "@/lib/validators";
import { CollaboratorRole } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";

type RouteContext = { params: Promise<{ repoId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { repoId } = await context.params;

    const collaborators = await prisma.collaborator.findMany({
      where: { repoId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(collaborators);
  } catch (error) {
    console.error("Error fetching collaborators:", error);
    return NextResponse.json(
      { error: "Failed to fetch collaborators" },
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
    const parsed = addCollaboratorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, role } = parsed.data;

    // Find the user by email
    const userToAdd = await prisma.user.findUnique({
      where: { email },
    });
    if (!userToAdd) {
      return NextResponse.json(
        { error: "User not found with that email" },
        { status: 404 }
      );
    }

    // Check if already a collaborator
    const existing = await prisma.collaborator.findUnique({
      where: { userId_repoId: { userId: userToAdd.id, repoId } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "User is already a collaborator" },
        { status: 409 }
      );
    }

    const collaborator = await prisma.collaborator.create({
      data: {
        userId: userToAdd.id,
        repoId,
        role: role as CollaboratorRole,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    createAuditLog({
      action: "COLLABORATOR_ADDED",
      userId: session.user.id,
      repoId,
      metadata: {
        collaboratorUserId: userToAdd.id,
        collaboratorEmail: email,
        role,
      },
      req,
    });

    return NextResponse.json(collaborator, { status: 201 });
  } catch (error) {
    console.error("Error adding collaborator:", error);
    return NextResponse.json(
      { error: "Failed to add collaborator" },
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

    const body = await req.json();
    const { userId } = body as { userId: string };

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Find the collaborator to remove
    const collaborator = await prisma.collaborator.findUnique({
      where: { userId_repoId: { userId, repoId } },
    });
    if (!collaborator) {
      return NextResponse.json(
        { error: "Collaborator not found" },
        { status: 404 }
      );
    }

    // Cannot remove owner
    if (collaborator.role === CollaboratorRole.OWNER) {
      return NextResponse.json(
        { error: "Cannot remove the repository owner" },
        { status: 403 }
      );
    }

    await prisma.collaborator.delete({
      where: { userId_repoId: { userId, repoId } },
    });

    createAuditLog({
      action: "COLLABORATOR_REMOVED",
      userId: session.user.id,
      repoId,
      metadata: { removedUserId: userId, removedRole: collaborator.role },
      req,
    });

    return NextResponse.json({ message: "Collaborator removed" });
  } catch (error) {
    console.error("Error removing collaborator:", error);
    return NextResponse.json(
      { error: "Failed to remove collaborator" },
      { status: 500 }
    );
  }
}
