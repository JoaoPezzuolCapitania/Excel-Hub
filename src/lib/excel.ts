import * as XLSX from "xlsx";
import type { SheetData, ExcelSnapshot, CellData } from "@/types";

/**
 * Normalizes a cell value from a snapshot row.
 * Old snapshots store plain values: Record<string, unknown>
 * New snapshots store CellData: Record<string, { value, formula? }>
 */
export function normalizeCellValue(raw: unknown): CellData {
  if (
    raw !== null &&
    raw !== undefined &&
    typeof raw === "object" &&
    "value" in (raw as Record<string, unknown>)
  ) {
    return raw as CellData;
  }
  return { value: raw };
}

export function parseExcelBuffer(buffer: Buffer): ExcelSnapshot {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellFormula: true,
  });
  const sheets: SheetData[] = [];
  let totalRows = 0;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];

    // Fix incorrect !ref by recalculating from actual cell keys
    const cellKeys = Object.keys(worksheet).filter((k) => !k.startsWith("!"));
    if (cellKeys.length > 0) {
      let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
      for (const key of cellKeys) {
        const addr = XLSX.utils.decode_cell(key);
        if (addr.r < minR) minR = addr.r;
        if (addr.r > maxR) maxR = addr.r;
        if (addr.c < minC) minC = addr.c;
        if (addr.c > maxC) maxC = addr.c;
      }
      const realRef =
        XLSX.utils.encode_cell({ r: minR, c: minC }) +
        ":" +
        XLSX.utils.encode_cell({ r: maxR, c: maxC });
      if (worksheet["!ref"] !== realRef) {
        worksheet["!ref"] = realRef;
      }
    }

    // Get raw values via sheet_to_json
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      worksheet
    );
    const headers =
      jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

    // Build CellData rows, extracting formulas from the worksheet cells
    const range = worksheet["!ref"]
      ? XLSX.utils.decode_range(worksheet["!ref"])
      : null;

    const rows: Record<string, CellData>[] = jsonData.map((row, rowIdx) => {
      const cellDataRow: Record<string, CellData> = {};
      for (let colIdx = 0; colIdx < headers.length; colIdx++) {
        const col = headers[colIdx];
        if (row[col] !== undefined) {
          const cellData: CellData = { value: row[col] };

          // Extract formula from the actual worksheet cell
          if (range) {
            const cellAddr = XLSX.utils.encode_cell({
              r: rowIdx + 1 + range.s.r, // +1 for header row
              c: colIdx + range.s.c,
            });
            const cell = worksheet[cellAddr];
            if (cell?.f) {
              cellData.formula = cell.f;
            }
          }

          cellDataRow[col] = cellData;
        }
      }
      return cellDataRow;
    });

    sheets.push({ name: sheetName, headers, rows });
    totalRows += rows.length;
  }

  return {
    sheets,
    metadata: {
      totalSheets: sheets.length,
      totalRows,
      fileSize: buffer.byteLength,
    },
  };
}

export function parseCsvBuffer(buffer: Buffer): ExcelSnapshot {
  return parseExcelBuffer(buffer);
}

export function snapshotToWorkbook(snapshot: ExcelSnapshot): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  for (const sheet of snapshot.sheets) {
    // Convert CellData rows back to plain value rows for json_to_sheet
    const plainRows = sheet.rows.map((row) => {
      const plain: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(row)) {
        const cell = normalizeCellValue(val);
        plain[key] = cell.value;
      }
      return plain;
    });
    const worksheet = XLSX.utils.json_to_sheet(plainRows);

    // Overlay formulas onto the worksheet
    sheet.rows.forEach((row, rowIdx) => {
      for (const [colName, val] of Object.entries(row)) {
        const cell = normalizeCellValue(val);
        if (cell.formula) {
          const colIdx = sheet.headers.indexOf(colName);
          if (colIdx >= 0) {
            const cellAddr = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx });
            if (worksheet[cellAddr]) {
              worksheet[cellAddr].f = cell.formula;
            }
          }
        }
      }
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }

  return workbook;
}
