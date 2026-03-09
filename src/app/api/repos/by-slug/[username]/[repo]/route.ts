import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ username: string; repo: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { username, repo: repoSlug } = await context.params;

    const owner = await prisma.user.findFirst({
      where: { name: username },
      select: { id: true },
    });

    if (!owner) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const repo = await prisma.repository.findUnique({
      where: {
        ownerId_slug: {
          ownerId: owner.id,
          slug: repoSlug,
        },
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
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

    return NextResponse.json(repo);
  } catch (error) {
    console.error("Error fetching repository by slug:", error);
    return NextResponse.json(
      { error: "Failed to fetch repository" },
      { status: 500 }
    );
  }
}
