import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ repositories: [], commits: [], branches: [] });
    }

    const userId = session.user.id;

    // Only search repos the user has access to
    const accessFilter = {
      OR: [
        { ownerId: userId },
        { collaborators: { some: { userId } } },
      ],
    };

    const [repositories, commits, branches] = await Promise.all([
      // Search repositories
      prisma.repository.findMany({
        where: {
          ...accessFilter,
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        },
        include: {
          owner: { select: { name: true } },
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),

      // Search commits
      prisma.commit.findMany({
        where: {
          branch: { repo: accessFilter },
          OR: [
            { message: { contains: q, mode: "insensitive" as const } },
            { hash: { contains: q, mode: "insensitive" as const } },
          ],
        },
        include: {
          author: { select: { name: true } },
          branch: {
            select: {
              name: true,
              repo: {
                select: {
                  slug: true,
                  owner: { select: { name: true } },
                },
              },
            },
          },
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),

      // Search branches
      prisma.branch.findMany({
        where: {
          repo: accessFilter,
          name: { contains: q, mode: "insensitive" as const },
        },
        include: {
          repo: {
            select: {
              slug: true,
              owner: { select: { name: true } },
            },
          },
        },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      repositories: repositories.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        ownerName: r.owner.name,
        url: `/${r.owner.name}/${r.slug}`,
      })),
      commits: commits.map((c) => ({
        id: c.id,
        hash: c.hash,
        message: c.message,
        authorName: c.author?.name,
        branchName: c.branch?.name,
        repoSlug: c.branch?.repo?.slug,
        ownerName: c.branch?.repo?.owner?.name,
        url: `/${c.branch?.repo?.owner?.name}/${c.branch?.repo?.slug}/commits`,
      })),
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        repoSlug: b.repo.slug,
        ownerName: b.repo.owner.name,
        url: `/${b.repo.owner.name}/${b.repo.slug}?branch=${b.id}`,
      })),
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
