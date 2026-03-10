"use client";

interface StatsCardProps {
  icon: React.ElementType;
  label: string;
  count: number;
  color?: string;
}

export function StatsCard({ icon: Icon, label, count, color = "text-brand-600" }: StatsCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg bg-gray-50 p-2 dark:bg-gray-800 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{count}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
