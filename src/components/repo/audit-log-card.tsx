"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatRelativeDate } from "@/lib/utils";
import {
  GitCommitHorizontal,
  GitBranch,
  GitMerge,
  UserPlus,
  UserMinus,
  Settings,
  Trash2,
  Plus,
  Upload,
  MessageSquare,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const ACTION_CONFIG: Record<
  string,
  {
    icon: React.ElementType;
    label: string;
    badgeVariant: "default" | "success" | "warning" | "danger" | "info";
  }
> = {
  REPO_CREATED: { icon: Plus, label: "Repo created", badgeVariant: "success" },
  REPO_UPDATED: { icon: Settings, label: "Repo updated", badgeVariant: "info" },
  REPO_DELETED: { icon: Trash2, label: "Repo deleted", badgeVariant: "danger" },
  COMMIT_CREATED: { icon: GitCommitHorizontal, label: "Commit", badgeVariant: "default" },
  BRANCH_CREATED: { icon: GitBranch, label: "Branch created", badgeVariant: "info" },
  MERGE_REQUEST_CREATED: { icon: GitMerge, label: "MR opened", badgeVariant: "info" },
  MERGE_REQUEST_MERGED: { icon: GitMerge, label: "MR merged", badgeVariant: "success" },
  MERGE_REQUEST_CLOSED: { icon: GitMerge, label: "MR closed", badgeVariant: "warning" },
  COLLABORATOR_ADDED: { icon: UserPlus, label: "Collaborator added", badgeVariant: "success" },
  COLLABORATOR_REMOVED: { icon: UserMinus, label: "Collaborator removed", badgeVariant: "danger" },
  FILE_UPLOADED: { icon: Upload, label: "File uploaded", badgeVariant: "default" },
  REVIEW_COMMENT_ADDED: { icon: MessageSquare, label: "Comment added", badgeVariant: "info" },
};

function getActionDescription(action: string, metadata: Record<string, unknown>): string {
  switch (action) {
    case "COMMIT_CREATED":
      return `created commit ${metadata.commitHash || ""} on branch "${metadata.branchName || "unknown"}"`;
    case "BRANCH_CREATED":
      return `created branch "${metadata.branchName}" from "${metadata.fromBranchName}"`;
    case "MERGE_REQUEST_CREATED":
      return `opened merge request "${metadata.title}"`;
    case "MERGE_REQUEST_MERGED":
      return `merged "${metadata.sourceBranchName}" into "${metadata.targetBranchName}"`;
    case "MERGE_REQUEST_CLOSED":
      return `closed merge request "${metadata.title}"`;
    case "COLLABORATOR_ADDED":
      return `added ${metadata.collaboratorEmail} as ${metadata.role}`;
    case "COLLABORATOR_REMOVED":
      return `removed a collaborator (role: ${metadata.removedRole})`;
    case "REPO_UPDATED":
      return "updated repository settings";
    case "REPO_DELETED":
      return `deleted repository "${metadata.repoName}"`;
    case "REPO_CREATED":
      return `created repository "${metadata.repoName}"`;
    case "FILE_UPLOADED":
      return `uploaded file "${metadata.fileName}"`;
    case "REVIEW_COMMENT_ADDED":
      return `commented on ${metadata.sheetName} (Row ${metadata.row}, ${metadata.col})`;
    default:
      return action.toLowerCase().replace(/_/g, " ");
  }
}

export interface AuditLogEntry {
  id: string;
  action: string;
  userId: string | null;
  repoId: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

interface AuditLogCardProps {
  log: AuditLogEntry;
}

export function AuditLogCard({ log }: AuditLogCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = ACTION_CONFIG[log.action] || {
    icon: Settings,
    label: log.action,
    badgeVariant: "default" as const,
  };
  const Icon = config.icon;
  const hasMetadata = Object.keys(log.metadata).length > 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </div>
        <Avatar
          src={log.user?.image}
          alt={log.user?.name || "User"}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-900 dark:text-gray-100">
            <span className="font-medium">
              {log.user?.name || log.user?.email || "Unknown user"}
            </span>{" "}
            {getActionDescription(log.action, log.metadata)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatRelativeDate(log.createdAt)}
          </p>
        </div>
        <Badge variant={config.badgeVariant}>{config.label}</Badge>
        {hasMetadata && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {expanded && hasMetadata && (
        <div className="ml-11 mt-3 rounded-md bg-gray-50 p-3 dark:bg-gray-800">
          <pre className="whitespace-pre-wrap break-all text-xs text-gray-600 dark:text-gray-400">
            {JSON.stringify(log.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
