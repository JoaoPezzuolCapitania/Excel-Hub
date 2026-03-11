"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle } from "lucide-react";

interface CommitPanelProps {
  repoId: string;
  branchId: string;
  onCommitSuccess: () => void;
}

function getWorkbookAsBase64(): Promise<string> {
  return new Promise((resolve, reject) => {
    Office.context.document.getFileAsync(
      Office.FileType.Compressed,
      { sliceSize: 65536 },
      (result) => {
        if (result.status === "failed") {
          reject(new Error(result.error?.message || "Falha ao ler arquivo"));
          return;
        }

        const file = result.value;
        const slices: ArrayBuffer[] = [];
        let slicesReceived = 0;

        function readSlice(index: number) {
          file.getSliceAsync(index, (sliceResult) => {
            if (sliceResult.status === "failed") {
              file.closeAsync(() => {});
              reject(new Error("Falha ao ler parte do arquivo"));
              return;
            }

            slices[index] = sliceResult.value.data;
            slicesReceived++;

            if (slicesReceived === file.sliceCount) {
              file.closeAsync(() => {});

              // Combine slices into single ArrayBuffer
              const totalSize = slices.reduce((acc, s) => acc + s.byteLength, 0);
              const combined = new Uint8Array(totalSize);
              let offset = 0;
              for (const slice of slices) {
                combined.set(new Uint8Array(slice), offset);
                offset += slice.byteLength;
              }

              // Convert to base64
              const base64 = btoa(
                combined.reduce(
                  (data, byte) => data + String.fromCharCode(byte),
                  ""
                )
              );
              resolve(base64);
            } else {
              readSlice(index + 1);
            }
          });
        }

        if (file.sliceCount > 0) {
          readSlice(0);
        } else {
          file.closeAsync(() => {});
          reject(new Error("Arquivo vazio"));
        }
      }
    );
  });
}

export function CommitPanel({
  repoId,
  branchId,
  onCommitSuccess,
}: CommitPanelProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleCommit() {
    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      const fileData = await getWorkbookAsBase64();

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "workbook.xlsx",
          fileData,
          repoId,
          branchId,
          message: message || "Commit via Excel Add-in",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Falha ao fazer commit");
      }

      setSuccess(true);
      setMessage("");
      onCommitSuccess();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer commit");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
        Mensagem de commit
      </label>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Descreva suas alterações..."
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:placeholder:text-gray-500"
      />

      {error && (
        <div className="rounded-md bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-1.5 rounded-md bg-green-50 p-2 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle className="h-3.5 w-3.5" />
          Commit realizado com sucesso!
        </div>
      )}

      <Button
        variant="primary"
        className="w-full"
        onClick={handleCommit}
        isLoading={isLoading}
      >
        <Upload className="mr-2 h-4 w-4" />
        {isLoading ? "Enviando..." : "Commit"}
      </Button>
    </div>
  );
}
