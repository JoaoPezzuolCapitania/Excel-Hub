import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SpreadsheetViewer } from "@/components/repo/spreadsheet-viewer";
import { DiffViewer } from "@/components/repo/diff-viewer";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatRelativeDate } from "@/lib/utils";
import { computeDiff } from "@/lib/diff";
import type { ExcelSnapshot } from "@/types";

interface CommitDetailPageProps {
  params: Promise<{ username: string; repo: string; id: string }>;
}

export default async function CommitDetailPage({
  params,
}: CommitDetailPageProps) {
  const { username, repo: repoSlug, id: commitId } = await params;

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

  const commit = await prisma.commit.findUnique({
    where: { id: commitId },
    include: {
      author: {
        select: { name: true, image: true, email: true },
      },
      parent: {
        select: { id: true, jsonSnapshot: true },
      },
    },
  });

  if (!commit) notFound();

  const snapshot = commit.jsonSnapshot as unknown as ExcelSnapshot;
  const parentSnapshot = commit.parent?.jsonSnapshot as unknown as ExcelSnapshot | null;

  // Compute diff if there's a parent commit
  const diff = parentSnapshot ? computeDiff(parentSnapshot, snapshot) : null;

  return (
    <div className="space-y-6">
      {/* Commit metadata */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <Avatar
            src={commit.author.image}
            alt={commit.author.name || "Author"}
            size="lg"
          />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              {commit.message}
            </h2>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
              <span>{commit.author.name || "Unknown"}</span>
              <span>committed {formatRelativeDate(commit.createdAt)}</span>
              <Badge className="font-mono">{commit.hash}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Diff from parent */}
      {diff && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">
            Changes from parent commit
          </h3>
          <DiffViewer diff={diff} />
        </div>
      )}

      {/* Current file viewer */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          File contents
        </h3>
        <SpreadsheetViewer snapshot={snapshot} />
      </div>
    </div>
  );
}
