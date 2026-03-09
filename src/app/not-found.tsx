import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-4 inline-flex rounded-full bg-gray-100 p-3 dark:bg-gray-800">
          <FileQuestion className="h-6 w-6 text-gray-400 dark:text-gray-500" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Page not found
        </h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/">
          <Button variant="primary">Go home</Button>
        </Link>
      </div>
    </div>
  );
}
