"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { ReviewCommentForm } from "./review-comment-form";
import { formatRelativeDate } from "@/lib/utils";
import { CheckCircle, MessageSquare, Trash2 } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  resolved: boolean;
  sheetName: string;
  row: number;
  col: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  replies?: Comment[];
}

interface ReviewCommentThreadProps {
  comments: Comment[];
  sheetName: string;
  row: number;
  col: string;
  mrId: string;
  repoId: string;
  currentUserId?: string;
  onCommentAdded: () => void;
}

export function ReviewCommentThread({
  comments,
  sheetName,
  row,
  col,
  mrId,
  repoId,
  currentUserId,
  onCommentAdded,
}: ReviewCommentThreadProps) {
  const [showReplyForm, setShowReplyForm] = useState<string | null>(null);

  const cellComments = comments.filter(
    (c) => c.sheetName === sheetName && c.row === row && c.col === col
  );

  async function handleAddComment(content: string) {
    await fetch(`/api/repos/${repoId}/merge-requests/${mrId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, sheetName, row, col }),
    });
    onCommentAdded();
  }

  async function handleReply(content: string, parentId: string) {
    await fetch(`/api/repos/${repoId}/merge-requests/${mrId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, sheetName, row, col, parentId }),
    });
    setShowReplyForm(null);
    onCommentAdded();
  }

  async function handleResolve(commentId: string, resolved: boolean) {
    await fetch(`/api/repos/${repoId}/merge-requests/${mrId}/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved }),
    });
    onCommentAdded();
  }

  async function handleDelete(commentId: string) {
    await fetch(`/api/repos/${repoId}/merge-requests/${mrId}/comments/${commentId}`, {
      method: "DELETE",
    });
    onCommentAdded();
  }

  return (
    <div className="w-80 space-y-3 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <MessageSquare className="h-3.5 w-3.5" />
        <span>
          {sheetName} &middot; Row {row + 1}, {col}
        </span>
      </div>

      {cellComments.length > 0 ? (
        <div className="space-y-3">
          {cellComments.map((comment) => (
            <div key={comment.id}>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={comment.author.image}
                      alt={comment.author.name || ""}
                      size="sm"
                    />
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                      {comment.author.name || comment.author.email}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatRelativeDate(comment.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {currentUserId && (
                      <button
                        onClick={() => handleResolve(comment.id, !comment.resolved)}
                        className={`rounded p-0.5 ${comment.resolved ? "text-green-600" : "text-gray-400 hover:text-green-600"}`}
                        title={comment.resolved ? "Unresolve" : "Resolve"}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {currentUserId === comment.author.id && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="rounded p-0.5 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
              </div>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-4 mt-2 space-y-2 border-l-2 border-gray-100 pl-3 dark:border-gray-700">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Avatar src={reply.author.image} alt={reply.author.name || ""} size="sm" />
                        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                          {reply.author.name || reply.author.email}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatRelativeDate(reply.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply button */}
              {currentUserId && (
                <div className="mt-1">
                  {showReplyForm === comment.id ? (
                    <div className="mt-2">
                      <ReviewCommentForm
                        onSubmit={(content) => handleReply(content, comment.id)}
                        placeholder="Reply..."
                        submitLabel="Reply"
                      />
                      <button
                        onClick={() => setShowReplyForm(null)}
                        className="mt-1 text-xs text-gray-400 hover:text-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowReplyForm(comment.id)}
                      className="text-xs text-brand-600 hover:text-brand-700"
                    >
                      Reply
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {/* Add new comment */}
      {currentUserId && (
        <ReviewCommentForm onSubmit={handleAddComment} />
      )}
    </div>
  );
}
