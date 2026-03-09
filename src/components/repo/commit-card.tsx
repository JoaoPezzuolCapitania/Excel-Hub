import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatRelativeDate } from "@/lib/utils";

interface CommitCardProps {
  commit: {
    id: string;
    hash: string;
    message: string;
    createdAt: Date | string;
    author: {
      name: string | null;
      image: string | null;
    };
  };
  repoPath: string;
}

export function CommitCard({ commit, repoPath }: CommitCardProps) {
  return (
    <Link
      href={`${repoPath}/commit/${commit.id}`}
      className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
    >
      <Avatar
        src={commit.author.image}
        alt={commit.author.name || "Author"}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
          {commit.message}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {commit.author.name || "Unknown"} committed{" "}
          {formatRelativeDate(commit.createdAt)}
        </p>
      </div>
      <Badge className="font-mono text-xs">{commit.hash}</Badge>
    </Link>
  );
}
