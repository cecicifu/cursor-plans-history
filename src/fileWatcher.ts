import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { normalizeDir } from "./util/paths";
import { CursorPlansConfig } from "./config";

const DEBOUNCE_MS = 200;

export type WatcherEvent = "created" | "changed" | "deleted";
export type WatcherListener = (uri: vscode.Uri, event: WatcherEvent) => void;

export class PlanFileWatcher implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private fsWatchers: fs.FSWatcher[] = [];
  private debounceTimer: NodeJS.Timeout | undefined;
  private pendingEvents: Array<{ uri: vscode.Uri; event: WatcherEvent }> = [];

  constructor(private readonly listener: WatcherListener) {}

  reconfigure(config: CursorPlansConfig): void {
    this.disposeWatchers();

    const globalDir = normalizeDir(config.globalPlansDir);
    this.watchNodeDir(globalDir);

    if (config.includeWorkspace) {
      for (const g of config.workspaceGlobs) this.watchWorkspaceGlob(g);
    }
    for (const g of config.extraGlobs) this.watchWorkspaceGlob(g);
  }

  private watchWorkspaceGlob(glob: string): void {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) return;
    for (const folder of folders) {
      const pattern = new vscode.RelativePattern(folder, glob);
      const w = vscode.workspace.createFileSystemWatcher(pattern);
      this.disposables.push(
        w,
        w.onDidCreate((u) => this.schedule(u, "created")),
        w.onDidChange((u) => this.schedule(u, "changed")),
        w.onDidDelete((u) => this.schedule(u, "deleted")),
      );
    }
  }

  private watchNodeDir(dir: string): void {
    try {
      const watcher = fs.watch(dir, { persistent: false, recursive: false }, (event, filename) => {
        if (!filename) return;
        const name = typeof filename === "string" ? filename : String(filename);
        if (!name.toLowerCase().endsWith(".plan.md")) return;
        const uri = vscode.Uri.file(path.join(dir, name));
        const evt: WatcherEvent = event === "rename" ? "created" : "changed";
        this.schedule(uri, evt);
      });
      watcher.on("error", () => {
      });
      this.fsWatchers.push(watcher);
    } catch {
    }
  }

  private schedule(uri: vscode.Uri, event: WatcherEvent): void {
    this.pendingEvents.push({ uri, event });
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      const events = this.pendingEvents;
      this.pendingEvents = [];
      this.debounceTimer = undefined;
      const seen = new Set<string>();
      for (const e of events) {
        const key = `${e.uri.toString()}:${e.event}`;
        if (seen.has(key)) continue;
        seen.add(key);
        try {
          this.listener(e.uri, e.event);
        } catch {
        }
      }
    }, DEBOUNCE_MS);
  }

  private disposeWatchers(): void {
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
    for (const w of this.fsWatchers) {
      try {
        w.close();
      } catch {
      }
    }
    this.fsWatchers = [];
  }

  dispose(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = undefined;
    this.disposeWatchers();
  }
}
