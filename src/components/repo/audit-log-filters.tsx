"use client";

import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface AuditLogFiltersState {
  action: string;
  dateFrom: string;
  dateTo: string;
}

interface AuditLogFiltersProps {
  filters: AuditLogFiltersState;
  onFilterChange: (filters: AuditLogFiltersState) => void;
}

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "REPO_CREATED", label: "Repository created" },
  { value: "REPO_UPDATED", label: "Repository updated" },
  { value: "REPO_DELETED", label: "Repository deleted" },
  { value: "COMMIT_CREATED", label: "Commit created" },
  { value: "BRANCH_CREATED", label: "Branch created" },
  { value: "MERGE_REQUEST_CREATED", label: "Merge request opened" },
  { value: "MERGE_REQUEST_MERGED", label: "Merge request merged" },
  { value: "MERGE_REQUEST_CLOSED", label: "Merge request closed" },
  { value: "COLLABORATOR_ADDED", label: "Collaborator added" },
  { value: "COLLABORATOR_REMOVED", label: "Collaborator removed" },
  { value: "FILE_UPLOADED", label: "File uploaded" },
  { value: "REVIEW_COMMENT_ADDED", label: "Review comment added" },
];

export function AuditLogFilters({ filters, onFilterChange }: AuditLogFiltersProps) {
  const hasActiveFilters = filters.action || filters.dateFrom || filters.dateTo;

  function handleClear() {
    onFilterChange({ action: "", dateFrom: "", dateTo: "" });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          options={ACTION_OPTIONS}
          value={filters.action}
          onChange={(e) =>
            onFilterChange({ ...filters, action: e.target.value })
          }
        />
        <Input
          type="date"
          placeholder="From date"
          value={filters.dateFrom}
          onChange={(e) =>
            onFilterChange({ ...filters, dateFrom: e.target.value })
          }
        />
        <Input
          type="date"
          placeholder="To date"
          value={filters.dateTo}
          onChange={(e) =>
            onFilterChange({ ...filters, dateTo: e.target.value })
          }
        />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="self-end">
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
