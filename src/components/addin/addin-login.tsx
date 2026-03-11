"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

interface AddinLoginProps {
  onLoggedIn: () => void;
}

export function AddinLogin({ onLoggedIn }: AddinLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  function handleLogin() {
    setIsLoading(true);
    setError("");

    const origin = window.location.origin;
    const callbackUrl = encodeURIComponent(`${origin}/addin/auth-callback`);
    const loginUrl = `${origin}/addin/auto-login?callbackUrl=${callbackUrl}`;

    try {
      Office.context.ui.displayDialogAsync(
        loginUrl,
        { width: 60, height: 60 },
        (result) => {
          if (result.status === "failed") {
            setError("Não foi possível abrir a janela de login.");
            setIsLoading(false);
            return;
          }

          const dialog = result.value;

          dialog.addEventHandler(
            Office.EventType.DialogMessageReceived,
            (arg: { message: string }) => {
              dialog.close();
              if (arg.message === "logged-in") {
                onLoggedIn();
              }
              setIsLoading(false);
            }
          );

          dialog.addEventHandler(
            Office.EventType.DialogEventReceived,
            () => {
              setIsLoading(false);
            }
          );
        }
      );
    } catch {
      // Fallback for when Office.js is not available (browser testing)
      window.open(loginUrl, "_blank", "width=600,height=600");
      setIsLoading(false);
      // Poll for session
      const interval = setInterval(async () => {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (data?.user) {
          clearInterval(interval);
          onLoggedIn();
        }
      }, 2000);
      setTimeout(() => clearInterval(interval), 120000);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-6 text-center">
        <div className="mb-3 text-2xl font-bold text-brand-600">ExcelHub</div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Faça login para commitar e baixar planilhas diretamente do Excel.
        </p>
      </div>

      {error && (
        <div className="mb-4 w-full rounded-md bg-red-50 p-3 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <Button
        variant="primary"
        className="w-full"
        onClick={handleLogin}
        isLoading={isLoading}
      >
        <LogIn className="mr-2 h-4 w-4" />
        Entrar no ExcelHub
      </Button>
    </div>
  );
}
