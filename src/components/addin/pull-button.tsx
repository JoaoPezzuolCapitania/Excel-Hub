"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle } from "lucide-react";

interface PullButtonProps {
  repoId: string;
  branchId: string;
}

interface CellData {
  value: unknown;
  formula?: string;
}

interface SheetData {
  name: string;
  headers: string[];
  rows: Record<string, CellData>[];
}

interface Snapshot {
  sheets: SheetData[];
}

function normalizeCellValue(raw: unknown): CellData {
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

export function PullButton({ repoId, branchId }: PullButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [status, setStatus] = useState("");

  async function handlePull() {
    setIsLoading(true);
    setError("");
    setSuccess(false);
    setStatus("Buscando dados...");

    try {
      // Fetch JSON snapshot from API
      const res = await fetch(
        `/api/repos/${repoId}/download?format=json&branchId=${branchId}`
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erro HTTP ${res.status}`);
      }

      const snapshot: Snapshot = await res.json();

      if (!snapshot.sheets || snapshot.sheets.length === 0) {
        throw new Error("Snapshot vazio — nenhuma aba encontrada");
      }

      setStatus("Atualizando planilha...");

      await Excel.run(async (context) => {
        const workbook = context.workbook;
        const worksheets = workbook.worksheets;
        worksheets.load("items/name");
        await context.sync();

        const existingNames = new Set(
          worksheets.items.map((ws) => ws.name)
        );

        for (const sheet of snapshot.sheets) {
          const { name, headers, rows } = sheet;

          // Find or create the worksheet
          let ws: Excel.Worksheet;
          if (existingNames.has(name)) {
            ws = worksheets.getItem(name);
          } else {
            ws = worksheets.add(name);
          }

          // Clear all existing data
          const usedRange = ws.getUsedRangeOrNullObject();
          await context.sync();
          if (!usedRange.isNullObject) {
            usedRange.clear(Excel.ClearApplyTo.contents);
            await context.sync();
          }

          if (headers.length === 0 || rows.length === 0) continue;

          // Build 2D array: headers + data rows
          const data: (string | number | boolean | null)[][] = [];

          // Header row
          data.push(headers);

          // Data rows
          for (const row of rows) {
            const rowArr: (string | number | boolean | null)[] = [];
            for (const header of headers) {
              const cellData = normalizeCellValue(row[header]);
              const val = cellData.value;
              if (val === null || val === undefined) {
                rowArr.push(null);
              } else if (typeof val === "number" || typeof val === "boolean") {
                rowArr.push(val);
              } else {
                rowArr.push(String(val));
              }
            }
            data.push(rowArr);
          }

          // Write all data at once
          const range = ws.getRangeByIndexes(
            0,
            0,
            data.length,
            headers.length
          );
          range.values = data;

          // Auto-fit columns for readability
          range.format.autofitColumns();
        }

        // Delete worksheets that don't exist in the snapshot
        const snapshotNames = new Set(snapshot.sheets.map((s) => s.name));
        for (const existing of worksheets.items) {
          if (!snapshotNames.has(existing.name)) {
            // Don't delete if it's the only sheet
            if (worksheets.items.length > snapshot.sheets.length) {
              existing.delete();
            }
          }
        }

        // Activate the first sheet
        if (snapshot.sheets.length > 0) {
          const firstSheet = worksheets.getItem(snapshot.sheets[0].name);
          firstSheet.activate();
        }

        await context.sync();
      });

      setSuccess(true);
      setStatus("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao baixar";
      setError(message);
      setStatus("");
      console.error("[ExcelHub Pull]", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-md bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-1.5 rounded-md bg-green-50 p-2 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle className="h-3.5 w-3.5" />
          Planilha atualizada!
        </div>
      )}

      {status && (
        <div className="text-center text-xs text-gray-500">{status}</div>
      )}

      <Button
        variant="outline"
        className="w-full"
        onClick={handlePull}
        isLoading={isLoading}
      >
        <Download className="mr-2 h-4 w-4" />
        {isLoading ? "Atualizando..." : "Pull (atualizar planilha)"}
      </Button>
    </div>
  );
}
