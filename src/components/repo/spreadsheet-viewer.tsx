"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Pagination } from "@/components/ui/pagination";
import { cn, formatCellValue } from "@/lib/utils";
import { normalizeCellValue } from "@/lib/excel";
import { ChevronUp, ChevronDown, FunctionSquare } from "lucide-react";
import type { ExcelSnapshot } from "@/types";

interface SpreadsheetViewerProps {
  snapshot: ExcelSnapshot;
}

export function SpreadsheetViewer({ snapshot }: SpreadsheetViewerProps) {
  const [activeSheet, setActiveSheet] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([]);

  const sheet = snapshot.sheets[activeSheet];

  const columnHelper = createColumnHelper<Record<string, unknown>>();

  const columns = useMemo(() => {
    if (!sheet) return [];

    // Row number column
    const rowNumCol = columnHelper.display({
      id: "__row_number",
      header: "#",
      cell: (info) => (
        <span className="text-xs text-gray-400 dark:text-gray-500">{info.row.index + 1}</span>
      ),
      size: 50,
    });

    const dataCols = sheet.headers.map((header) =>
      columnHelper.accessor((row) => row[header], {
        id: header,
        header: header,
        cell: (info) => {
          const raw = info.getValue();
          const cellData = normalizeCellValue(raw);
          const formatted = formatCellValue(cellData.value);
          return (
            <span className={cn(formatted.isNumeric && "font-mono tabular-nums")} title={cellData.formula ? `=${cellData.formula}` : undefined}>
              {cellData.formula && (
                <FunctionSquare className="mr-1 inline h-3 w-3 text-indigo-500" />
              )}
              {formatted.text}
            </span>
          );
        },
        meta: { header },
      })
    );

    return [rowNumCol, ...dataCols];
  }, [sheet, columnHelper]);

  const table = useReactTable({
    data: sheet?.rows ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 100 },
    },
  });

  if (!sheet) {
    return (
      <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        No sheet data available.
      </div>
    );
  }

  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalPages = table.getPageCount();

  return (
    <div className="space-y-4">
      {/* Sheet tabs */}
      {snapshot.sheets.length > 1 && (
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
          {snapshot.sheets.map((s, idx) => (
            <button
              key={s.name}
              onClick={() => {
                setActiveSheet(idx);
                setSorting([]);
                table.setPageIndex(0);
              }}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                idx === activeSheet
                  ? "border-brand-500 text-brand-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600"
              )}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="max-h-[70vh] overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 scrollbar-thin">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      "px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300",
                      header.column.getCanSort() && "cursor-pointer select-none hover:text-gray-900 dark:hover:text-gray-100"
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() === "asc" && (
                        <ChevronUp className="h-3 w-3" />
                      )}
                      {header.column.getIsSorted() === "desc" && (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "transition-colors hover:bg-brand-50 dark:hover:bg-brand-900/40",
                  row.index % 2 === 1 && "bg-gray-50/50 dark:bg-gray-900/30"
                )}
              >
                {row.getVisibleCells().map((cell) => {
                  const value = cell.getValue();
                  const isNumeric = typeof value === "number";
                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        "whitespace-nowrap px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300",
                        isNumeric && "text-right"
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>
          Showing {table.getRowModel().rows.length} of {sheet.rows.length} rows
        </span>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => table.setPageIndex(page - 1)}
        />
      </div>
    </div>
  );
}
