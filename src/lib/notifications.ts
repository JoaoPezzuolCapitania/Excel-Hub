import { prisma } from "@/lib/prisma";
import crypto from "crypto";

interface CreateNotificationsParams {
  type: "COMMIT_CREATED" | "MR_OPENED" | "MR_MERGED" | "MR_CLOSED" | "COMMENT_ADDED" | "COLLABORATOR_ADDED";
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  repoId: string;
  actorId: string;
}

export function createNotifications(params: CreateNotificationsParams) {
  // Fire-and-forget — don't await
  _createNotifications(params).catch((err) =>
    console.error("Failed to create notifications:", err)
  );
}

async function _createNotifications({
  type,
  title,
  message,
  metadata = {},
  repoId,
  actorId,
}: CreateNotificationsParams) {
  // Get all collaborators for this repo except the actor
  const collaborators = await prisma.collaborator.findMany({
    where: { repoId, userId: { not: actorId } },
    select: { userId: true },
  });

  // Also get the repo owner if not already a collaborator
  const repo = await prisma.repository.findUnique({
    where: { id: repoId },
    select: { ownerId: true },
  });

  const recipientIds = new Set(collaborators.map((c) => c.userId));
  if (repo && repo.ownerId !== actorId) {
    recipientIds.add(repo.ownerId);
  }

  if (recipientIds.size === 0) return;

  // Create notifications in bulk
  await prisma.notification.createMany({
    data: Array.from(recipientIds).map((userId) => ({
      type,
      title,
      message,
      metadata: JSON.parse(JSON.stringify(metadata)),
      userId,
    })),
  });

  // Dispatch webhooks
  await _dispatchWebhooks({ type, title, message, metadata, repoId, actorId });
}

async function _dispatchWebhooks(params: CreateNotificationsParams) {
  const webhooks = await prisma.webhook.findMany({
    where: {
      repoId: params.repoId,
      active: true,
    },
  });

  const relevantWebhooks = webhooks.filter((wh) =>
    wh.events.includes(params.type)
  );

  const payload = JSON.stringify({
    event: params.type,
    title: params.title,
    message: params.message,
    metadata: params.metadata,
    repoId: params.repoId,
    actorId: params.actorId,
    timestamp: new Date().toISOString(),
  });

  await Promise.allSettled(
    relevantWebhooks.map(async (wh) => {
      const signature = crypto
        .createHmac("sha256", wh.secret)
        .update(payload)
        .digest("hex");

      await fetch(wh.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ExcelHub-Signature": `sha256=${signature}`,
          "X-ExcelHub-Event": params.type,
        },
        body: payload,
        signal: AbortSignal.timeout(10000),
      });
    })
  );
}
