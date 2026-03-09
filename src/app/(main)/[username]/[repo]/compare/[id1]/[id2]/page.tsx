import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DiffViewer } from "@/components/repo/diff-viewer";
import { Badge } from "@/components/ui/badge";
import { computeDiff } from "@/lib/diff";
import type { ExcelSnapshot } from "@/types";
import { ArrowRight } from "lucide-react";

interface ComparePageProps {
  params: Promise<{ username: string; repo: string; id1: string; id2: string }>;
}

export default async function ComparePage({ params }: ComparePageProps) {
  const { username, repo: repoSlug, id1, id2 } = await params;

  const owner = await prisma.user.findFirst({
    where: { name: username },
    select: { id: true },
  });

  if (!owner) notFound();

  const repo = await prisma.repository.findUnique({
    where: {
      ownerId_slug: {
        ownerId: owner.id,
        slug: repoSlug,
      },
    },
    select: { id: true },
  });

  if (!repo) notFound();

  const [commit1, commit2] = await Promise.all([
    prisma.commit.findUnique({
      where: { id: id1 },
      select: { id: true, hash: true, message: true, jsonSnapshot: true },
    }),
    prisma.commit.findUnique({
      where: { id: id2 },
      select: { id: true, hash: true, message: true, jsonSnapshot: true },
    }),
  ]);

  if (!commit1 || !commit2) notFound();

  const snapshot1 = commit1.jsonSnapshot as unknown as ExcelSnapshot;
  const snapshot2 = commit2.jsonSnapshot as unknown as ExcelSnapshot;

  const diff = computeDiff(snapshot1, snapshot2);

  return (
    <div className="space-y-6">
      {/* Compare header */}
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {commit1.message}
          </p>
          <Badge className="font-mono mt-1">{commit1.hash}</Badge>
        </div>
        <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {commit2.message}
          </p>
          <Badge className="font-mono mt-1">{commit2.hash}</Badge>
        </div>
      </div>

      {/* Diff */}
      <DiffViewer diff={diff} />
    </div>
  );
}
