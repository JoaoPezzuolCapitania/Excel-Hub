"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface MergeRequestActionsProps {
  mrId: string;
}

export function MergeRequestActions({
  mrId,
}: MergeRequestActionsProps) {
  const [isLoading, setIsLoading] = useState<"merge" | "close" | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleAction(action: "merge" | "close") {
    setIsLoading(action);
    setError("");

    try {
      const res = await fetch(`/api/merge-requests/${mrId}/${action}`, {
        method: "POST",
      });

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

  return (
    <div className="mt-4 flex items-center gap-3 border-t border-gray-200 pt-4">
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
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
