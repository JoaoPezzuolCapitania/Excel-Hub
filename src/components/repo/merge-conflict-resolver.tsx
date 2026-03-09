"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Conflict {
  row: number;
  col: string;
  sourceValue: unknown;
  targetValue: unknown;
}

interface ResolvedValue {
  row: number;
  col: string;
  value: unknown;
}

interface MergeConflictResolverProps {
  conflicts: Conflict[];
  onResolve: (resolved: ResolvedValue[]) => void;
}

export function MergeConflictResolver({
  conflicts,
  onResolve,
}: MergeConflictResolverProps) {
  // Track which value is chosen: "source" | "target" per conflict index
  const [choices, setChoices] = useState<Record<number, "source" | "target">>(
    {}
  );

  const allResolved = conflicts.every((_, idx) => choices[idx] !== undefined);

  function handleChoice(idx: number, choice: "source" | "target") {
    setChoices((prev) => ({ ...prev, [idx]: choice }));
  }

  function handleSubmit() {
    if (!allResolved) return;

    const resolved: ResolvedValue[] = conflicts.map((conflict, idx) => ({
      row: conflict.row,
      col: conflict.col,
      value:
        choices[idx] === "source" ? conflict.sourceValue : conflict.targetValue,
    }));

    onResolve(resolved);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-900/20">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""} found.
          Choose which value to keep for each cell.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Cell
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Source Value
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Keep Source
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Target Value
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Keep Target
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
            {conflicts.map((conflict, idx) => (
              <tr key={`${conflict.row}:${conflict.col}`}>
                <td className="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Row {conflict.row + 1}, {conflict.col}
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap px-3 py-2 text-sm",
                    choices[idx] === "source"
                      ? "bg-green-50 text-green-800 font-medium"
                      : "text-gray-700 dark:text-gray-300"
                  )}
                  style={{
                    backgroundColor:
                      choices[idx] !== "source" ? "#dcfce7" : undefined,
                  }}
                >
                  {conflict.sourceValue !== undefined
                    ? String(conflict.sourceValue)
                    : "(empty)"}
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="radio"
                    name={`conflict-${idx}`}
                    checked={choices[idx] === "source"}
                    onChange={() => handleChoice(idx, "source")}
                    className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                  />
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap px-3 py-2 text-sm",
                    choices[idx] === "target"
                      ? "bg-green-50 text-green-800 font-medium"
                      : "text-gray-700 dark:text-gray-300"
                  )}
                  style={{
                    backgroundColor:
                      choices[idx] !== "target" ? "#fee2e2" : undefined,
                  }}
                >
                  {conflict.targetValue !== undefined
                    ? String(conflict.targetValue)
                    : "(empty)"}
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="radio"
                    name={`conflict-${idx}`}
                    checked={choices[idx] === "target"}
                    onChange={() => handleChoice(idx, "target")}
                    className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!allResolved}
        >
          Resolve {conflicts.length} conflict
          {conflicts.length !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  );
}
