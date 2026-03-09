import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import {
  FileSpreadsheet,
  GitBranch,
  GitCompare,
  Users,
  History,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: GitBranch,
    title: "Branching",
    description:
      "Create branches to work on different versions of your spreadsheet independently.",
  },
  {
    icon: History,
    title: "Commit History",
    description:
      "Track every change with commit messages, timestamps, and author information.",
  },
  {
    icon: GitCompare,
    title: "Cell-Level Diffs",
    description:
      "See exactly which cells changed between versions with color-coded comparisons.",
  },
  {
    icon: Upload,
    title: "File Upload",
    description:
      "Upload .xlsx and .csv files directly. We parse and store them for instant viewing.",
  },
  {
    icon: Users,
    title: "Collaboration",
    description:
      "Invite team members with role-based access: Owner, Editor, or Viewer.",
  },
  {
    icon: FileSpreadsheet,
    title: "Interactive Viewer",
    description:
      "View your spreadsheet data in the browser with sorting, filtering, and pagination.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <header className="border-b border-gray-100 dark:border-gray-800">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-7 w-7 text-brand-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">ExcelHub</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="primary" size="sm">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="px-4 py-24 text-center sm:py-32">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl dark:text-gray-100">
            Version control for your{" "}
            <span className="text-brand-600">spreadsheets</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-400">
            ExcelHub brings the power of Git to Excel files. Upload
            spreadsheets, create branches, track changes with cell-level diffs,
            and collaborate with your team.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/login">
              <Button variant="primary" size="lg">
                Start for free
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg">
                Learn more
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="bg-gray-50 px-4 py-24 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Everything you need for spreadsheet version control
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              All the tools you know from GitHub, designed for Excel and CSV
              files.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="mb-4 inline-flex rounded-lg bg-brand-50 p-2 dark:bg-brand-900/30">
                  <feature.icon className="h-6 w-6 text-brand-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Sign up for free and start managing your spreadsheets like code.
          </p>
          <div className="mt-8">
            <Link href="/login">
              <Button variant="primary" size="lg">
                Create your first repository
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
