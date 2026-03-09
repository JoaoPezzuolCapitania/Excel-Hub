import { CommitSkeleton } from "@/components/ui/loading-skeleton";

export default function CommitsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 h-8 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <CommitSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
