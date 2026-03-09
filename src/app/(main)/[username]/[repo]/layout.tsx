import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Lock, Globe, GitBranch, GitCommitHorizontal, GitMerge, Settings } from "lucide-react";

interface RepoLayoutProps {
  children: React.ReactNode;
  params: Promise<{ username: string; repo: string }>;
}

const NAV_TABS = [
  { key: "code", label: "Code", icon: GitBranch, segment: "" },
  { key: "commits", label: "Commits", icon: GitCommitHorizontal, segment: "/commits" },
  { key: "branches", label: "Branches", icon: GitBranch, segment: "/branches" },
  { key: "merge-requests", label: "Merge Requests", icon: GitMerge, segment: "/merge-requests" },
  { key: "settings", label: "Settings", icon: Settings, segment: "/settings" },
];

export default async function RepoLayout({ children, params }: RepoLayoutProps) {
  const { username, repo: repoSlug } = await params;

  const owner = await prisma.user.findFirst({
    where: { name: username },
    select: { id: true },
  });

  if (!owner) notFound();

  const repo = await prisma.repository.findUnique({
    where: {
      ownerId_slug: {
        ownerId: owner.id,
        slug: repoSlug,
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      visibility: true,
      defaultBranch: true,
    },
  });

  if (!repo) notFound();

  const basePath = `/${username}/${repoSlug}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Repo header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">
            <Link
              href={`/${username}`}
              className="text-brand-600 hover:underline"
            >
              {username}
            </Link>
            <span className="mx-1 text-gray-400">/</span>
            <Link href={basePath} className="hover:underline">
              {repo.name}
            </Link>
          </h1>
          <Badge variant={repo.visibility === "PUBLIC" ? "info" : "default"}>
            {repo.visibility === "PUBLIC" ? (
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" /> Public
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" /> Private
              </span>
            )}
          </Badge>
        </div>
        {repo.description && (
          <p className="mt-1 text-sm text-gray-500">{repo.description}</p>
        )}
      </div>

      {/* Navigation tabs */}
      <nav className="mb-6 border-b border-gray-200">
        <div className="-mb-px flex space-x-6">
          {NAV_TABS.map((tab) => {
            const href = `${basePath}${tab.segment}`;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.key}
                href={href}
                className="flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Page content */}
      {children}
    </div>
  );
}
