import { Skeleton, TableSkeleton } from "@/components/ui/loading-skeleton";

export default function RepoLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mb-6 h-4 w-72" />
      <div className="mb-6 flex items-center gap-4">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <TableSkeleton rows={8} />
      </div>
    </div>
  );
}
