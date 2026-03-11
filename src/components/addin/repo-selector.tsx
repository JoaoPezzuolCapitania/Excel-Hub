"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";

interface Repo {
  id: string;
  name: string;
  slug: string;
  branches: { id: string; name: string }[];
}

interface RepoSelectorProps {
  selectedRepoId: string;
  onSelect: (repo: Repo | null) => void;
}

export function RepoSelector({ selectedRepoId, onSelect }: RepoSelectorProps) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRepos();
  }, []);

  async function fetchRepos() {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/repos");
      if (!res.ok) throw new Error("Falha ao carregar repositórios");
      const data = await res.json();
      setRepos(data);

      // Auto-select if saved or only one
      if (data.length === 1) {
        onSelect(data[0]);
      } else if (selectedRepoId) {
        const saved = data.find((r: Repo) => r.id === selectedRepoId);
        if (saved) onSelect(saved);
      }
    } catch {
      setError("Erro ao carregar repositórios");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-md bg-gray-100 p-3 dark:bg-gray-800">
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <div className="rounded-md bg-gray-50 p-3 text-center text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        Nenhum repositório encontrado. Crie um no site primeiro.
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
        <BookOpen className="h-3.5 w-3.5" />
        Repositório
      </label>
      <select
        value={selectedRepoId}
        onChange={(e) => {
          const repo = repos.find((r) => r.id === e.target.value) || null;
          onSelect(repo);
        }}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800"
      >
        <option value="">Selecione...</option>
        {repos.map((repo) => (
          <option key={repo.id} value={repo.id}>
            {repo.name}
          </option>
        ))}
      </select>
    </div>
  );
}
