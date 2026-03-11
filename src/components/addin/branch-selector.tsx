"use client";

import { useEffect, useState } from "react";
import { GitBranch } from "lucide-react";

interface Branch {
  id: string;
  name: string;
}

interface BranchSelectorProps {
  repoId: string;
  selectedBranchId: string;
  onSelect: (branch: Branch | null) => void;
}

export function BranchSelector({
  repoId,
  selectedBranchId,
  onSelect,
}: BranchSelectorProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!repoId) return;
    fetchBranches();
  }, [repoId]);

  async function fetchBranches() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/repos/${repoId}/branches`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBranches(data);

      // Auto-select main or first branch
      if (data.length > 0) {
        const main = data.find((b: Branch) => b.name === "main");
        const saved = data.find((b: Branch) => b.id === selectedBranchId);
        onSelect(saved || main || data[0]);
      }
    } catch {
      setBranches([]);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-md bg-gray-100 p-3 dark:bg-gray-800">
        <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
        <GitBranch className="h-3.5 w-3.5" />
        Branch
      </label>
      <select
        value={selectedBranchId}
        onChange={(e) => {
          const branch = branches.find((b) => b.id === e.target.value) || null;
          onSelect(branch);
        }}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800"
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
}
