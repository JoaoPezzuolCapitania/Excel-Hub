"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { AuditLogList } from "@/components/repo/audit-log-list";
import { AuditLogFilters } from "@/components/repo/audit-log-filters";
import type { AuditLogFiltersState } from "@/components/repo/audit-log-filters";
import type { AuditLogEntry } from "@/components/repo/audit-log-card";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import { Button } from "@/components/ui/button";
import { ClipboardList, Download, FileText, FileSpreadsheet } from "lucide-react";

export default function AuditLogPage() {
  const params = useParams<{ username: string; repo: string }>();
  const { username, repo: repoSlug } = params;

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<AuditLogFiltersState>({
    action: "",
    dateFrom: "",
    dateTo: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [repoId, setRepoId] = useState<string | null>(null);

  // Resolve repo slug to repo ID
  useEffect(() => {
    async function resolveRepo() {
      try {
        const res = await fetch(`/api/repos/by-slug/${username}/${repoSlug}`);
        if (res.ok) {
          const data = await res.json();
          setRepoId(data.id);
        } else {
          setError("Failed to load repository");
        }
      } catch {
        setError("Failed to load repository");
      }
    }
    resolveRepo();
  }, [username, repoSlug]);

  const fetchLogs = useCallback(
    async (page: number) => {
      if (!repoId) return;
      setIsLoading(true);
      setError("");

      try {
        const searchParams = new URLSearchParams({
          page: String(page),
          limit: "20",
        });
        if (filters.action) searchParams.set("action", filters.action);
        if (filters.dateFrom)
          searchParams.set("dateFrom", new Date(filters.dateFrom).toISOString());
        if (filters.dateTo)
          searchParams.set("dateTo", new Date(filters.dateTo).toISOString());

        const res = await fetch(
          `/api/repos/${repoId}/audit-logs?${searchParams}`
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch audit logs");
        }

        const data = await res.json();
        setLogs(data.logs);
        setPagination(data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    },
    [repoId, filters]
  );

  useEffect(() => {
    if (repoId) fetchLogs(1);
  }, [repoId, fetchLogs]);

  function handlePageChange(page: number) {
    fetchLogs(page);
  }

  function handleFilterChange(newFilters: AuditLogFiltersState) {
    setFilters(newFilters);
  }

  const [showExportMenu, setShowExportMenu] = useState(false);

  function handleExport(format: "pdf" | "csv") {
    if (!repoId) return;
    const params = new URLSearchParams({ format });
    if (filters.action) params.set("action", filters.action);
    if (filters.dateFrom) params.set("dateFrom", new Date(filters.dateFrom).toISOString());
    if (filters.dateTo) params.set("dateTo", new Date(filters.dateTo).toISOString());
    window.open(`/api/repos/${repoId}/audit-logs/export?${params}`, "_blank");
    setShowExportMenu(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Audit Log
        </h2>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={logs.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          {showExportMenu && (
            <div className="absolute right-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
              <button
                onClick={() => handleExport("pdf")}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <FileText className="h-4 w-4 text-red-500" />
                Export PDF
              </button>
              <button
                onClick={() => handleExport("csv")}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-500" />
                Export CSV
              </button>
            </div>
          )}
        </div>
      </div>

      <AuditLogFilters filters={filters} onFilterChange={handleFilterChange} />

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No audit log entries"
          description="Actions performed in this repository will appear here."
        />
      ) : (
        <>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {logs.length} of {pagination.total} entries
          </div>
          <AuditLogList logs={logs} />
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}
