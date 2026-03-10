import { prisma } from "@/lib/prisma";
import { computeDiff } from "@/lib/diff";
import { normalizeCellValue } from "@/lib/excel";
import type { ExcelSnapshot, CellData, CellChange, SnapshotDiff } from "@/types";

export interface MergeConflict {
  sheetName: string;
  row: number;
  col: string;
  baseValue: unknown;
  baseFormula?: string;
  sourceValue: unknown;
  sourceFormula?: string;
  targetValue: unknown;
  targetFormula?: string;
}

export interface MergeResult {
  merged: ExcelSnapshot;
  conflicts: MergeConflict[];
  autoResolved: number;
}

interface ChangeEntry {
  sheetName: string;
  row: number;
  col: string;
  oldValue: unknown;
  newValue: unknown;
  oldFormula?: string;
  newFormula?: string;
  type: CellChange["type"];
}

/**
 * Walks commit parent chains to find the common ancestor between two branches.
 */
export async function findCommonAncestor(
  sourceBranchId: string,
  targetBranchId: string
): Promise<ExcelSnapshot | null> {
  const [sourceBranch, targetBranch] = await Promise.all([
    prisma.branch.findUnique({
      where: { id: sourceBranchId },
      include: { headCommit: true },
    }),
    prisma.branch.findUnique({
      where: { id: targetBranchId },
      include: { headCommit: true },
    }),
  ]);

  if (!sourceBranch?.headCommit || !targetBranch?.headCommit) return null;

  // Build ancestor set for source branch
  const sourceAncestors = new Set<string>();
  let current: string | null = sourceBranch.headCommit.id;
  while (current) {
    sourceAncestors.add(current);
    const found: { parentId: string | null } | null = await prisma.commit.findUnique({
      where: { id: current },
      select: { parentId: true },
    });
    current = found?.parentId ?? null;
  }

  // Walk target branch until a match
  current = targetBranch.headCommit.id;
  while (current) {
    if (sourceAncestors.has(current)) {
      const ancestor = await prisma.commit.findUnique({
        where: { id: current },
        select: { jsonSnapshot: true },
      });
      return ancestor?.jsonSnapshot as unknown as ExcelSnapshot;
    }
    const found: { parentId: string | null } | null = await prisma.commit.findUnique({
      where: { id: current },
      select: { parentId: true },
    });
    current = found?.parentId ?? null;
  }

  return null;
}

function buildChangeMap(diff: SnapshotDiff): Map<string, ChangeEntry> {
  const map = new Map<string, ChangeEntry>();
  for (const sheet of diff.sheets) {
    for (const change of sheet.cellChanges) {
      const key = `${sheet.sheetName}:${change.row}:${change.col}`;
      map.set(key, {
        sheetName: sheet.sheetName,
        row: change.row,
        col: change.col,
        oldValue: change.oldValue,
        newValue: change.newValue,
        oldFormula: change.oldFormula,
        newFormula: change.newFormula,
        type: change.type,
      });
    }
  }
  return map;
}

function applyChange(
  snapshot: ExcelSnapshot,
  sheetName: string,
  row: number,
  col: string,
  value: unknown,
  formula?: string
) {
  const sheet = snapshot.sheets.find((s) => s.name === sheetName);
  if (!sheet) return;

  // Ensure the row exists
  while (sheet.rows.length <= row) {
    sheet.rows.push({});
  }

  // Ensure the header exists
  if (!sheet.headers.includes(col)) {
    sheet.headers.push(col);
  }

  const cellData: CellData = { value };
  if (formula) cellData.formula = formula;
  sheet.rows[row][col] = cellData;
}

/**
 * Three-way merge: compares base→source and base→target changes.
 * Non-conflicting changes are auto-applied. True conflicts are reported.
 */
export function threeWayMerge(
  base: ExcelSnapshot,
  source: ExcelSnapshot,
  target: ExcelSnapshot
): MergeResult {
  const sourceChanges = computeDiff(base, source);
  const targetChanges = computeDiff(base, target);

  const sourceMap = buildChangeMap(sourceChanges);
  const targetMap = buildChangeMap(targetChanges);

  const conflicts: MergeConflict[] = [];
  let autoResolved = 0;

  // Start with deep clone of target as merge base
  const merged: ExcelSnapshot = JSON.parse(JSON.stringify(target));

  // Apply source-only changes
  for (const [key, sourceChange] of Array.from(sourceMap.entries())) {
    const targetChange = targetMap.get(key);

    if (!targetChange) {
      // Source changed, target did not → auto-apply
      applyChange(
        merged,
        sourceChange.sheetName,
        sourceChange.row,
        sourceChange.col,
        sourceChange.newValue,
        sourceChange.newFormula
      );
      autoResolved++;
    } else {
      // Both changed same cell — check if same result
      const sourceNew = normalizeCellValue(sourceChange.newValue);
      const targetNew = normalizeCellValue(targetChange.newValue);

      if (
        String(sourceNew.value) === String(targetNew.value) &&
        (sourceNew.formula || "") === (targetNew.formula || "")
      ) {
        // Same change — no conflict
        autoResolved++;
      } else {
        // True conflict
        const baseOld = normalizeCellValue(sourceChange.oldValue);
        conflicts.push({
          sheetName: sourceChange.sheetName,
          row: sourceChange.row,
          col: sourceChange.col,
          baseValue: baseOld.value,
          baseFormula: baseOld.formula,
          sourceValue: sourceNew.value,
          sourceFormula: sourceNew.formula,
          targetValue: targetNew.value,
          targetFormula: targetNew.formula,
        });
      }
    }
  }

  return { merged, conflicts, autoResolved };
}

/**
 * Applies conflict resolutions to a merged snapshot.
 */
export function applyResolutions(
  merged: ExcelSnapshot,
  resolutions: Array<{ sheetName: string; row: number; col: string; value: unknown; formula?: string }>
): ExcelSnapshot {
  const result: ExcelSnapshot = JSON.parse(JSON.stringify(merged));
  for (const r of resolutions) {
    applyChange(result, r.sheetName, r.row, r.col, r.value, r.formula);
  }
  return result;
}
