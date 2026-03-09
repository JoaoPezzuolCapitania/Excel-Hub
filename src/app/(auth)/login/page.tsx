import { LoginButton } from "@/components/auth/login-button";
import { FileSpreadsheet } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <FileSpreadsheet className="h-10 w-10 text-brand-600" />
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Sign in to ExcelHub
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Version control for your spreadsheets
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="space-y-3">
            <LoginButton provider="github" />
            <LoginButton provider="google" />
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-gray-500">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
