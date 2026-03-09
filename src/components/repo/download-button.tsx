"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownItem } from "@/components/ui/dropdown-menu";

interface DownloadButtonProps {
  repoId: string;
  branchId: string;
}

export function DownloadButton({ repoId, branchId }: DownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleDownload(format: "xlsx" | "csv") {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/repos/${repoId}/download?format=${format}&branchId=${branchId}`
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Download failed");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="(.+?)"/);
      const filename = filenameMatch?.[1] || `export.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <DropdownMenu
      align="right"
      trigger={
        <Button variant="outline" size="sm" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-1 h-4 w-4" />
          )}
          Download
        </Button>
      }
    >
      <DropdownItem onClick={() => handleDownload("xlsx")}>
        <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
        Download as .xlsx
      </DropdownItem>
      <DropdownItem onClick={() => handleDownload("csv")}>
        <FileText className="mr-2 h-4 w-4 text-blue-600" />
        Download as .csv
      </DropdownItem>
    </DropdownMenu>
  );
}
