"use client";

import { formatRelativeDate } from "@/lib/utils";
import {
  GitCommitHorizontal,
  GitMerge,
  MessageSquare,
  UserPlus,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  COMMIT_CREATED: GitCommitHorizontal,
  MR_OPENED: GitMerge,
  MR_MERGED: GitMerge,
  MR_CLOSED: GitMerge,
  COMMENT_ADDED: MessageSquare,
  COLLABORATOR_ADDED: UserPlus,
};

const COLOR_MAP: Record<string, string> = {
  COMMIT_CREATED: "text-gray-500",
  MR_OPENED: "text-blue-500",
  MR_MERGED: "text-green-500",
  MR_CLOSED: "text-red-500",
  COMMENT_ADDED: "text-indigo-500",
  COLLABORATOR_ADDED: "text-brand-600",
};

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    metadata: Record<string, unknown>;
  };
  onMarkRead: (id: string) => void;
}

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const Icon = ICON_MAP[notification.type] || GitCommitHorizontal;
  const iconColor = COLOR_MAP[notification.type] || "text-gray-500";

  return (
    <button
      onClick={() => !notification.read && onMarkRead(notification.id)}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
        !notification.read ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
      }`}
    >
      <div className={`mt-0.5 shrink-0 ${iconColor}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {notification.title}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          {notification.message}
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {formatRelativeDate(notification.createdAt)}
        </p>
      </div>
      {!notification.read && (
        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
      )}
    </button>
  );
}
