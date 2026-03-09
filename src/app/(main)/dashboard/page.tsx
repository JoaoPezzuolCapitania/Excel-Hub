import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Plus,
  FolderGit2,
  Lock,
  Globe,
  GitBranch,
  Clock,
} from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const repositories = await prisma.repository.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        { collaborators: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      _count: { select: { branches: true, collaborators: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Your Repositories</h1>
        <Link href="/new">
          <Button variant="primary" size="sm">
            <Plus className="mr-1 h-4 w-4" />
            New repository
          </Button>
        </Link>
      </div>

      {repositories.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title="No repositories yet"
          description="Create your first repository to start version controlling your spreadsheets."
          action={
            <Link href="/new">
              <Button variant="primary" size="sm">
                <Plus className="mr-1 h-4 w-4" />
                New repository
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {repositories.map((repo) => (
            <Link
              key={repo.id}
              href={`/${repo.owner.name || repo.ownerId}/${repo.slug}`}
              className="block rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-brand-600 hover:underline">
                      {repo.owner.name && (
                        <span className="text-gray-500 font-normal dark:text-gray-400">
                          {repo.owner.name} /{" "}
                        </span>
                      )}
                      {repo.name}
                    </h2>
                    <Badge
                      variant={
                        repo.visibility === "PUBLIC" ? "info" : "default"
                      }
                    >
                      {repo.visibility === "PUBLIC" ? (
                        <Globe className="mr-1 h-3 w-3" />
                      ) : (
                        <Lock className="mr-1 h-3 w-3" />
                      )}
                      {repo.visibility.toLowerCase()}
                    </Badge>
                  </div>
                  {repo.description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {repo.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3.5 w-3.5" />
                      {repo._count.branches} branches
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Updated {formatRelativeDate(repo.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
