import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeDate } from "@/lib/utils";
import { GitMerge, Plus } from "lucide-react";

interface MergeRequestsPageProps {
  params: Promise<{ username: string; repo: string }>;
}

const STATUS_VARIANT: Record<string, "success" | "info" | "danger"> = {
  OPEN: "info",
  MERGED: "success",
  CLOSED: "danger",
};

export default async function MergeRequestsPage({
  params,
}: MergeRequestsPageProps) {
  const { username, repo: repoSlug } = await params;

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
    include: {
      mergeRequests: {
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: { name: true, image: true },
          },
          sourceBranch: {
            select: { name: true },
          },
          targetBranch: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!repo) notFound();

  const repoPath = `/${username}/${repoSlug}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Merge Requests</h2>
        <Link href={`${repoPath}/merge-requests/new`}>
          <Button variant="primary" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New merge request
          </Button>
        </Link>
      </div>

      {repo.mergeRequests.length === 0 ? (
        <EmptyState
          icon={GitMerge}
          title="No merge requests"
          description="Create a merge request to propose changes from one branch to another."
          action={
            <Link href={`${repoPath}/merge-requests/new`}>
              <Button variant="primary" size="sm">
                Create merge request
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {repo.mergeRequests.map((mr) => (
            <Link
              key={mr.id}
              href={`${repoPath}/merge-requests/${mr.id}`}
              className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                <GitMerge
                  className={`h-4 w-4 ${
                    mr.status === "MERGED"
                      ? "text-green-600"
                      : mr.status === "OPEN"
                        ? "text-blue-600"
                        : "text-gray-400 dark:text-gray-500"
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {mr.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {mr.sourceBranch.name} &rarr; {mr.targetBranch.name}
                    {" \u00b7 "}
                    opened by {mr.author.name || "Unknown"}{" "}
                    {formatRelativeDate(mr.createdAt)}
                  </p>
                </div>
              </div>
              <Badge variant={STATUS_VARIANT[mr.status] || "default"}>
                {mr.status}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
