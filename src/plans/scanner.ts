import * as path from "path";
import * as vscode from "vscode";
import matter from "gray-matter";
import { Plan, PlanSource, PlanStatus, PlanTodo } from "./types";
import { expandHome, normalizeDir } from "../util/paths";
import { safeReaddir, safeStat, readText } from "../util/fs";

export interface ScanConfig {
  globalPlansDir: string;
  includeWorkspace: boolean;
  workspaceGlobs: string[];
  extraGlobs: string[];
}

const ALLOWED_STATUSES: ReadonlySet<PlanStatus> = new Set([
  "pending",
  "in-progress",
  "completed",
  "error",
]);

export class PlanScanner {
  private cache: Plan[] = [];
  private cacheKey = "";
  private readonly output: vscode.OutputChannel;

  constructor(output: vscode.OutputChannel) {
    this.output = output;
  }

  invalidate(): void {
    this.cacheKey = "";
    this.cache = [];
  }

  async scan(config: ScanConfig): Promise<Plan[]> {
    const key = this.keyFor(config);
    if (key === this.cacheKey && this.cache.length > 0) {
      return this.cache;
    }

    const results: Plan[] = [];
    const seen = new Set<string>();

    const globalDir = normalizeDir(config.globalPlansDir);
    for (const file of await this.collectGlobal(globalDir)) {
      if (seen.has(file)) continue;
      seen.add(file);
      const plan = await this.loadPlan(vscode.Uri.file(file), "global");
      if (plan) results.push(plan);
    }

    if (config.includeWorkspace) {
      for (const file of await this.collectWorkspace(config.workspaceGlobs)) {
        if (seen.has(file)) continue;
        seen.add(file);
        const plan = await this.loadPlan(vscode.Uri.file(file), "workspace");
        if (plan) results.push(plan);
      }
    }

    for (const file of await this.collectExtra(config.extraGlobs)) {
      if (seen.has(file)) continue;
      seen.add(file);
      const plan = await this.loadPlan(vscode.Uri.file(file), "extra");
      if (plan) results.push(plan);
    }

    this.cache = results;
    this.cacheKey = key;
    return results;
  }

  private keyFor(config: ScanConfig): string {
    return JSON.stringify(config);
  }

  private async collectGlobal(dir: string): Promise<string[]> {
    const entries = await safeReaddir(dir);
    const out: string[] = [];
    for (const name of entries) {
      if (!name.toLowerCase().endsWith(".plan.md")) continue;
      out.push(path.join(dir, name));
    }
    return out;
  }

  private async collectWorkspace(globs: string[]): Promise<string[]> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0 || globs.length === 0) return [];
    const out: string[] = [];
    for (const folder of folders) {
      for (const g of globs) {
        const pattern = new vscode.RelativePattern(folder, g);
        const uris = await vscode.workspace.findFiles(pattern, "**/node_modules/**", 5000);
        for (const u of uris) out.push(u.fsPath);
      }
    }
    return out;
  }

  private async collectExtra(globs: string[]): Promise<string[]> {
    if (globs.length === 0) return [];
    const out: string[] = [];
    const folders = vscode.workspace.workspaceFolders ?? [];

    for (const raw of globs) {
      const expanded = expandHome(raw);
      if (path.isAbsolute(expanded) || expanded.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(expanded)) {
        const base = path.dirname(expanded);
        const pattern = path.basename(expanded);
        try {
          const uris = await vscode.workspace.findFiles(
            new vscode.RelativePattern(vscode.Uri.file(base), pattern),
            "**/node_modules/**",
            5000,
          );
          for (const u of uris) out.push(u.fsPath);
        } catch {
        }
        continue;
      }
      for (const folder of folders) {
        const pattern = new vscode.RelativePattern(folder, expanded);
        const uris = await vscode.workspace.findFiles(pattern, "**/node_modules/**", 5000);
        for (const u of uris) out.push(u.fsPath);
      }
    }
    return out;
  }

  private async loadPlan(uri: vscode.Uri, source: PlanSource): Promise<Plan | undefined> {
    const fsPath = uri.fsPath;
    const stat = await safeStat(fsPath);
    if (!stat || !stat.isFile()) return undefined;

    let raw: string;
    try {
      raw = await readText(fsPath);
    } catch (err) {
      this.log(fsPath, err);
      return undefined;
    }

    const fallbackName = path.basename(fsPath).replace(/\.plan\.md$/i, "").replace(/\.md$/i, "");
    let name = fallbackName;
    let overview: string | undefined;
    let todos: PlanTodo[] = [];
    let isProject = false;
    let body = raw;
    let parseError: string | undefined;

    try {
      const parsed = matter(raw);
      body = parsed.content;
      const data = parsed.data ?? {};
      if (typeof data.name === "string" && data.name.trim()) name = data.name.trim();
      if (typeof data.overview === "string") overview = data.overview;
      if (typeof data.isProject === "boolean") isProject = data.isProject;
      if (Array.isArray(data.todos)) {
        todos = data.todos
          .map((t): PlanTodo | undefined => {
            if (!t || typeof t !== "object") return undefined;
            const id = typeof t.id === "string" ? t.id : "";
            const content = typeof t.content === "string" ? t.content : "";
            const status: PlanStatus = ALLOWED_STATUSES.has(t.status) ? t.status : "pending";
            if (!content) return undefined;
            return { id: id || `todo-${Math.random().toString(36).slice(2, 10)}`, content, status };
          })
          .filter((x): x is PlanTodo => Boolean(x));
      }
    } catch (err) {
      parseError = err instanceof Error ? err.message : String(err);
      this.log(fsPath, err);
    }

    return {
      uri,
      source,
      name,
      overview,
      todos,
      isProject,
      body,
      mtime: stat.mtimeMs,
      parseError,
    };
  }

  private log(file: string, err: unknown): void {
    const msg = err instanceof Error ? err.message : String(err);
    this.output.appendLine(vscode.l10n.t("Failed to parse plan {0}: {1}", file, msg));
  }
}
