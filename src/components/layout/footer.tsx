import { FileSpreadsheet } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ExcelHub &mdash; Version control for spreadsheets
            </span>
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            &copy; {new Date().getFullYear()} ExcelHub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
