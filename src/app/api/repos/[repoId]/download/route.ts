import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { snapshotToWorkbook } from "@/lib/excel";
import { getFileFromLocal } from "@/lib/s3";
import type { ExcelSnapshot } from "@/types";

type RouteContext = { params: Promise<{ repoId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { repoId } = await context.params;

    // Check user has access to this repo
    const collaborator = await prisma.collaborator.findUnique({
      where: {
        userId_repoId: { userId: session.user.id, repoId },
      },
    });
    if (!collaborator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "xlsx";
    const commitId = searchParams.get("commitId");
    const branchId = searchParams.get("branchId");

    if (format !== "xlsx" && format !== "csv" && format !== "json") {
      return NextResponse.json(
        { error: "Format must be 'xlsx', 'csv', or 'json'" },
        { status: 400 }
      );
    }

    // Get repo info for filename
    const repo = await prisma.repository.findUnique({
      where: { id: repoId },
      select: {
        name: true,
        slug: true,
        defaultBranch: true,
        branches: { select: { id: true, name: true, headCommitId: true } },
      },
    });

    if (!repo) {
      return NextResponse.json({ error: "Repo not found" }, { status: 404 });
    }

    // Resolve which commit to download
    let resolvedCommitId = commitId;

    if (!resolvedCommitId) {
      const targetBranch = branchId
        ? repo.branches.find((b) => b.id === branchId)
        : repo.branches.find((b) => b.name === repo.defaultBranch);

      resolvedCommitId = targetBranch?.headCommitId || null;
    }

    if (!resolvedCommitId) {
      return NextResponse.json(
        { error: "No commits found" },
        { status: 404 }
      );
    }

    const commit = await prisma.commit.findUnique({
      where: { id: resolvedCommitId },
      select: {
        fileUrl: true,
        message: true,
        jsonSnapshot: true,
        branch: { select: { name: true } },
      },
    });

    if (!commit?.jsonSnapshot) {
      return NextResponse.json(
        { error: "No data in this commit" },
        { status: 404 }
      );
    }

    // Return raw JSON snapshot for add-in (writes directly into current workbook)
    if (format === "json") {
      return NextResponse.json(commit.jsonSnapshot);
    }

    const branchName = commit.branch?.name || repo.defaultBranch;
    const safeName = `${repo.slug}-${branchName}`.replace(/[^a-zA-Z0-9-_]/g, "_");

    // For XLSX format, try serving the original file to preserve formatting
    if (format === "xlsx") {
      const isMergeCommit = commit.message?.startsWith("Merge:");
      const isOriginalXlsx = commit.fileUrl?.endsWith(".xlsx");

      if (!isMergeCommit && isOriginalXlsx && commit.fileUrl) {
        try {
          const originalBuffer = await getFileFromLocal(commit.fileUrl);
          return new NextResponse(originalBuffer, {
            headers: {
              "Content-Type":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              "Content-Disposition": `attachment; filename="${safeName}.xlsx"`,
            },
          });
        } catch {
          console.warn(
            `Original file not found for commit ${resolvedCommitId}, falling back to snapshot reconstruction`
          );
        }
      }
    }

    // Fallback: reconstruct from snapshot
    const snapshot = commit.jsonSnapshot as unknown as ExcelSnapshot;
    const workbook = snapshotToWorkbook(snapshot);

    if (format === "csv") {
      // Export first sheet as CSV
      const firstSheet = workbook.SheetNames[0];
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet]);
      const buffer = Buffer.from(csv, "utf-8");

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeName}.csv"`,
        },
      });
    }

    // Export as xlsx
    const xlsxBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new NextResponse(xlsxBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeName}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    return NextResponse.json(
      { error: "Failed to generate download" },
      { status: 500 }
    );
  }
}
