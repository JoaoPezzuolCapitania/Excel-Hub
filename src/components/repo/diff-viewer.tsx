"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { SnapshotDiff, CellChange } from "@/types";
import { Badge } from "@/components/ui/badge";

interface DiffViewerProps {
  diff: SnapshotDiff;
}

type ViewMode = "side-by-side" | "unified";

function getCellBg(type: CellChange["type"]) {
  switch (type) {
    case "added":
      return "#dcfce7";
    case "removed":
      return "#fee2e2";
    case "modified":
      return "#fef3c7";
    default:
      return undefined;
  }
}

export function DiffViewer({ diff }: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("side-by-side");
  const [activeSheet, setActiveSheet] = useState(0);

  const sheet = diff.sheets[activeSheet];

  // Collect all unique rows and columns affected in the current sheet
  const { allRows, allCols, changeMap } = useMemo(() => {
    if (!sheet) return { allRows: [], allCols: [], changeMap: new Map() };

    const rowSet = new Set<number>();
    const colSet = new Set<string>();
    const map = new Map<string, CellChange>();

    for (const change of sheet.cellChanges) {
      rowSet.add(change.row);
      colSet.add(change.col);
      map.set(`${change.row}:${change.col}`, change);
    }

    return {
      allRows: Array.from(rowSet).sort((a, b) => a - b),
      allCols: Array.from(colSet).sort(),
      changeMap: map,
    };
  }, [sheet]);

  if (!sheet) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        No diff data available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <span className="text-sm font-medium text-gray-700">Changes:</span>
        <span className="text-sm font-semibold text-green-700">
          +{diff.summary.totalAdded} added
        </span>
        <span className="text-sm font-semibold text-red-700">
          -{diff.summary.totalRemoved} removed
        </span>
        <span className="text-sm font-semibold text-amber-700">
          ~{diff.summary.totalModified} modified
        </span>
        <span className="text-xs text-gray-500">
          ({diff.summary.sheetsChanged} sheet
          {diff.summary.sheetsChanged !== 1 ? "s" : ""} changed)
        </span>
      </div>

      {/* View mode toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode("side-by-side")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            viewMode === "side-by-side"
              ? "bg-brand-100 text-brand-700"
              : "text-gray-500 hover:bg-gray-100"
          )}
        >
          Side by side
        </button>
        <button
          onClick={() => setViewMode("unified")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            viewMode === "unified"
              ? "bg-brand-100 text-brand-700"
              : "text-gray-500 hover:bg-gray-100"
          )}
        >
          Unified
        </button>
      </div>

      {/* Sheet tabs */}
      {diff.sheets.length > 1 && (
        <div className="flex gap-1 border-b border-gray-200">
          {diff.sheets.map((s, idx) => {
            const totalSheetChanges =
              s.stats.added + s.stats.removed + s.stats.modified;
            return (
              <button
                key={s.sheetName}
                onClick={() => setActiveSheet(idx)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                  idx === activeSheet
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                {s.sheetName}
                {totalSheetChanges > 0 && (
                  <Badge
                    variant={
                      s.status === "added"
                        ? "success"
                        : s.status === "removed"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {totalSheetChanges}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Diff table */}
      {allRows.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500">
          No cell changes in this sheet.
        </div>
      ) : viewMode === "unified" ? (
        <UnifiedView
          allRows={allRows}
          allCols={allCols}
          changeMap={changeMap}
        />
      ) : (
        <SideBySideView
          allRows={allRows}
          allCols={allCols}
          changeMap={changeMap}
        />
      )}
    </div>
  );
}

function UnifiedView({
  allRows,
  allCols,
  changeMap,
}: {
  allRows: number[];
  allCols: string[];
  changeMap: Map<string, CellChange>;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
              #
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
              Column
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
              Old Value
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
              New Value
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
              Type
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {allRows.flatMap((row) =>
            allCols
              .filter((col) => changeMap.has(`${row}:${col}`))
              .map((col) => {
                const change = changeMap.get(`${row}:${col}`)!;
                return (
                  <tr key={`${row}:${col}`}>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-400">
                      {row + 1}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-700">
                      {col}
                    </td>
                    <td
                      className="whitespace-nowrap px-3 py-2 text-sm text-gray-700"
                      style={{
                        backgroundColor:
                          change.type === "removed" || change.type === "modified"
                            ? getCellBg("removed")
                            : undefined,
                      }}
                    >
                      {change.oldValue !== undefined
                        ? String(change.oldValue)
                        : ""}
                    </td>
                    <td
                      className="whitespace-nowrap px-3 py-2 text-sm text-gray-700"
                      style={{
                        backgroundColor:
                          change.type === "added" || change.type === "modified"
                            ? getCellBg("added")
                            : undefined,
                      }}
                    >
                      {change.newValue !== undefined
                        ? String(change.newValue)
                        : ""}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Badge
                        variant={
                          change.type === "added"
                            ? "success"
                            : change.type === "removed"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {change.type}
                      </Badge>
                    </td>
                  </tr>
                );
              })
          )}
        </tbody>
      </table>
    </div>
  );
}

function SideBySideView({
  allRows,
  allCols,
  changeMap,
}: {
  allRows: number[];
  allCols: string[];
  changeMap: Map<string, CellChange>;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Old (left) */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <div className="bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 border-b border-gray-200">
          Before
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                #
              </th>
              {allCols.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {allRows.map((row) => (
              <tr key={row}>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-400">
                  {row + 1}
                </td>
                {allCols.map((col) => {
                  const change = changeMap.get(`${row}:${col}`);
                  return (
                    <td
                      key={col}
                      className="whitespace-nowrap px-3 py-2 text-sm text-gray-700"
                      style={{
                        backgroundColor: change
                          ? getCellBg(
                              change.type === "added" ? "added" : change.type
                            )
                          : undefined,
                      }}
                    >
                      {change?.oldValue !== undefined
                        ? String(change.oldValue)
                        : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New (right) */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <div className="bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 border-b border-gray-200">
          After
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                #
              </th>
              {allCols.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {allRows.map((row) => (
              <tr key={row}>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-400">
                  {row + 1}
                </td>
                {allCols.map((col) => {
                  const change = changeMap.get(`${row}:${col}`);
                  return (
                    <td
                      key={col}
                      className="whitespace-nowrap px-3 py-2 text-sm text-gray-700"
                      style={{
                        backgroundColor: change
                          ? getCellBg(
                              change.type === "removed"
                                ? "removed"
                                : change.type
                            )
                          : undefined,
                      }}
                    >
                      {change?.newValue !== undefined
                        ? String(change.newValue)
                        : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
