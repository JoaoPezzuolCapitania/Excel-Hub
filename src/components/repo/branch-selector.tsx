"use client";

import { useRouter, usePathname } from "next/navigation";
import { Select } from "@/components/ui/select";
import { GitBranch } from "lucide-react";

interface BranchSelectorProps {
  branches: { id: string; name: string }[];
  currentBranch: string;
  repoPath: string;
}

export function BranchSelector({
  branches,
  currentBranch,
  repoPath,
}: BranchSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const branchId = e.target.value;
    const basePath = pathname.startsWith(repoPath) ? pathname : repoPath;
    const url = new URL(basePath, window.location.origin);
    url.searchParams.set("branch", branchId);
    router.push(url.pathname + url.search);
  }

  return (
    <div className="flex items-center gap-2">
      <GitBranch className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      <Select
        options={branches.map((b) => ({ value: b.id, label: b.name }))}
        value={currentBranch}
        onChange={handleChange}
        className="w-48"
      />
    </div>
  );
}
