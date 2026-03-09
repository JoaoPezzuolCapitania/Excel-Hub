"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserMenu } from "@/components/auth/user-menu";
import { Button } from "@/components/ui/button";
import { Plus, FileSpreadsheet } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <FileSpreadsheet className="h-7 w-7 text-brand-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">ExcelHub</span>
          </Link>
          {session && (
            <nav className="hidden items-center gap-4 md:flex">
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                Dashboard
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {session ? (
            <>
              <Link href="/new">
                <Button variant="primary" size="sm">
                  <Plus className="mr-1 h-4 w-4" />
                  New
                </Button>
              </Link>
              <UserMenu />
            </>
          ) : (
            <Link href="/login">
              <Button variant="primary" size="sm">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
