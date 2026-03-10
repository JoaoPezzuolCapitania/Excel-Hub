import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ repoId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { repoId } = await context.params;

    const repo = await prisma.repository.findUnique({
      where: { id: repoId },
      select: { id: true },
    });

    if (!repo) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    // Overview stats
    const [totalCommits, totalBranches, totalMRs, totalCollaborators] =
      await Promise.all([
        prisma.commit.count({
          where: { branch: { repoId } },
        }),
        prisma.branch.count({ where: { repoId } }),
        prisma.mergeRequest.count({ where: { repoId } }),
        prisma.collaborator.count({ where: { repoId } }),
      ]);

    // Weekly commit activity (last 12 weeks)
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    const commits = await prisma.commit.findMany({
      where: {
        branch: { repoId },
        createdAt: { gte: twelveWeeksAgo },
      },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by week
    const weeklyActivity: { week: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - i * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const count = commits.filter(
        (c) => c.createdAt >= weekStart && c.createdAt < weekEnd
      ).length;

      weeklyActivity.push({
        week: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count,
      });
    }

    // Top contributors
    const contributorCounts = await prisma.commit.groupBy({
      by: ["authorId"],
      where: { branch: { repoId } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    const contributorIds = contributorCounts.map((c) => c.authorId);
    const contributors = await prisma.user.findMany({
      where: { id: { in: contributorIds } },
      select: { id: true, name: true, email: true, image: true },
    });

    const topContributors = contributorCounts.map((c) => {
      const user = contributors.find((u) => u.id === c.authorId);
      return {
        id: c.authorId,
        name: user?.name || user?.email || "Unknown",
        image: user?.image,
        commits: c._count.id,
      };
    });

    // MR stats by status
    const mrStats = await prisma.mergeRequest.groupBy({
      by: ["status"],
      where: { repoId },
      _count: { id: true },
    });

    const mrStatusCounts = {
      open: 0,
      merged: 0,
      closed: 0,
    };
    for (const stat of mrStats) {
      const key = stat.status.toLowerCase() as keyof typeof mrStatusCounts;
      if (key in mrStatusCounts) {
        mrStatusCounts[key] = stat._count.id;
      }
    }

    return NextResponse.json({
      overview: {
        totalCommits,
        totalBranches,
        totalMRs,
        totalCollaborators,
      },
      weeklyActivity,
      topContributors,
      mrStats: mrStatusCounts,
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
