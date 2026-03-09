"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { GitBranch } from "lucide-react";

interface CreateBranchButtonProps {
  repoId: string;
  branches: { id: string; name: string }[];
}

export function CreateBranchButton({
  repoId,
  branches,
}: CreateBranchButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [sourceBranchId, setSourceBranchId] = useState(
    branches[0]?.id || ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/repos/${repoId}/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          fromBranchId: sourceBranchId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        const msg = typeof data.error === "string" ? data.error : "Failed to create branch";
        throw new Error(msg);
      }

      setIsOpen(false);
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setIsOpen(true)}>
        <GitBranch className="mr-2 h-4 w-4" />
        New branch
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Create new branch"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Branch name"
            id="branch-name"
            placeholder="feature/my-branch"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Select
            label="Branch from"
            id="source-branch"
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
            value={sourceBranchId}
            onChange={(e) => setSourceBranchId(e.target.value)}
          />
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              disabled={!name.trim()}
            >
              Create branch
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
