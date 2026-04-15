"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CollaboratorList } from "@/components/repo/collaborator-list";
import { Lock, Globe, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RepoSettings {
  id: string;
  name: string;
  description: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  ownerId: string;
}

interface Collaborator {
  id: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export default function RepoSettingsPage() {
  const router = useRouter();
  const params = useParams<{ username: string; repo: string }>();
  const { username, repo: repoSlug } = params;

  const [settings, setSettings] = useState<RepoSettings | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchSettings() {
      try {
        const [repoRes, collabRes] = await Promise.all([
          fetch(`/api/repos/by-slug/${username}/${repoSlug}`),
          fetch(`/api/repos/by-slug/${username}/${repoSlug}/collaborators`),
        ]);

        if (repoRes.ok) {
          const repoData = await repoRes.json();
          setSettings(repoData);
          setName(repoData.name);
          setDescription(repoData.description || "");
          setVisibility(repoData.visibility);
        }

        if (collabRes.ok) {
          const collabData = await collabRes.json();
          setCollaborators(collabData);
        }
      } catch {
        // Silently handle fetch error
      }
    }
    fetchSettings();
  }, [username, repoSlug]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/repos/${settings.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, visibility }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update repository");
      }

      const updated = await res.json();
      setSuccess("Settings saved successfully.");

      // If slug changed, redirect
      if (updated.slug !== repoSlug) {
        router.push(`/${username}/${updated.slug}/settings`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!settings || deleteConfirmText !== settings.name) return;

    setIsDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/repos/${settings.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete repository");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsDeleting(false);
    }
  }

  if (!settings) {
    return (
      <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* General settings */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">General</h2>
        <form onSubmit={handleSave} className="space-y-6">
          <Input
            label="Repository name"
            id="repo-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
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
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <Globe
                  className={cn(
                    "h-5 w-5",
                    visibility === "PUBLIC"
                      ? "text-brand-600"
                      : "text-gray-400 dark:text-gray-500"
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
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <Lock
                  className={cn(
                    "h-5 w-5",
                    visibility === "PRIVATE"
                      ? "text-brand-600"
                      : "text-gray-400 dark:text-gray-500"
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
            <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 dark:bg-green-950/30 p-3 text-sm text-green-600 dark:text-green-400">
              {success}
            </div>
          )}

          <Button type="submit" variant="primary" isLoading={isSaving}>
            Save changes
          </Button>
        </form>
      </div>

      {/* Collaborators */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
        <CollaboratorList
          collaborators={collaborators}
          repoId={settings.id}
          isOwner={true}
        />
      </div>

      {/* Danger zone */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
        <h2 className="mb-4 text-lg font-semibold text-red-600">
          Danger Zone
        </h2>
        <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Delete this repository
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Once you delete a repository, there is no going back. This will
            permanently delete the repository, all branches, commits, and
            collaborators.
          </p>

          {!showDeleteConfirm ? (
            <Button
              variant="danger"
              size="sm"
              className="mt-4"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete this repository
            </Button>
          ) : (
            <div className="mt-4 space-y-3">
              <Input
                label={`Type "${settings.name}" to confirm`}
                id="delete-confirm"
                placeholder={settings.name}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
              />
              <div className="flex gap-3">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  isLoading={isDeleting}
                  disabled={deleteConfirmText !== settings.name}
                >
                  I understand, delete this repository
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
