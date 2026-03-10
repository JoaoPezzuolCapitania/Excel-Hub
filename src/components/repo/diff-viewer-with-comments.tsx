"use client";

import { useState, useEffect, useCallback } from "react";
import { DiffViewer } from "./diff-viewer";
import type { SnapshotDiff } from "@/types";

interface DiffViewerWithCommentsProps {
  diff: SnapshotDiff;
  mrId: string;
  repoId: string;
  currentUserId?: string;
}

export function DiffViewerWithComments({
  diff,
  mrId,
  repoId,
  currentUserId,
}: DiffViewerWithCommentsProps) {
  const [comments, setComments] = useState<unknown[]>([]);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/repos/${repoId}/merge-requests/${mrId}/comments`
      );
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch {
      // ignore fetch errors silently
    }
  }, [repoId, mrId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return (
    <DiffViewer
      diff={diff}
      comments={comments as never[]}
      mrId={mrId}
      repoId={repoId}
      currentUserId={currentUserId}
      onCommentAdded={fetchComments}
    />
  );
}
