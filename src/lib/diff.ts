import type { ExcelSnapshot, SheetData, CellChange, SheetDiff, SnapshotDiff } from "@/types";
import { normalizeCellValue } from "./excel";

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
          const cell = normalizeCellValue(row[col]);
          cellChanges.push({
            row: rowIdx,
            col,
            oldValue: undefined,
            newValue: cell.value,
            newFormula: cell.formula,
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
      stats: { added: cellChanges.length, removed: 0, modified: 0, formulaChanged: 0 },
    };
  }

  if (oldSheet && !newSheet) {
    const cellChanges: CellChange[] = [];
    const removedRows: number[] = [];
    oldSheet.rows.forEach((row, rowIdx) => {
      removedRows.push(rowIdx);
      for (const col of oldSheet.headers) {
        if (row[col] !== undefined) {
          const cell = normalizeCellValue(row[col]);
          cellChanges.push({
            row: rowIdx,
            col,
            oldValue: cell.value,
            newValue: undefined,
            oldFormula: cell.formula,
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
      stats: { added: 0, removed: cellChanges.length, modified: 0, formulaChanged: 0 },
    };
  }

  if (!oldSheet || !newSheet) {
    return {
      sheetName,
      status: "unchanged",
      cellChanges: [],
      addedRows: [],
      removedRows: [],
      stats: { added: 0, removed: 0, modified: 0, formulaChanged: 0 },
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
          const newCell = normalizeCellValue(newRow[col]);
          cellChanges.push({
            row: rowIdx,
            col,
            oldValue: undefined,
            newValue: newCell.value,
            newFormula: newCell.formula,
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
          const oldCell = normalizeCellValue(oldRow[col]);
          cellChanges.push({
            row: rowIdx,
            col,
            oldValue: oldCell.value,
            newValue: undefined,
            oldFormula: oldCell.formula,
            type: "removed",
          });
        }
      }
      continue;
    }

    if (oldRow && newRow) {
      for (const col of allCols) {
        const oldRaw = oldRow[col];
        const newRaw = newRow[col];
        const oldCell = normalizeCellValue(oldRaw);
        const newCell = normalizeCellValue(newRaw);

        if (oldRaw === undefined && newRaw !== undefined) {
          cellChanges.push({
            row: rowIdx,
            col,
            oldValue: undefined,
            newValue: newCell.value,
            newFormula: newCell.formula,
            type: "added",
          });
        } else if (oldRaw !== undefined && newRaw === undefined) {
          cellChanges.push({
            row: rowIdx,
            col,
            oldValue: oldCell.value,
            newValue: undefined,
            oldFormula: oldCell.formula,
            type: "removed",
          });
        } else {
          const valueChanged = String(oldCell.value) !== String(newCell.value);
          const formulaChanged = (oldCell.formula || "") !== (newCell.formula || "");

          if (valueChanged) {
            cellChanges.push({
              row: rowIdx,
              col,
              oldValue: oldCell.value,
              newValue: newCell.value,
              oldFormula: oldCell.formula,
              newFormula: newCell.formula,
              type: "modified",
            });
          } else if (formulaChanged) {
            cellChanges.push({
              row: rowIdx,
              col,
              oldValue: oldCell.value,
              newValue: newCell.value,
              oldFormula: oldCell.formula,
              newFormula: newCell.formula,
              type: "formula_changed",
            });
          }
        }
      }
    }
  }

  const stats = {
    added: cellChanges.filter((c) => c.type === "added").length,
    removed: cellChanges.filter((c) => c.type === "removed").length,
    modified: cellChanges.filter((c) => c.type === "modified").length,
    formulaChanged: cellChanges.filter((c) => c.type === "formula_changed").length,
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
  const totalFormulaChanged = sheets.reduce((sum, s) => sum + s.stats.formulaChanged, 0);

  return {
    sheets,
    summary: {
      totalChanges: totalAdded + totalRemoved + totalModified + totalFormulaChanged,
      sheetsChanged: sheets.filter((s) => s.status !== "unchanged").length,
      totalAdded,
      totalRemoved,
      totalModified,
      totalFormulaChanged,
    },
  };
}
