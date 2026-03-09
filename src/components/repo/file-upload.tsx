"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  repoId: string;
  branchId: string;
  onSuccess: () => void;
}

const ACCEPTED_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
];

const ACCEPTED_EXTENSIONS = [".xlsx", ".csv", ".xls"];

function isValidFile(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
  return ACCEPTED_EXTENSIONS.includes(ext);
}

export function FileUpload({ repoId, branchId, onSuccess }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError("");

    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    if (!isValidFile(droppedFile)) {
      setError("Invalid file type. Please upload an .xlsx or .csv file.");
      return;
    }

    setFile(droppedFile);
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!isValidFile(selectedFile)) {
      setError("Invalid file type. Please upload an .xlsx or .csv file.");
      return;
    }

    setFile(selectedFile);
  }

  function removeFile() {
    setFile(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function handleSubmit() {
    if (!file) return;

    setIsLoading(true);
    setError("");

    try {
      // Read file as base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileData: base64,
          repoId,
          branchId,
          message: message || `Upload ${file.name}`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload and commit");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          isDragging
            ? "border-brand-500 bg-brand-50"
            : "border-gray-300 hover:border-gray-400",
          file && "border-green-400 bg-green-50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />
        {file ? (
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeFile();
              }}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">
              Drop your spreadsheet here, or click to browse
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Supports .xlsx and .csv files
            </p>
          </>
        )}
      </div>

      {/* Commit message */}
      <Input
        label="Commit message"
        id="commit-message"
        placeholder={file ? `Upload ${file.name}` : "Describe your changes"}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Submit */}
      <Button
        type="button"
        variant="primary"
        disabled={!file}
        isLoading={isLoading}
        className="w-full"
        onClick={handleSubmit}
      >
        {isLoading ? "Uploading..." : "Upload and commit"}
      </Button>
    </div>
  );
}
