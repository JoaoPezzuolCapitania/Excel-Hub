"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NewRepoPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, visibility }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create repository");
      }

      const data = await res.json();
      router.push(`/${data.owner.name || data.ownerId}/${data.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
        Create a new repository
      </h1>
      <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
        A repository contains all your spreadsheet files, branches, and commit
        history.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Repository name"
          id="name"
          placeholder="my-spreadsheet"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description (optional)
          </label>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
            placeholder="Short description of this repository"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Visibility
          </label>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setVisibility("PUBLIC")}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                visibility === "PUBLIC"
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
                  : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              )}
            >
              <Globe
                className={cn(
                  "h-5 w-5",
                  visibility === "PUBLIC" ? "text-brand-600" : "text-gray-400 dark:text-gray-500"
                )}
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Public</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Anyone can see this repository
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setVisibility("PRIVATE")}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                visibility === "PRIVATE"
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
                  : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              )}
            >
              <Lock
                className={cn(
                  "h-5 w-5",
                  visibility === "PRIVATE" ? "text-brand-600" : "text-gray-400 dark:text-gray-500"
                )}
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Private</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Only you and collaborators can see this repository
                </p>
              </div>
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={!name.trim()}
          >
            Create repository
          </Button>
        </div>
      </form>
    </div>
  );
}
