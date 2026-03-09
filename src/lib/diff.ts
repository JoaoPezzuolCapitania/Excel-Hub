import type { ExcelSnapshot, SheetData } from "./excel";

export interface CellChange {
  row: number;
  col: string;
  oldValue: unknown;
  newValue: unknown;
  type: "added" | "removed" | "modified";
}

export interface SheetDiff {
  sheetName: string;
  status: "added" | "removed" | "modified" | "unchanged";
  cellChanges: CellChange[];
  addedRows: number[];
  removedRows: number[];
  stats: { added: number; removed: number; modified: number };
}

export interface SnapshotDiff {
  sheets: SheetDiff[];
  summary: {
    totalChanges: number;
    sheetsChanged: number;
    totalAdded: number;
    totalRemoved: number;
    totalModified: number;
  };
}

function diffSheets(
  oldSheet: SheetData | null,
  newSheet: SheetData | null,
  sheetName: string
): SheetDiff {
  if (!oldSheet && newSheet) {
    const cellChanges: CellChange[] = [];
    const addedRows: number[] = [];
    newSheet.rows.forEach((row, rowIdx) => {
      addedRows.push(rowIdx);
      for (const col of newSheet.headers) {
        if (row[col] !== undefined) {
          cellChanges.push({
            row: rowIdx,
            col,
            oldValue: undefined,
            newValue: row[col],
            type: "added",
          });
        }
      }
    });
    return {
      sheetName,
      status: "added",
      cellChanges,
      addedRows,
      removedRows: [],
      stats: { added: cellChanges.length, removed: 0, modified: 0 },
    };
  }

  if (oldSheet && !newSheet) {
    const cellChanges: CellChange[] = [];
    const removedRows: number[] = [];
    oldSheet.rows.forEach((row, rowIdx) => {
      removedRows.push(rowIdx);
      for (const col of oldSheet.headers) {
        if (row[col] !== undefined) {
          cellChanges.push({
            row: rowIdx,
            col,
            oldValue: row[col],
            newValue: undefined,
            type: "removed",
          });
        }
      }
    });
    return {
      sheetName,
      status: "removed",
      cellChanges,
      addedRows: [],
      removedRows,
      stats: { added: 0, removed: cellChanges.length, modified: 0 },
    };
  }

  if (!oldSheet || !newSheet) {
    return {
      sheetName,
      status: "unchanged",
      cellChanges: [],
      addedRows: [],
      removedRows: [],
      stats: { added: 0, removed: 0, modified: 0 },
    };
  }

  const cellChanges: CellChange[] = [];
  const addedRows: number[] = [];
  const removedRows: number[] = [];
  const allCols = Array.from(new Set([...oldSheet.headers, ...newSheet.headers]));
  const maxRows = Math.max(oldSheet.rows.length, newSheet.rows.length);

  for (let rowIdx = 0; rowIdx < maxRows; rowIdx++) {
    const oldRow = oldSheet.rows[rowIdx];
    const newRow = newSheet.rows[rowIdx];

    if (!oldRow && newRow) {
      addedRows.push(rowIdx);
      for (const col of allCols) {
        if (newRow[col] !== undefined) {
          cellChanges.push({
            row: rowIdx,
            col,
            oldValue: undefined,
            newValue: newRow[col],
            type: "added",
          });
        }
      }
      continue;
    }

    if (oldRow && !newRow) {
      removedRows.push(rowIdx);
      for (const col of allCols) {
        if (oldRow[col] !== undefined) {
          cellChanges.push({
            row: rowIdx,
            col,
            oldValue: oldRow[col],
            newValue: undefined,
            type: "removed",
          });
        }
      }
      continue;
    }

    if (oldRow && newRow) {
      for (const col of allCols) {
        const oldVal = oldRow[col];
        const newVal = newRow[col];

        if (oldVal === undefined && newVal !== undefined) {
          cellChanges.push({
            row: rowIdx,
            col,
            oldValue: undefined,
            newValue: newVal,
            type: "added",
          });
        } else if (oldVal !== undefined && newVal === undefined) {
          cellChanges.push({
            row: rowIdx,
            col,
            oldValue: oldVal,
            newValue: undefined,
            type: "removed",
          });
        } else if (String(oldVal) !== String(newVal)) {
          cellChanges.push({
            row: rowIdx,
            col,
            oldValue: oldVal,
            newValue: newVal,
            type: "modified",
          });
        }
      }
    }
  }

  const stats = {
    added: cellChanges.filter((c) => c.type === "added").length,
    removed: cellChanges.filter((c) => c.type === "removed").length,
    modified: cellChanges.filter((c) => c.type === "modified").length,
  };

  return {
    sheetName,
    status: cellChanges.length > 0 ? "modified" : "unchanged",
    cellChanges,
    addedRows,
    removedRows,
    stats,
  };
}

export function computeDiff(
  oldSnapshot: ExcelSnapshot,
  newSnapshot: ExcelSnapshot
): SnapshotDiff {
  const allSheetNames = Array.from(new Set([
    ...oldSnapshot.sheets.map((s) => s.name),
    ...newSnapshot.sheets.map((s) => s.name),
  ]));

  const sheets: SheetDiff[] = [];

  for (const sheetName of allSheetNames) {
    const oldSheet =
      oldSnapshot.sheets.find((s) => s.name === sheetName) || null;
    const newSheet =
      newSnapshot.sheets.find((s) => s.name === sheetName) || null;
    sheets.push(diffSheets(oldSheet, newSheet, sheetName));
  }

  const totalAdded = sheets.reduce((sum, s) => sum + s.stats.added, 0);
  const totalRemoved = sheets.reduce((sum, s) => sum + s.stats.removed, 0);
  const totalModified = sheets.reduce((sum, s) => sum + s.stats.modified, 0);

  return {
    sheets,
    summary: {
      totalChanges: totalAdded + totalRemoved + totalModified,
      sheetsChanged: sheets.filter((s) => s.status !== "unchanged").length,
      totalAdded,
      totalRemoved,
      totalModified,
    },
  };
}
