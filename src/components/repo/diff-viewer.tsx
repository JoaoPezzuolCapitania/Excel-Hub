"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { SnapshotDiff, CellChange } from "@/types";
import { Badge } from "@/components/ui/badge";
import { FunctionSquare, MessageSquare } from "lucide-react";
import { ReviewCommentThread } from "./review-comment-thread";

interface ReviewComment {
  id: string;
  content: string;
  resolved: boolean;
  sheetName: string;
  row: number;
  col: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  replies?: ReviewComment[];
}

interface DiffViewerProps {
  diff: SnapshotDiff;
  comments?: ReviewComment[];
  mrId?: string;
  repoId?: string;
  currentUserId?: string;
  onCommentAdded?: () => void;
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
    case "formula_changed":
      return "#e0e7ff";
    default:
      return undefined;
  }
}

function getBadgeVariant(type: CellChange["type"]) {
  switch (type) {
    case "added":
      return "success" as const;
    case "removed":
      return "danger" as const;
    case "modified":
      return "warning" as const;
    case "formula_changed":
      return "info" as const;
    default:
      return "default" as const;
  }
}

function FormulaDisplay({ formula, className }: { formula?: string; className?: string }) {
  if (!formula) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400", className)}>
      <FunctionSquare className="h-3 w-3" />
      <span className="font-mono">={formula}</span>
    </span>
  );
}

