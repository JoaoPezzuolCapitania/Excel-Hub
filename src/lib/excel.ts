import * as XLSX from "xlsx";

export interface SheetData {
  name: string;
  headers: string[];
  rows: Record<string, unknown>[];
}

export interface ExcelSnapshot {
  sheets: SheetData[];
  metadata: {
    totalSheets: number;
    totalRows: number;
    fileSize: number;
  };
}

export function parseExcelBuffer(buffer: Buffer): ExcelSnapshot {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheets: SheetData[] = [];
  let totalRows = 0;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      worksheet
    );
    const headers =
      jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

    sheets.push({
      name: sheetName,
      headers,
      rows: jsonData,
    });

    totalRows += jsonData.length;
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
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }

  return workbook;
}
