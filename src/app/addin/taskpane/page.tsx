"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AddinLogin } from "@/components/addin/addin-login";
import { RepoSelector } from "@/components/addin/repo-selector";
import { BranchSelector } from "@/components/addin/branch-selector";
import { CommitPanel } from "@/components/addin/commit-panel";
import { PullButton } from "@/components/addin/pull-button";
import { CommitHistory } from "@/components/addin/commit-history";
import { LogOut } from "lucide-react";

interface Repo {
  id: string;
  name: string;
  slug: string;
  branches: { id: string; name: string }[];
}

interface Branch {
  id: string;
  name: string;
}

interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

const STORAGE_KEY = "excelhub-addin";

function saveState(repoId: string, branchId: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ repoId, branchId }));
  } catch {}
}

export default function TaskPanePage() {
  const [officeReady, setOfficeReady] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const savedRef = useRef({ repoId: "", branchId: "" });

  // Load saved state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) savedRef.current = JSON.parse(saved);
    } catch {}
  }, []);

  // Initialize Office.js
  useEffect(() => {
    try {
      if (typeof Office !== "undefined" && Office.onReady) {
        Office.onReady(() => setOfficeReady(true));
      } else {
        setOfficeReady(true);
      }
    } catch {
      setOfficeReady(true);
    }
  }, []);

  // Check session
  const checkSession = useCallback(async () => {
    setIsCheckingAuth(true);
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      setUser(data?.user || null);
    } catch {
      setUser(null);
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    if (officeReady) checkSession();
  }, [officeReady, checkSession]);

  function handleRepoSelect(repo: Repo | null) {
    setSelectedRepo(repo);
    setSelectedBranch(null);
    if (repo) saveState(repo.id, "");
  }

  function handleBranchSelect(branch: Branch | null) {
    setSelectedBranch(branch);
    if (selectedRepo && branch) saveState(selectedRepo.id, branch.id);
  }

  function handleCommitSuccess() {
    setRefreshKey((k) => k + 1);
  }

  async function handleLogout() {
    await fetch("/api/auth/signout", { method: "POST" });
    setUser(null);
  }

  if (!officeReady || isCheckingAuth) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <AddinLogin onLoggedIn={checkSession} />;
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <span className="text-sm font-bold text-brand-600">ExcelHub</span>
        <div className="flex items-center gap-2">
          <span className="max-w-[120px] truncate text-xs text-gray-500">
            {user.name || user.email}
          </span>
          <button
            onClick={handleLogout}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            title="Sair"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <RepoSelector
          selectedRepoId={selectedRepo?.id || savedRef.current.repoId}
          onSelect={handleRepoSelect}
        />

        {selectedRepo && (
          <BranchSelector
            repoId={selectedRepo.id}
            selectedBranchId={selectedBranch?.id || savedRef.current.branchId}
            onSelect={handleBranchSelect}
          />
        )}

        {selectedRepo && selectedBranch && (
          <>
            <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
              <CommitPanel
                repoId={selectedRepo.id}
                branchId={selectedBranch.id}
                onCommitSuccess={handleCommitSuccess}
              />
            </div>

            <PullButton
              repoId={selectedRepo.id}
              branchId={selectedBranch.id}
            />

            <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
              <CommitHistory
                repoId={selectedRepo.id}
                branchId={selectedBranch.id}
                refreshKey={refreshKey}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
