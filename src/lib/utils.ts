import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import crypto from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatRelativeDate(date: Date | string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function generateCommitHash() {
  return crypto.randomBytes(4).toString("hex");
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(str: string, length: number) {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

// ─── Spreadsheet cell formatting ──────────────────────────────

/**
 * Detects if a number is likely an Excel serial date.
 * Excel dates range from 1 (Jan 1, 1900) to ~60000+ (year 2060+).
 * We use a conservative range to avoid false positives with regular numbers.
 */
export function isExcelDate(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 60000;
}

/**
 * Converts an Excel serial date number to a formatted date string.
 * Excel epoch: Jan 1, 1900 (serial = 1), but has the Lotus 1-2-3 bug
 * where Feb 29, 1900 is treated as valid (serial 60).
 */
export function excelDateToFormatted(serial: number): string {
  // Excel epoch is Dec 30, 1899 (to account for the 1-based index)
  // Also accounts for the Lotus 1-2-3 leap year bug (serial 60 = Feb 29, 1900)
  const excelEpoch = new Date(1899, 11, 30);
  const days = serial > 59 ? serial - 1 : serial; // Adjust for Lotus bug
  const date = new Date(excelEpoch.getTime() + days * 86400000);
  return format(date, "dd/MM/yyyy");
}

/**
 * Formats a cell value for display in the spreadsheet viewer.
 * - Excel serial dates → "dd/MM/yyyy"
 * - Large numbers → formatted with thousand separators (pt-BR locale)
 * - Other values → String conversion
 */
export function formatCellValue(value: unknown): { text: string; isNumeric: boolean } {
  if (value === null || value === undefined || value === "") {
    return { text: "", isNumeric: false };
  }

  if (typeof value === "number") {
    // Check if it looks like an Excel date (integer in date range)
    if (isExcelDate(value)) {
      return { text: excelDateToFormatted(value), isNumeric: false };
    }

    // Format large numbers with thousand separators
    if (Math.abs(value) >= 1000) {
      return {
        text: value.toLocaleString("pt-BR", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }),
        isNumeric: true,
      };
    }

    // Small numbers — format with up to 2 decimals if needed
    if (!Number.isInteger(value)) {
      return {
        text: value.toLocaleString("pt-BR", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 6,
        }),
        isNumeric: true,
      };
    }

    return { text: String(value), isNumeric: true };
  }

  return { text: String(value), isNumeric: false };
}
