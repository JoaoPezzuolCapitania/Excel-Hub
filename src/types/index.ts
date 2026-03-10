export interface CellData {
  value: unknown;
  formula?: string;
}

export interface SheetData {
  name: string;
  headers: string[];
  rows: Record<string, CellData>[];
}

export interface ExcelSnapshot {
  sheets: SheetData[];
  metadata: {
    totalSheets: number;
    totalRows: number;
    fileSize: number;
  };
}

export interface CellChange {
  row: number;
  col: string;
  oldValue: unknown;
  newValue: unknown;
  oldFormula?: string;
  newFormula?: string;
  type: "added" | "removed" | "modified" | "formula_changed";
}

export interface SheetDiff {
  sheetName: string;
  status: "added" | "removed" | "modified" | "unchanged";
  cellChanges: CellChange[];
  addedRows: number[];
  removedRows: number[];
  stats: { added: number; removed: number; modified: number; formulaChanged: number };
}

export interface SnapshotDiff {
  sheets: SheetDiff[];
  summary: {
    totalChanges: number;
    sheetsChanged: number;
    totalAdded: number;
    totalRemoved: number;
    totalModified: number;
    totalFormulaChanged: number;
  };
}

export type RepoWithDetails = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  defaultBranch: string;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  branches: { id: string; name: string }[];
  _count: {
    commits: number;
    collaborators: number;
    branches: number;
  };
};
