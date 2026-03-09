import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CommitList } from "@/components/repo/commit-list";
import { BranchSelector } from "@/components/repo/branch-selector";

interface CommitsPageProps {
  params: Promise<{ username: string; repo: string }>;
  searchParams: Promise<{ branch?: string }>;
}

export default async function CommitsPage({
  params,
  searchParams,
}: CommitsPageProps) {
  const { username, repo: repoSlug } = await params;
  const { branch: branchId } = await searchParams;

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
        select: { id: true, name: true },
      },
    },
  });

  if (!repo) notFound();

  // Determine active branch
  const defaultBranch = repo.branches.find(
    (b) => b.name === repo.defaultBranch
  );
  const activeBranch = branchId
    ? repo.branches.find((b) => b.id === branchId) || defaultBranch
    : defaultBranch;

  // Fetch commits for the active branch
  const commits = activeBranch
    ? await prisma.commit.findMany({
        where: { branchId: activeBranch.id },
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: { name: true, image: true },
          },
        },
      })
    : [];

  const repoPath = `/${username}/${repoSlug}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <BranchSelector
          branches={repo.branches.map((b) => ({ id: b.id, name: b.name }))}
          currentBranch={activeBranch?.id || ""}
          repoPath={`${repoPath}/commits`}
        />
        <p className="text-sm text-gray-500">
          {commits.length} commit{commits.length !== 1 ? "s" : ""}
        </p>
      </div>

      <CommitList commits={commits} repoPath={repoPath} />
    </div>
  );
}
