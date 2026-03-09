import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeDate } from "@/lib/utils";
import { GitBranch } from "lucide-react";
import { CreateBranchButton } from "./create-branch-button";

interface BranchesPageProps {
  params: Promise<{ username: string; repo: string }>;
}

export default async function BranchesPage({ params }: BranchesPageProps) {
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
      branches: {
        include: {
          headCommit: {
            select: {
              id: true,
              hash: true,
              message: true,
              createdAt: true,
              author: {
                select: { name: true, image: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!repo) notFound();

  const session = await auth();
  const isOwner = session?.user?.id === repo.ownerId;
  const repoPath = `/${username}/${repoSlug}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Branches</h2>
        {isOwner && (
          <CreateBranchButton
            repoId={repo.id}
            branches={repo.branches.map((b) => ({ id: b.id, name: b.name }))}
          />
        )}
      </div>

      {repo.branches.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No branches"
          description="Create a branch to start organizing your work."
        />
      ) : (
        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {repo.branches.map((branch) => (
            <div
              key={branch.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <GitBranch className="h-4 w-4 text-gray-400" />
                <div>
                  <Link
                    href={`${repoPath}?branch=${branch.id}`}
                    className="text-sm font-medium text-brand-600 hover:underline"
                  >
                    {branch.name}
                  </Link>
                  {branch.name === repo.defaultBranch && (
                    <Badge variant="success" className="ml-2">
                      default
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                {branch.headCommit ? (
                  <div>
                    <p className="text-sm text-gray-700 truncate max-w-xs">
                      {branch.headCommit.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {branch.headCommit.author.name || "Unknown"} &middot;{" "}
                      {formatRelativeDate(branch.headCommit.createdAt)}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No commits</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
