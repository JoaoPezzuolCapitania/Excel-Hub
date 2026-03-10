import { z } from "zod";

export const createRepoSchema = z.object({
  name: z
    .string()
    .min(1, "Repository name is required")
    .max(100, "Name must be under 100 characters")
    .regex(
      /^[a-zA-Z0-9_\-\s]+$/,
      "Name can only contain letters, numbers, hyphens, underscores, and spaces"
    ),
  description: z.string().max(500).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
});

export const updateRepoSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_\-\s]+$/)
    .optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
});

export const createCommitSchema = z.object({
  s3Key: z.string().min(1, "File key is required"),
  message: z
    .string()
    .min(1, "Commit message is required")
    .max(500, "Message must be under 500 characters"),
  branchId: z.string().min(1, "Branch is required"),
});

export const createBranchSchema = z.object({
  name: z
    .string()
    .min(1, "Branch name is required")
    .max(100, "Name must be under 100 characters")
    .regex(
      /^[a-zA-Z0-9_\-/]+$/,
      "Branch name can only contain letters, numbers, hyphens, underscores, and slashes"
    ),
  fromBranchId: z.string().min(1, "Source branch is required"),
});

export const createMergeRequestSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be under 200 characters"),
  description: z.string().max(2000).optional(),
  sourceBranchId: z.string().min(1, "Source branch is required"),
  targetBranchId: z.string().min(1, "Target branch is required"),
});

export const addCollaboratorSchema = z.object({
  email: z.string().email("Valid email is required"),
  role: z.enum(["EDITOR", "VIEWER"]),
});

export const uploadFileSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  repoId: z.string().min(1),
  branchId: z.string().min(1),
});

export const createReviewCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment must be under 2000 characters"),
  sheetName: z.string().min(1, "Sheet name is required"),
  row: z.number().int().min(0),
  col: z.string().min(1, "Column is required"),
  parentId: z.string().optional(),
});

export const updateReviewCommentSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  resolved: z.boolean().optional(),
});

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z
    .enum([
      "REPO_CREATED",
      "REPO_UPDATED",
      "REPO_DELETED",
      "COMMIT_CREATED",
      "BRANCH_CREATED",
      "MERGE_REQUEST_CREATED",
      "MERGE_REQUEST_MERGED",
      "MERGE_REQUEST_CLOSED",
      "COLLABORATOR_ADDED",
      "COLLABORATOR_REMOVED",
      "FILE_UPLOADED",
      "REVIEW_COMMENT_ADDED",
    ])
    .optional(),
  userId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
