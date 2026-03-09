import { prisma } from "@/lib/prisma";
import { AuditAction, Prisma } from "@prisma/client";
import { NextRequest } from "next/server";

interface AuditLogInput {
  action: AuditAction;
  userId: string;
  repoId: string;
  metadata?: Record<string, unknown>;
  req?: NextRequest;
}

function extractRequestInfo(req?: NextRequest) {
  if (!req) return { ipAddress: null, userAgent: null };

  const forwarded = req.headers.get("x-forwarded-for");
  const ipAddress =
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  const userAgent = req.headers.get("user-agent") || null;

  return { ipAddress, userAgent };
}

/**
 * Fire-and-forget audit log creation.
 * Does not block the API response.
 */
export function createAuditLog(input: AuditLogInput): void {
  const { ipAddress, userAgent } = extractRequestInfo(input.req);

  prisma.auditLog
    .create({
      data: {
        action: input.action,
        userId: input.userId,
        repoId: input.repoId,
        metadata: (input.metadata ?? {}) as Prisma.JsonObject,
        ipAddress,
        userAgent,
      },
    })
    .catch((error) => {
      console.error("Failed to create audit log:", error);
    });
}

/**
 * Audit log creation for use inside a Prisma $transaction callback.
 * Returns the promise so it participates in the transaction.
 */
export function createAuditLogTx(
  tx: Prisma.TransactionClient,
  input: AuditLogInput
) {
  const { ipAddress, userAgent } = extractRequestInfo(input.req);

  return tx.auditLog.create({
    data: {
      action: input.action,
      userId: input.userId,
      repoId: input.repoId,
      metadata: (input.metadata ?? {}) as Prisma.JsonObject,
      ipAddress,
      userAgent,
    },
  });
}
