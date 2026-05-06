import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export async function resolveReadablePath(filePath: string): Promise<string> {
  const cwdPath = path.resolve(filePath);
  if (await canRead(cwdPath)) {
    return cwdPath;
  }

  const bundledPath = path.resolve(packageRoot, filePath);
  if (await canRead(bundledPath)) {
    return bundledPath;
  }

  return cwdPath;
}

async function canRead(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
