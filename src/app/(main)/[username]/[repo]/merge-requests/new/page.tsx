"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface Branch {
  id: string;
  name: string;
}

export default function NewMergeRequestPage() {
  const router = useRouter();
  const params = useParams<{ username: string; repo: string }>();
  const { username, repo: repoSlug } = params;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [sourceBranchId, setSourceBranchId] = useState("");
  const [targetBranchId, setTargetBranchId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await fetch(
          `/api/repos/by-slug/${username}/${repoSlug}/branches`
        );
        if (res.ok) {
          const data = await res.json();
          setBranches(data);
          if (data.length > 0) {
            setTargetBranchId(data[0].id);
            if (data.length > 1) {
              setSourceBranchId(data[1].id);
            }
          }
        }
      } catch {
        // Silently handle fetch error
      }
    }
    fetchBranches();
  }, [username, repoSlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !sourceBranchId || !targetBranchId) return;

    if (sourceBranchId === targetBranchId) {
      setError("Source and target branches must be different.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/repos/by-slug/${username}/${repoSlug}/merge-requests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description,
            sourceBranchId,
            targetBranchId,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create merge request");
      }

      const mr = await res.json();
      router.push(`/${username}/${repoSlug}/merge-requests/${mr.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  const branchOptions = branches.map((b) => ({
    value: b.id,
    label: b.name,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        New Merge Request
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Title"
          id="mr-title"
          placeholder="Describe your changes"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description (optional)
          </label>
          <textarea
            className="flex min-h-[100px] w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            placeholder="Provide additional context about the changes"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Source branch"
            id="source-branch"
            options={branchOptions}
            value={sourceBranchId}
            onChange={(e) => setSourceBranchId(e.target.value)}
          />
          <Select
            label="Target branch"
            id="target-branch"
            options={branchOptions}
            value={targetBranchId}
            onChange={(e) => setTargetBranchId(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 pt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={!title.trim() || !sourceBranchId || !targetBranchId}
          >
            Create merge request
          </Button>
        </div>
      </form>
    </div>
  );
}
