"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FunctionSquare } from "lucide-react";
import type { MergeConflict } from "@/lib/merge";

interface ResolvedValue {
  sheetName: string;
  row: number;
  col: string;
  value: unknown;
  formula?: string;
}

interface MergeConflictResolverProps {
  conflicts: MergeConflict[];
  onResolve: (resolved: ResolvedValue[]) => void;
  isLoading?: boolean;
}

function CellValue({ value, formula }: { value: unknown; formula?: string }) {
  return (
    <div>
      <span>{value !== undefined && value !== null ? String(value) : "(empty)"}</span>
      {formula && (
        <span className="mt-0.5 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400">
          <FunctionSquare className="h-3 w-3" />
          <span className="font-mono">={formula}</span>
        </span>
      )}
    </div>
  );
}

export function MergeConflictResolver({
  conflicts,
  onResolve,
  isLoading,
}: MergeConflictResolverProps) {
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
      sheetName: conflict.sheetName,
      row: conflict.row,
      col: conflict.col,
      value:
        choices[idx] === "source" ? conflict.sourceValue : conflict.targetValue,
      formula:
        choices[idx] === "source" ? conflict.sourceFormula : conflict.targetFormula,
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
                Base Value
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
              <tr key={`${conflict.sheetName}:${conflict.row}:${conflict.col}`}>
                <td className="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <div>{conflict.sheetName}</div>
                  <div className="text-xs text-gray-500">
                    Row {conflict.row + 1}, {conflict.col}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                  <CellValue value={conflict.baseValue} formula={conflict.baseFormula} />
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap px-3 py-2 text-sm",
                    choices[idx] === "source"
                      ? "bg-green-50 text-green-800 font-medium dark:bg-green-900/20 dark:text-green-300"
                      : "text-gray-700 dark:text-gray-300"
                  )}
                >
                  <CellValue value={conflict.sourceValue} formula={conflict.sourceFormula} />
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
                      ? "bg-green-50 text-green-800 font-medium dark:bg-green-900/20 dark:text-green-300"
                      : "text-gray-700 dark:text-gray-300"
                  )}
                >
                  <CellValue value={conflict.targetValue} formula={conflict.targetFormula} />
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
          isLoading={isLoading}
        >
          Resolve {conflicts.length} conflict
          {conflicts.length !== 1 ? "s" : ""} & Merge
        </Button>
      </div>
    </div>
  );
}
