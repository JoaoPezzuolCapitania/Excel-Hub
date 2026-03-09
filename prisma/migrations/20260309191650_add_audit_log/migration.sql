-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('REPO_CREATED', 'REPO_UPDATED', 'REPO_DELETED', 'COMMIT_CREATED', 'BRANCH_CREATED', 'MERGE_REQUEST_CREATED', 'MERGE_REQUEST_MERGED', 'MERGE_REQUEST_CLOSED', 'COLLABORATOR_ADDED', 'COLLABORATOR_REMOVED', 'FILE_UPLOADED');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "userId" TEXT,
    "repoId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_repoId_createdAt_idx" ON "AuditLog"("repoId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
