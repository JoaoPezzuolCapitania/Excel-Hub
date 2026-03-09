import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SpreadsheetViewer } from "@/components/repo/spreadsheet-viewer";
import { BranchSelector } from "@/components/repo/branch-selector";
import { FileUploadButton } from "./file-upload-button";
import { EmptyState } from "@/components/ui/empty-state";
import { FileSpreadsheet } from "lucide-react";
import type { ExcelSnapshot } from "@/types";

interface RepoPageProps {
  params: Promise<{ username: string; repo: string }>;
  searchParams: Promise<{ branch?: string }>;
}

export default async function RepoPage({
  params,
  searchParams,
}: RepoPageProps) {
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
        select: { id: true, name: true, headCommitId: true },
      },
    },
  });

  if (!repo) notFound();

  const session = await auth();
  const isOwner = session?.user?.id === repo.ownerId;

  // Find the active branch
  const defaultBranch = repo.branches.find(
    (b) => b.name === repo.defaultBranch
  );
  const activeBranch = branchId
    ? repo.branches.find((b) => b.id === branchId) || defaultBranch
    : defaultBranch;

  // Get the latest commit (head) of the active branch
  const headCommit = activeBranch?.headCommitId
    ? await prisma.commit.findUnique({
        where: { id: activeBranch.headCommitId },
        select: { id: true, jsonSnapshot: true },
      })
    : null;

  const repoPath = `/${username}/${repoSlug}`;
  const snapshot = headCommit?.jsonSnapshot as unknown as ExcelSnapshot | null;

  return (
    <div className="space-y-6">
      {/* Top bar: branch selector + upload */}
      <div className="flex items-center justify-between">
        <BranchSelector
          branches={repo.branches.map((b) => ({ id: b.id, name: b.name }))}
          currentBranch={activeBranch?.id || ""}
          repoPath={repoPath}
        />
        {isOwner && activeBranch && (
          <FileUploadButton repoId={repo.id} branchId={activeBranch.id} />
        )}
      </div>

      {/* Spreadsheet content */}
      {snapshot ? (
        <SpreadsheetViewer snapshot={snapshot} />
      ) : (
        <EmptyState
          icon={FileSpreadsheet}
          title="No files yet"
          description="Upload a spreadsheet to get started with version control."
        />
      )}
    </div>
  );
}
