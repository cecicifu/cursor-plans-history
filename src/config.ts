import * as vscode from "vscode";

export type GroupBy = "source" | "date" | "none";
export type SortBy = "modified-desc" | "modified-asc" | "name";

export interface CursorPlansConfig {
  globalPlansDir: string;
  includeWorkspace: boolean;
  workspaceGlobs: string[];
  extraGlobs: string[];
  groupBy: GroupBy;
  sortBy: SortBy;
  useCustomEditor: boolean;
  confirmDelete: boolean;
}

const SECTION = "cursorPlans";

export function readConfig(): CursorPlansConfig {
  const c = vscode.workspace.getConfiguration(SECTION);
  return {
    globalPlansDir: c.get<string>("globalPlansDir", "~/.cursor/plans"),
    includeWorkspace: c.get<boolean>("includeWorkspace", true),
    workspaceGlobs: c.get<string[]>("workspaceGlobs", [".cursor/plans/**/*.plan.md"]),
    extraGlobs: c.get<string[]>("extraGlobs", []),
    groupBy: c.get<GroupBy>("groupBy", "source"),
    sortBy: c.get<SortBy>("sortBy", "modified-desc"),
    useCustomEditor: c.get<boolean>("useCustomEditor", false),
    confirmDelete: c.get<boolean>("confirmDelete", true),
  };
}

export function onConfigChange(listener: () => void): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(SECTION)) listener();
  });
}
