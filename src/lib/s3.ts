import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function uploadToLocal(
  buffer: Buffer,
  key: string
): Promise<string> {
  const filePath = path.join(UPLOAD_DIR, key);
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, buffer);
  return key;
}

export async function getFileFromLocal(key: string): Promise<Buffer> {
  const filePath = path.join(UPLOAD_DIR, key);
  return fs.readFile(filePath);
}

export async function deleteLocalFile(key: string): Promise<void> {
  const filePath = path.join(UPLOAD_DIR, key);
  await fs.unlink(filePath).catch(() => {});
}

export function getStorageKey(
  userId: string,
  repoId: string,
  branchId: string,
  commitHash: string,
  fileName: string
) {
  const ext = fileName.split(".").pop() || "xlsx";
  return `${userId}/${repoId}/${branchId}/${commitHash}.${ext}`;
}
