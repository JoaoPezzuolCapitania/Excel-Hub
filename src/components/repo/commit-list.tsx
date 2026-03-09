import { CommitCard } from "./commit-card";
import { EmptyState } from "@/components/ui/empty-state";
import { GitCommitHorizontal } from "lucide-react";

interface Commit {
  id: string;
  hash: string;
  message: string;
  createdAt: Date | string;
  author: {
    name: string | null;
    image: string | null;
  };
}

interface CommitListProps {
  commits: Commit[];
  repoPath: string;
}

export function CommitList({ commits, repoPath }: CommitListProps) {
  if (commits.length === 0) {
    return (
      <EmptyState
        icon={GitCommitHorizontal}
        title="No commits yet"
        description="Push your first spreadsheet to get started."
      />
    );
  }

  return (
    <div className="space-y-2">
      {commits.map((commit) => (
        <CommitCard key={commit.id} commit={commit} repoPath={repoPath} />
      ))}
    </div>
  );
}
