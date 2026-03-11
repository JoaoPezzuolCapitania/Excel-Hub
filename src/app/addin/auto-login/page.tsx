"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";

export default function AutoLoginPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackUrl = params.get("callbackUrl") || "/addin/auth-callback";
    signIn("github", { callbackUrl });
  }, []);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-3 text-lg font-bold text-brand-600">ExcelHub</div>
        <div className="mb-2 h-6 w-6 mx-auto animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        <p className="text-sm text-gray-500">Redirecionando para o GitHub...</p>
      </div>
    </div>
  );
}
