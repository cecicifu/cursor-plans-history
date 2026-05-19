import * as fs from "fs";
import * as path from "path";

export async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await fs.promises.readdir(dir);
  } catch {
    return [];
  }
}

export async function safeStat(p: string): Promise<fs.Stats | undefined> {
  try {
    return await fs.promises.stat(p);
  } catch {
    return undefined;
  }
}

export async function exists(p: string): Promise<boolean> {
  return !!(await safeStat(p));
}

export async function readText(p: string): Promise<string> {
  return fs.promises.readFile(p, "utf8");
}

export function joinSafe(...segments: string[]): string {
  return path.join(...segments);
}
