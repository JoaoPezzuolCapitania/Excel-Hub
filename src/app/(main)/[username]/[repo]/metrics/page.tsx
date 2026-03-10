"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { GitCommitHorizontal, GitBranch, GitMerge, Users } from "lucide-react";
import { StatsCard } from "@/components/repo/metrics/stats-card";
import { CommitActivityChart } from "@/components/repo/metrics/commit-activity-chart";
import { ContributorChart } from "@/components/repo/metrics/contributor-chart";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import { Badge } from "@/components/ui/badge";

interface MetricsData {
  overview: {
    totalCommits: number;
    totalBranches: number;
    totalMRs: number;
    totalCollaborators: number;
  };
  weeklyActivity: { week: string; count: number }[];
  topContributors: { id: string; name: string; image: string | null; commits: number }[];
  mrStats: { open: number; merged: number; closed: number };
}

export default function MetricsPage() {
  const params = useParams<{ username: string; repo: string }>();
  const { username, repo: repoSlug } = params;

  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchMetrics() {
      try {
        // Resolve repo ID first
        const repoRes = await fetch(`/api/repos/by-slug/${username}/${repoSlug}`);
        if (!repoRes.ok) throw new Error("Failed to load repository");
        const repoData = await repoRes.json();

        const metricsRes = await fetch(`/api/repos/${repoData.id}/metrics`);
        if (!metricsRes.ok) throw new Error("Failed to load metrics");
        const data = await metricsRes.json();
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    }
    fetchMetrics();
  }, [username, repoSlug]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Metrics</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!metrics) return null;

  const maxContributorCommits = Math.max(...metrics.topContributors.map((c) => c.commits), 1);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Metrics</h2>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatsCard
          icon={GitCommitHorizontal}
          label="Total Commits"
          count={metrics.overview.totalCommits}
          color="text-gray-600"
        />
        <StatsCard
          icon={GitBranch}
          label="Branches"
          count={metrics.overview.totalBranches}
          color="text-blue-600"
        />
        <StatsCard
          icon={GitMerge}
          label="Merge Requests"
          count={metrics.overview.totalMRs}
          color="text-green-600"
        />
        <StatsCard
          icon={Users}
          label="Collaborators"
          count={metrics.overview.totalCollaborators}
          color="text-purple-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CommitActivityChart data={metrics.weeklyActivity} />
        <ContributorChart
          data={metrics.topContributors.map((c) => ({
            name: c.name,
            commits: c.commits,
          }))}
        />
      </div>

      {/* Top contributors list */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Top Contributors
        </h3>
        <div className="space-y-3">
          {metrics.topContributors.map((contributor, idx) => (
            <div key={contributor.id} className="flex items-center gap-3">
              <span className="w-5 text-right text-xs font-medium text-gray-400">
                {idx + 1}
              </span>
              {contributor.image ? (
                <Image
                  src={contributor.image}
                  alt={contributor.name}
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  {contributor.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-32 truncate">
                {contributor.name}
              </span>
              <div className="flex-1">
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-2 rounded-full bg-brand-500"
                    style={{
                      width: `${(contributor.commits / maxContributorCommits) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {contributor.commits} commits
              </span>
            </div>
          ))}
          {metrics.topContributors.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No contributors yet</p>
          )}
        </div>
      </div>

      {/* MR Status breakdown */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Merge Request Status
        </h3>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Badge variant="info">Open</Badge>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {metrics.mrStats.open}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success">Merged</Badge>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {metrics.mrStats.merged}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="danger">Closed</Badge>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {metrics.mrStats.closed}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
