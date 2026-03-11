"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Search,
  FileSpreadsheet,
  GitBranch,
  GitCommitHorizontal,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResults {
  repositories: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    ownerName: string;
    url: string;
  }[];
  commits: {
    id: string;
    hash: string;
    message: string;
    authorName: string | null;
    branchName: string | null;
    repoSlug: string | null;
    ownerName: string | null;
    url: string;
  }[];
  branches: {
    id: string;
    name: string;
    repoSlug: string;
    ownerName: string;
    url: string;
  }[];
}

interface FlatItem {
  type: "repo" | "commit" | "branch";
  url: string;
  data: SearchResults["repositories"][0] | SearchResults["commits"][0] | SearchResults["branches"][0];
}

export function CommandPalette() {
  const [isAddin, setIsAddin] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { data: session } = useSession();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setResults(null);
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    if (window.location.pathname.startsWith("/addin")) {
      setIsAddin(true);
    }
  }, []);

  // Ctrl+K / Cmd+K to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!session) return;
        setIsOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [session]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setSelectedIndex(0);
        }
      } catch {
        // silently fail
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Build flat list of results for keyboard navigation
  const flatItems: FlatItem[] = [];
  if (results) {
    for (const repo of results.repositories) {
      flatItems.push({ type: "repo", url: repo.url, data: repo });
    }
    for (const commit of results.commits) {
      flatItems.push({ type: "commit", url: commit.url, data: commit });
    }
    for (const branch of results.branches) {
      flatItems.push({ type: "branch", url: branch.url, data: branch });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flatItems[selectedIndex]) {
      e.preventDefault();
      navigate(flatItems[selectedIndex].url);
    }
  }

  function navigate(url: string) {
    close();
    router.push(url);
  }

  if (isAddin || !isOpen) return null;

  let itemIndex = -1;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
      />

      {/* Palette */}
      <div className="relative mx-auto mt-[15vh] w-full max-w-xl px-4">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
          {/* Search input */}
          <div className="flex items-center border-b border-gray-200 px-4 dark:border-gray-700">
            <Search className="h-5 w-5 shrink-0 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search repos, commits, branches..."
              className="flex-1 bg-transparent px-3 py-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            {isLoading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" />
            ) : (
              <kbd className="shrink-0 rounded-md border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400">
                ESC
              </kbd>
            )}
          </div>

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto scrollbar-thin">
            {query.length >= 2 && results && flatItems.length === 0 && !isLoading && (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No results for &ldquo;{query}&rdquo;
              </div>
            )}

            {query.length < 2 && !results && (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Type at least 2 characters to search
              </div>
            )}

            {results && results.repositories.length > 0 && (
              <div>
                <div className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Repositories
                </div>
                {results.repositories.map((repo) => {
                  itemIndex++;
                  const idx = itemIndex;
                  return (
                    <button
                      key={repo.id}
                      onClick={() => navigate(repo.url)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                        idx === selectedIndex
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300"
                          : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/50"
                      )}
                    >
                      <FileSpreadsheet className="h-4 w-4 shrink-0 text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {repo.ownerName}/{repo.name}
                        </div>
                        {repo.description && (
                          <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {repo.description}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {results && results.commits.length > 0 && (
              <div>
                <div className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Commits
                </div>
                {results.commits.map((commit) => {
                  itemIndex++;
                  const idx = itemIndex;
                  return (
                    <button
                      key={commit.id}
                      onClick={() => navigate(commit.url)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                        idx === selectedIndex
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300"
                          : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/50"
                      )}
                    >
                      <GitCommitHorizontal className="h-4 w-4 shrink-0 text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{commit.message}</div>
                        <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-mono">{commit.hash}</span>
                          {commit.authorName && <> · {commit.authorName}</>}
                          {commit.repoSlug && <> · {commit.ownerName}/{commit.repoSlug}</>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {results && results.branches.length > 0 && (
              <div>
                <div className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Branches
                </div>
                {results.branches.map((branch) => {
                  itemIndex++;
                  const idx = itemIndex;
                  return (
                    <button
                      key={branch.id}
                      onClick={() => navigate(branch.url)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                        idx === selectedIndex
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300"
                          : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/50"
                      )}
                    >
                      <GitBranch className="h-4 w-4 shrink-0 text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{branch.name}</div>
                        <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                          {branch.ownerName}/{branch.repoSlug}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bottom padding */}
            {results && flatItems.length > 0 && <div className="h-2" />}
          </div>
        </div>
      </div>
    </div>
  );
}
