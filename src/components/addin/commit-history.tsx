"use client";

import { useEffect, useState } from "react";
import { History, RefreshCw } from "lucide-react";

interface Commit {
  id: string;
  hash: string;
  message: string;
  createdAt: string;
  author: {
    name: string | null;
    image: string | null;
  };
}

interface CommitHistoryProps {
  repoId: string;
  branchId: string;
  refreshKey: number;
}

export function CommitHistory({
  repoId,
  branchId,
  refreshKey,
}: CommitHistoryProps) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!repoId || !branchId) return;
    fetchCommits();
  }, [repoId, branchId, refreshKey]);

  async function fetchCommits() {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/repos/${repoId}/commits?branchId=${branchId}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCommits(data.slice(0, 10));
    } catch {
      setCommits([]);
    } finally {
      setIsLoading(false);
    }
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return "agora";
    if (diffMin < 60) return `${diffMin}min atrás`;
    if (diffHr < 24) return `${diffHr}h atrás`;
    if (diffDay < 30) return `${diffDay}d atrás`;
    return date.toLocaleDateString("pt-BR");
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
          <History className="h-3.5 w-3.5" />
          Histórico
        </span>
        <button
          onClick={fetchCommits}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          title="Atualizar"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isLoading && commits.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-md bg-gray-100 p-2 dark:bg-gray-800"
            >
              <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      ) : commits.length === 0 ? (
        <div className="rounded-md bg-gray-50 p-3 text-center text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          Nenhum commit nesta branch.
        </div>
      ) : (
        <div className="space-y-1.5">
          {commits.map((commit) => (
            <div
              key={commit.id}
              className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-brand-600 dark:text-brand-400">
                  {commit.hash}
                </span>
                <span className="text-[10px] text-gray-400">
                  {formatTime(commit.createdAt)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-gray-700 dark:text-gray-300">
                {commit.message}
              </p>
              {commit.author.name && (
                <p className="mt-0.5 text-[10px] text-gray-400">
                  {commit.author.name}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
