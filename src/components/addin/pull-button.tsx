"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle } from "lucide-react";

interface PullButtonProps {
  repoId: string;
  branchId: string;
}

export function PullButton({ repoId, branchId }: PullButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handlePull() {
    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch(
        `/api/repos/${repoId}/download?format=xlsx&branchId=${branchId}`
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || "Falha ao baixar planilha"
        );
      }

      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const base64 = btoa(
        bytes.reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      await Excel.createWorkbook(base64);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao baixar");
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
          Planilha aberta em nova janela!
        </div>
      )}

      <Button
        variant="outline"
        className="w-full"
        onClick={handlePull}
        isLoading={isLoading}
      >
        <Download className="mr-2 h-4 w-4" />
        {isLoading ? "Baixando..." : "Pull (baixar última versão)"}
      </Button>
    </div>
  );
}
