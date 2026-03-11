"use client";

import { useEffect, useState } from "react";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("Finalizando login...");

  useEffect(() => {
    // Load Office.js directly via script tag (more reliable than Next.js Script in dialog context)
    const script = document.createElement("script");
    script.src =
      "https://appsforoffice.microsoft.com/lib/1.1/hosted/office.js";
    script.onload = () => {
      try {
        Office.onReady(() => {
          try {
            Office.context.ui.messageParent("logged-in");
            setStatus("Login realizado! Fechando...");
          } catch {
            setStatus("Login realizado! Feche esta janela.");
          }
        });
      } catch {
        setStatus("Login realizado! Feche esta janela.");
      }
    };
    script.onerror = () => {
      // Office.js failed to load - not in Office context
      setStatus("Login realizado! Feche esta janela.");
      window.close();
    };
    document.head.appendChild(script);

    // Safety timeout: if nothing happens in 5s, show manual close message
    const timeout = setTimeout(() => {
      setStatus("Login realizado! Feche esta janela manualmente.");
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-3 text-lg font-bold text-brand-600">ExcelHub</div>
        <p className="text-sm text-gray-500">{status}</p>
      </div>
    </div>
  );
}
