"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MergeConflictResolver } from "@/components/repo/merge-conflict-resolver";
import type { MergeConflict } from "@/lib/merge";

interface MergeRequestActionsProps {
  mrId: string;
  repoId: string;
}

export function MergeRequestActions({
  mrId,
  repoId,
}: MergeRequestActionsProps) {
  const [isLoading, setIsLoading] = useState<"merge" | "close" | "resolve" | null>(null);
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState<MergeConflict[] | null>(null);
  const router = useRouter();

  async function handleAction(action: "merge" | "close") {
    setIsLoading(action === "merge" ? "merge" : "close");
    setError("");
    setConflicts(null);

    try {
      const status = action === "merge" ? "MERGED" : "CLOSED";
      const res = await fetch(`/api/repos/${repoId}/merge-requests/${mrId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.status === 409) {
        const data = await res.json();
        setConflicts(data.conflicts);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${action} merge request`);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(null);
    }
  }

  async function handleResolve(resolved: Array<{ sheetName: string; row: number; col: string; value: unknown; formula?: string }>) {
    setIsLoading("resolve");
    setError("");

    try {
      const res = await fetch(`/api/repos/${repoId}/merge-requests/${mrId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolutions: resolved }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resolve conflicts");
      }

      setConflicts(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(null);
    }
  }

  return (
    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
      {conflicts ? (
        <MergeConflictResolver
          conflicts={conflicts}
          onResolve={handleResolve}
          isLoading={isLoading === "resolve"}
        />
      ) : (
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleAction("merge")}
            isLoading={isLoading === "merge"}
            disabled={isLoading !== null}
          >
            Merge
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleAction("close")}
            isLoading={isLoading === "close"}
            disabled={isLoading !== null}
          >
            Close
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
