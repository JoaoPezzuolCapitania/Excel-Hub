import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import crypto from "crypto";
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function generateHash() {
  return crypto.randomBytes(4).toString("hex");
}

const sampleSnapshot1 = {
  sheets: [
    {
      name: "Sales Data",
      headers: ["Month", "Product", "Units Sold", "Revenue", "Region"],
      rows: [
        { Month: "January", Product: "Widget A", "Units Sold": 150, Revenue: 4500, Region: "North" },
        { Month: "January", Product: "Widget B", "Units Sold": 200, Revenue: 8000, Region: "South" },
        { Month: "February", Product: "Widget A", "Units Sold": 180, Revenue: 5400, Region: "North" },
        { Month: "February", Product: "Widget B", "Units Sold": 220, Revenue: 8800, Region: "South" },
        { Month: "March", Product: "Widget A", "Units Sold": 210, Revenue: 6300, Region: "East" },
        { Month: "March", Product: "Widget B", "Units Sold": 190, Revenue: 7600, Region: "West" },
        { Month: "April", Product: "Widget A", "Units Sold": 240, Revenue: 7200, Region: "North" },
        { Month: "April", Product: "Widget B", "Units Sold": 260, Revenue: 10400, Region: "South" },
      ],
    },
    {
      name: "Summary",
      headers: ["Metric", "Value"],
      rows: [
        { Metric: "Total Units", Value: 1650 },
        { Metric: "Total Revenue", Value: 58200 },
        { Metric: "Average Price", Value: 35.27 },
        { Metric: "Top Product", Value: "Widget B" },
      ],
    },
  ],
  metadata: {
    totalSheets: 2,
    totalRows: 12,
    fileSize: 8192,
  },
};