export function DiffViewer({ diff, comments, mrId, repoId, currentUserId, onCommentAdded }: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("side-by-side");
  const [activeSheet, setActiveSheet] = useState(0);
  const [activeCommentCell, setActiveCommentCell] = useState<string | null>(null);

  const sheet = diff.sheets[activeSheet];

  const commentCountMap = useMemo(() => {
    if (!comments) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const c of comments) {
      const key = `${c.sheetName}:${c.row}:${c.col}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [comments]);

  const handleCellCommentClick = useCallback((sheetName: string, row: number, col: string) => {
    const key = `${sheetName}:${row}:${col}`;
    setActiveCommentCell((prev) => (prev === key ? null : key));
  }, []);

  const canComment = !!(mrId && repoId && currentUserId);

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
      <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        No diff data available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-800 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Changes:</span>
        <span className="text-sm font-semibold text-green-700">
          +{diff.summary.totalAdded} added
        </span>
        <span className="text-sm font-semibold text-red-700">
          -{diff.summary.totalRemoved} removed
        </span>
        <span className="text-sm font-semibold text-amber-700">
          ~{diff.summary.totalModified} modified
        </span>
        {diff.summary.totalFormulaChanged > 0 && (
          <span className="text-sm font-semibold text-indigo-700">
            <FunctionSquare className="mr-1 inline h-3.5 w-3.5" />
            {diff.summary.totalFormulaChanged} formula
          </span>
        )}
        <span className="text-xs text-gray-500 dark:text-gray-400">
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
              : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
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
              : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          )}
        >
          Unified
        </button>
      </div>

      {/* Sheet tabs */}
      {diff.sheets.length > 1 && (
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
          {diff.sheets.map((s, idx) => {
            const totalSheetChanges =
              s.stats.added + s.stats.removed + s.stats.modified + s.stats.formulaChanged;
            return (
              <button
                key={s.sheetName}
                onClick={() => setActiveSheet(idx)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                  idx === activeSheet
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600"
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
        <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          No cell changes in this sheet.
        </div>
      ) : viewMode === "unified" ? (
        <UnifiedView
          allRows={allRows}
          allCols={allCols}
          changeMap={changeMap}
          sheetName={sheet.sheetName}
          commentCountMap={commentCountMap}
          canComment={canComment}
          activeCommentCell={activeCommentCell}
          onCellCommentClick={handleCellCommentClick}
          comments={comments}
          mrId={mrId}
          repoId={repoId}
          currentUserId={currentUserId}
          onCommentAdded={onCommentAdded}
        />
      ) : (
        <SideBySideView
          allRows={allRows}
          allCols={allCols}
          changeMap={changeMap}
          sheetName={sheet.sheetName}
          commentCountMap={commentCountMap}
          canComment={canComment}
          activeCommentCell={activeCommentCell}
          onCellCommentClick={handleCellCommentClick}
          comments={comments}
          mrId={mrId}
          repoId={repoId}
          currentUserId={currentUserId}
          onCommentAdded={onCommentAdded}
        />
      )}
    </div>
  );
}

interface CommentCellProps {
  sheetName: string;
  commentCountMap: Map<string, number>;
  canComment: boolean;
  activeCommentCell: string | null;
  onCellCommentClick: (sheetName: string, row: number, col: string) => void;
  comments?: ReviewComment[];
  mrId?: string;
  repoId?: string;
  currentUserId?: string;
  onCommentAdded?: () => void;
}

function CellCommentIndicator({
  commentCount,
  canComment,
  isActive,
  onClick,
}: {
  sheetName: string;
  row: number;
  col: string;
  commentCount: number;
  canComment: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  if (!canComment && commentCount === 0) return null;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-xs transition-colors",
        isActive
          ? "bg-brand-100 text-brand-700"
          : commentCount > 0
            ? "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
            : "text-gray-300 opacity-0 group-hover:opacity-100 hover:text-brand-600"
      )}
      title={commentCount > 0 ? `${commentCount} comment(s)` : "Add comment"}
    >
      <MessageSquare className="h-3 w-3" />
      {commentCount > 0 && <span>{commentCount}</span>}
    </button>
  );
}

function CellCommentPopover({
  sheetName,
  row,
  col,
  comments,
  mrId,
  repoId,
  currentUserId,
  onCommentAdded,
}: {
  sheetName: string;
  row: number;
  col: string;
  comments: ReviewComment[];
  mrId: string;
  repoId: string;
  currentUserId?: string;
  onCommentAdded?: () => void;
}) {
  return (
    <div className="absolute left-0 top-full z-50 mt-1">
      <ReviewCommentThread
        comments={comments}
        sheetName={sheetName}
        row={row}
        col={col}
        mrId={mrId}
        repoId={repoId}
        currentUserId={currentUserId}
        onCommentAdded={onCommentAdded || (() => {})}
      />
    </div>
  );
}

function UnifiedView({
  allRows,
  allCols,
  changeMap,
  sheetName,
  commentCountMap,
  canComment,
  activeCommentCell,
  onCellCommentClick,
  comments,
  mrId,
  repoId,
  currentUserId,
  onCommentAdded,
}: {
  allRows: number[];
  allCols: string[];
  changeMap: Map<string, CellChange>;
} & CommentCellProps) {
  const hasFormulas = Array.from(changeMap.values()).some(
    (c) => c.oldFormula || c.newFormula
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              #
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Column
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Old Value
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              New Value
            </th>
            {hasFormulas && (
              <>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Old Formula
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  New Formula
                </th>
              </>
            )}
            <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Type
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
          {allRows.flatMap((row) =>
            allCols
              .filter((col) => changeMap.has(`${row}:${col}`))
              .map((col) => {
                const change = changeMap.get(`${row}:${col}`)!;
                const cellKey = `${sheetName}:${row}:${col}`;
                const commentCount = commentCountMap.get(cellKey) || 0;
                const isCommentActive = activeCommentCell === cellKey;
                return (
                  <tr key={`${row}:${col}`} className="group">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
                      {row + 1}
                    </td>
                    <td className="relative whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        {col}
                        <CellCommentIndicator
                          sheetName={sheetName}
                          row={row}
                          col={col}
                          commentCount={commentCount}
                          canComment={canComment}
                          isActive={isCommentActive}
                          onClick={() => onCellCommentClick(sheetName, row, col)}
                        />
                      </div>
                      {isCommentActive && mrId && repoId && (
                        <CellCommentPopover
                          sheetName={sheetName}
                          row={row}
                          col={col}
                          comments={comments || []}
                          mrId={mrId}
                          repoId={repoId}
                          currentUserId={currentUserId}
                          onCommentAdded={onCommentAdded}
                        />
                      )}
                    </td>
                    <td
                      className="whitespace-nowrap px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
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
                      className="whitespace-nowrap px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
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
                    {hasFormulas && (
                      <>
                        <td
                          className="whitespace-nowrap px-3 py-2 text-xs font-mono text-gray-500 dark:text-gray-400"
                          style={{
                            backgroundColor:
                              change.type === "formula_changed"
                                ? getCellBg("formula_changed")
                                : undefined,
                          }}
                        >
                          {change.oldFormula ? `=${change.oldFormula}` : ""}
                        </td>
                        <td
                          className="whitespace-nowrap px-3 py-2 text-xs font-mono text-gray-500 dark:text-gray-400"
                          style={{
                            backgroundColor:
                              change.type === "formula_changed"
                                ? getCellBg("formula_changed")
                                : undefined,
                          }}
                        >
                          {change.newFormula ? `=${change.newFormula}` : ""}
                        </td>
                      </>
                    )}
                    <td className="whitespace-nowrap px-3 py-2">
                      <Badge variant={getBadgeVariant(change.type)}>
                        {change.type === "formula_changed" ? "formula" : change.type}
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
  sheetName,
  commentCountMap,
  canComment,
  activeCommentCell,
  onCellCommentClick,
  comments,
  mrId,
  repoId,
  currentUserId,
  onCommentAdded,
}: {
  allRows: number[];
  allCols: string[];
  changeMap: Map<string, CellChange>;
} & CommentCellProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Old (left) */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 border-b border-gray-200">
          Before
        </div>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                #
              </th>
              {allCols.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
            {allRows.map((row) => (
              <tr key={row} className="group">
                <td className="relative whitespace-nowrap px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
                  <div className="flex items-center gap-1">
                    {row + 1}
                    {(() => {
                      const firstCol = allCols.find((c) => changeMap.has(`${row}:${c}`)) || allCols[0];
                      const cellKey = `${sheetName}:${row}:${firstCol}`;
                      const commentCount = commentCountMap.get(cellKey) || 0;
                      const isActive = activeCommentCell === cellKey;
                      return (
                        <>
                          <CellCommentIndicator
                            sheetName={sheetName}
                            row={row}
                            col={firstCol}
                            commentCount={commentCount}
                            canComment={canComment}
                            isActive={isActive}
                            onClick={() => onCellCommentClick(sheetName, row, firstCol)}
                          />
                          {isActive && mrId && repoId && (
                            <CellCommentPopover
                              sheetName={sheetName}
                              row={row}
                              col={firstCol}
                              comments={comments || []}
                              mrId={mrId}
                              repoId={repoId}
                              currentUserId={currentUserId}
                              onCommentAdded={onCommentAdded}
                            />
                          )}
                        </>
                      );
                    })()}
                  </div>
                </td>
                {allCols.map((col) => {
                  const change = changeMap.get(`${row}:${col}`);
                  return (
                    <td
                      key={col}
                      className="whitespace-nowrap px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
                      style={{
                        backgroundColor: change
                          ? getCellBg(
                              change.type === "added" ? "added" : change.type
                            )
                          : undefined,
                      }}
                    >
                      <div>
                        {change?.oldValue !== undefined
                          ? String(change.oldValue)
                          : ""}
                      </div>
                      {change?.oldFormula && (
                        <FormulaDisplay formula={change.oldFormula} className="mt-0.5" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New (right) */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 border-b border-gray-200">
          After
        </div>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                #
              </th>
              {allCols.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
            {allRows.map((row) => (
              <tr key={row}>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
                  {row + 1}
                </td>
                {allCols.map((col) => {
                  const change = changeMap.get(`${row}:${col}`);
                  return (
                    <td
                      key={col}
                      className="whitespace-nowrap px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
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
                      <div>
                        {change?.newValue !== undefined
                          ? String(change.newValue)
                          : ""}
                      </div>
                      {change?.newFormula && (
                        <FormulaDisplay formula={change.newFormula} className="mt-0.5" />
                      )}
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
