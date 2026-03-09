import { CardSkeleton } from "@/components/ui/loading-skeleton";

export default function AuditLogLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-8 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="h-20 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
