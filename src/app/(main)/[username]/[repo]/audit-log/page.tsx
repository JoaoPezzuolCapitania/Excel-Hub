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
import { ClipboardList, Download } from "lucide-react";

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

  function handleExportCSV() {
    const headers = ["Date", "Action", "User", "Details"];
    const rows = logs.map((log) => [
      new Date(log.createdAt).toISOString(),
      log.action,
      log.user?.name || log.user?.email || "Unknown",
      JSON.stringify(log.metadata),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${repoSlug}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Audit Log
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={logs.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
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
