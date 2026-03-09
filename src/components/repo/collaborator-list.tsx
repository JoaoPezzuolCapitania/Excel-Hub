"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Trash2, UserPlus } from "lucide-react";

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

interface CollaboratorListProps {
  collaborators: Collaborator[];
  repoId: string;
  isOwner: boolean;
}

const ROLE_OPTIONS = [
  { value: "EDITOR", label: "Editor" },
  { value: "VIEWER", label: "Viewer" },
];

const ROLE_BADGE_VARIANT: Record<string, "success" | "info" | "default"> = {
  OWNER: "success",
  EDITOR: "info",
  VIEWER: "default",
};

export function CollaboratorList({
  collaborators,
  repoId,
  isOwner,
}: CollaboratorListProps) {
  const [list, setList] = useState<Collaborator[]>(collaborators);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("EDITOR");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setIsAdding(true);
    setError("");

    try {
      const res = await fetch(`/api/repos/${repoId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add collaborator");
      }

      const newCollab = await res.json();
      setList((prev) => [...prev, newCollab]);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRoleChange(collaboratorId: string, newRole: string) {
    try {
      const res = await fetch(
        `/api/repos/${repoId}/collaborators/${collaboratorId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }

      setList((prev) =>
        prev.map((c) =>
          c.id === collaboratorId
            ? { ...c, role: newRole as Collaborator["role"] }
            : c
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function handleRemove(collaboratorId: string) {
    try {
      const res = await fetch(
        `/api/repos/${repoId}/collaborators/${collaboratorId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove collaborator");
      }

      setList((prev) => prev.filter((c) => c.id !== collaboratorId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    }
  }

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Collaborators</h3>

      {/* Collaborator list */}
      <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
        {list.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No collaborators yet.
          </div>
        ) : (
          list.map((collab) => (
            <div
              key={collab.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  src={collab.user.image}
                  alt={collab.user.name || "User"}
                  size="sm"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {collab.user.name || "Unnamed"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {collab.user.email || ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isOwner && collab.role !== "OWNER" ? (
                  <>
                    <Select
                      options={ROLE_OPTIONS}
                      value={collab.role}
                      onChange={(e) =>
                        handleRoleChange(collab.id, e.target.value)
                      }
                      className="w-28"
                    />
                    <button
                      onClick={() => handleRemove(collab.id)}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors dark:text-gray-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                      title="Remove collaborator"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <Badge variant={ROLE_BADGE_VARIANT[collab.role] || "default"}>
                    {collab.role}
                  </Badge>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add collaborator form (owner only) */}
      {isOwner && (
        <form onSubmit={handleAdd} className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add collaborator
          </h4>
          <div className="flex gap-3">
            <Input
              placeholder="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Select
              options={ROLE_OPTIONS}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-32"
            />
            <Button type="submit" variant="primary" isLoading={isAdding}>
              Add
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </form>
      )}
    </div>
  );
}