const sampleSnapshot2 = {
  sheets: [
    {
      name: "Sales Data",
      headers: ["Month", "Product", "Units Sold", "Revenue", "Region"],
      rows: [
        { Month: "January", Product: "Widget A", "Units Sold": 150, Revenue: 4500, Region: "North" },
        { Month: "January", Product: "Widget B", "Units Sold": 210, Revenue: 8400, Region: "South" },
        { Month: "February", Product: "Widget A", "Units Sold": 180, Revenue: 5400, Region: "North" },
        { Month: "February", Product: "Widget B", "Units Sold": 225, Revenue: 9000, Region: "South" },
        { Month: "March", Product: "Widget A", "Units Sold": 210, Revenue: 6300, Region: "East" },
        { Month: "March", Product: "Widget B", "Units Sold": 195, Revenue: 7800, Region: "West" },
        { Month: "April", Product: "Widget A", "Units Sold": 240, Revenue: 7200, Region: "North" },
        { Month: "April", Product: "Widget B", "Units Sold": 260, Revenue: 10400, Region: "South" },
        { Month: "May", Product: "Widget A", "Units Sold": 270, Revenue: 8100, Region: "East" },
        { Month: "May", Product: "Widget B", "Units Sold": 290, Revenue: 11600, Region: "West" },
      ],
    },
    {
      name: "Summary",
      headers: ["Metric", "Value"],
      rows: [
        { Metric: "Total Units", Value: 2230 },
        { Metric: "Total Revenue", Value: 78700 },
        { Metric: "Average Price", Value: 35.29 },
        { Metric: "Top Product", Value: "Widget B" },
      ],
    },
  ],
  metadata: {
    totalSheets: 2,
    totalRows: 14,
    fileSize: 9216,
  },
};

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.mergeRequest.deleteMany();
  await prisma.collaborator.deleteMany();
  await prisma.commit.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.repository.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user
  const user = await prisma.user.create({
    data: {
      name: "demo",
      email: "demo@excelhub.dev",
      image: "https://avatars.githubusercontent.com/u/1?v=4",
    },
  });

  console.log(`Created user: ${user.name} (${user.id})`);

  // Create a demo repository
  const repo = await prisma.repository.create({
    data: {
      name: "Sales Report 2024",
      slug: "sales-report-2024",
      description:
        "Quarterly sales data tracking for all product lines across regions.",
      visibility: "PUBLIC",
      defaultBranch: "main",
      ownerId: user.id,
    },
  });

  console.log(`Created repo: ${repo.name} (${repo.id})`);

  // Create OWNER collaborator
  await prisma.collaborator.create({
    data: {
      userId: user.id,
      repoId: repo.id,
      role: "OWNER",
    },
  });

  // Create main branch (without headCommitId initially)
  const mainBranch = await prisma.branch.create({
    data: {
      name: "main",
      repoId: repo.id,
    },
  });

  // Create first commit on main
  const commit1 = await prisma.commit.create({
    data: {
      hash: generateHash(),
      message: "Initial upload: Q1-Q2 sales data",
      fileUrl: `${user.id}/${repo.id}/${mainBranch.id}/initial.xlsx`,
      jsonSnapshot: sampleSnapshot1 as any,
      authorId: user.id,
      branchId: mainBranch.id,
    },
  });

  console.log(`Created commit 1: ${commit1.hash}`);

  // Create second commit on main
  const commit2 = await prisma.commit.create({
    data: {
      hash: generateHash(),
      message: "Add May data and update totals",
      fileUrl: `${user.id}/${repo.id}/${mainBranch.id}/updated.xlsx`,
      jsonSnapshot: sampleSnapshot2 as any,
      authorId: user.id,
      branchId: mainBranch.id,
      parentId: commit1.id,
    },
  });

  console.log(`Created commit 2: ${commit2.hash}`);

  // Update main branch head to latest commit
  await prisma.branch.update({
    where: { id: mainBranch.id },
    data: { headCommitId: commit2.id },
  });

  // Create a feature branch from main (headCommitId set after creating its own commit)
  const featureBranch = await prisma.branch.create({
    data: {
      name: "feature/q3-projections",
      repoId: repo.id,
      createdFromBranchId: mainBranch.id,
    },
  });

  const commit3 = await prisma.commit.create({
    data: {
      hash: generateHash(),
      message: "Add Q3 projection columns",
      fileUrl: `${user.id}/${repo.id}/${featureBranch.id}/projections.xlsx`,
      jsonSnapshot: {
        ...sampleSnapshot2,
        sheets: [
          {
            ...sampleSnapshot2.sheets[0],
            headers: [...sampleSnapshot2.sheets[0].headers, "Q3 Projection"],
            rows: sampleSnapshot2.sheets[0].rows.map((row, i) => ({
              ...row,
              "Q3 Projection": (row["Revenue"] as number) * 1.1,
            })),
          },
          sampleSnapshot2.sheets[1],
        ],
      } as any,
      authorId: user.id,
      branchId: featureBranch.id,
      parentId: commit2.id,
    },
  });

  // Update feature branch head
  await prisma.branch.update({
    where: { id: featureBranch.id },
    data: { headCommitId: commit3.id },
  });

  console.log(`Created feature branch with commit: ${commit3.hash}`);

  // Create a merge request
  await prisma.mergeRequest.create({
    data: {
      title: "Add Q3 projections to sales data",
      description:
        "This adds projected Q3 revenue based on a 10% growth estimate from Q2 actuals.",
      status: "OPEN",
      repoId: repo.id,
      sourceBranchId: featureBranch.id,
      targetBranchId: mainBranch.id,
      authorId: user.id,
    },
  });

  console.log("Created merge request");

  // Create a second public repo
  const repo2 = await prisma.repository.create({
    data: {
      name: "Budget Template",
      slug: "budget-template",
      description: "Standard budget template for department heads.",
      visibility: "PUBLIC",
      defaultBranch: "main",
      ownerId: user.id,
    },
  });

  await prisma.collaborator.create({
    data: {
      userId: user.id,
      repoId: repo2.id,
      role: "OWNER",
    },
  });

  const repo2Main = await prisma.branch.create({
    data: {
      name: "main",
      repoId: repo2.id,
    },
  });

  const budgetSnapshot = {
    sheets: [
      {
        name: "Budget",
        headers: ["Category", "Q1", "Q2", "Q3", "Q4", "Total"],
        rows: [
          { Category: "Salaries", Q1: 50000, Q2: 52000, Q3: 53000, Q4: 55000, Total: 210000 },
          { Category: "Marketing", Q1: 15000, Q2: 18000, Q3: 20000, Q4: 22000, Total: 75000 },
          { Category: "Operations", Q1: 8000, Q2: 8500, Q3: 9000, Q4: 9500, Total: 35000 },
          { Category: "R&D", Q1: 25000, Q2: 27000, Q3: 30000, Q4: 32000, Total: 114000 },
        ],
      },
    ],
    metadata: { totalSheets: 1, totalRows: 4, fileSize: 4096 },
  };

  const budgetCommit = await prisma.commit.create({
    data: {
      hash: generateHash(),
      message: "Initial budget template for FY2024",
      fileUrl: `${user.id}/${repo2.id}/${repo2Main.id}/budget.xlsx`,
      jsonSnapshot: budgetSnapshot as any,
      authorId: user.id,
      branchId: repo2Main.id,
    },
  });

  await prisma.branch.update({
    where: { id: repo2Main.id },
    data: { headCommitId: budgetCommit.id },
  });

  console.log(`Created repo: ${repo2.name}`);
  console.log("\nSeed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
