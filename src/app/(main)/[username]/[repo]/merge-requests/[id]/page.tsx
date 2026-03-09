import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { DiffViewer } from "@/components/repo/diff-viewer";
import { Badge } from "@/components/ui/badge";
import { formatRelativeDate } from "@/lib/utils";
import { computeDiff } from "@/lib/diff";
import { GitMerge } from "lucide-react";
import type { ExcelSnapshot } from "@/types";
import { MergeRequestActions } from "./actions";

interface MergeRequestDetailPageProps {
  params: Promise<{ username: string; repo: string; id: string }>;
}

const STATUS_VARIANT: Record<string, "success" | "info" | "danger"> = {
  OPEN: "info",
  MERGED: "success",
  CLOSED: "danger",
};

export default async function MergeRequestDetailPage({
  params,
}: MergeRequestDetailPageProps) {
  const { username, repo: repoSlug, id: mrId } = await params;

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
    select: { id: true, ownerId: true },
  });

  if (!repo) notFound();

  const mr = await prisma.mergeRequest.findUnique({
    where: { id: mrId },
    include: {
      author: {
        select: { name: true, image: true },
      },
      sourceBranch: {
        include: {
          headCommit: {
            select: { id: true, jsonSnapshot: true },
          },
        },
      },
      targetBranch: {
        include: {
          headCommit: {
            select: { id: true, jsonSnapshot: true },
          },
        },
      },
    },
  });

  if (!mr) notFound();

  const session = await auth();
  const isOwner = session?.user?.id === repo.ownerId;

  // Compute diff between target head and source head
  const sourceSnapshot = mr.sourceBranch.headCommit?.jsonSnapshot as unknown as
    | ExcelSnapshot
    | undefined;
  const targetSnapshot = mr.targetBranch.headCommit?.jsonSnapshot as unknown as
    | ExcelSnapshot
    | undefined;

  const diff =
    sourceSnapshot && targetSnapshot
      ? computeDiff(targetSnapshot, sourceSnapshot)
      : null;

  return (
    <div className="space-y-6">
      {/* MR Header */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <GitMerge
                className={`h-5 w-5 ${
                  mr.status === "MERGED"
                    ? "text-green-600"
                    : mr.status === "OPEN"
                      ? "text-blue-600"
                      : "text-gray-400 dark:text-gray-500"
                }`}
              />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {mr.title}
              </h2>
              <Badge variant={STATUS_VARIANT[mr.status] || "default"}>
                {mr.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {mr.author.name || "Unknown"} wants to merge{" "}
              <span className="font-mono text-xs rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">
                {mr.sourceBranch.name}
              </span>
              {" into "}
              <span className="font-mono text-xs rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-gray-700 dark:text-gray-300">
                {mr.targetBranch.name}
              </span>
              {" \u00b7 "}
              {formatRelativeDate(mr.createdAt)}
            </p>
            {mr.description && (
              <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">{mr.description}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        {isOwner && mr.status === "OPEN" && (
          <MergeRequestActions mrId={mr.id} />
        )}
      </div>

      {/* Diff */}
      {diff ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Changes
          </h3>
          <DiffViewer diff={diff} />
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {!sourceSnapshot || !targetSnapshot
            ? "One or both branches have no commits to compare."
            : "No changes between these branches."}
        </div>
      )}
    </div>
  );
}
