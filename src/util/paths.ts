import * as os from "os";
import * as path from "path";

export function expandHome(p: string): string {
  if (!p) return p;
  if (p === "~") return os.homedir();
  if (p.startsWith("~/") || p.startsWith("~\\")) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

export function normalizeDir(p: string): string {
  return path.normalize(expandHome(p));
}
