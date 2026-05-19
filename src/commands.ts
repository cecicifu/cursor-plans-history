import * as path from "path";
import * as vscode from "vscode";
import { PlanTreeProvider } from "./plans/treeProvider";
import { PlanTreeItem } from "./plans/treeItems";
import { PlanPreviewManager } from "./preview/PlanPreviewPanel";
import { readConfig } from "./config";
import { Plan } from "./plans/types";

interface Deps {
  context: vscode.ExtensionContext;
  treeProvider: PlanTreeProvider;
  preview: PlanPreviewManager;
}

export function registerCommands(deps: Deps): vscode.Disposable[] {
  const { context, treeProvider, preview } = deps;
  const disposables: vscode.Disposable[] = [];

  const reg = (cmd: string, cb: (...args: any[]) => any) => {
    const d = vscode.commands.registerCommand(cmd, cb);
    disposables.push(d);
    context.subscriptions.push(d);
  };

  reg("cursorPlans.openPreview", async (arg: vscode.Uri | PlanTreeItem | undefined) => {
    const uri = resolveUri(arg);
    if (!uri) return;
    await preview.show(uri, vscode.ViewColumn.Active);
  });

  reg("cursorPlans.openSource", async (arg: vscode.Uri | PlanTreeItem | undefined) => {
    const uri = resolveUri(arg);
    if (!uri) return;
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, { preview: false });
  });

  reg("cursorPlans.refresh", () => {
    treeProvider.refresh();
  });

  reg("cursorPlans.search", async () => {
    const plans = await treeProvider.ensureLoaded();
    if (plans.length === 0) {
      void vscode.window.showInformationMessage(vscode.l10n.t("No plans match your search"));
      return;
    }
    const items: (vscode.QuickPickItem & { plan: Plan })[] = plans.map((p) => ({
      label: p.name,
      description: p.overview ?? "",
      detail: p.uri.fsPath,
      plan: p,
    }));
    const pick = await vscode.window.showQuickPick(items, {
      placeHolder: vscode.l10n.t("Search plans by name or overview"),
      matchOnDescription: true,
      matchOnDetail: true,
    });
    if (pick) {
      await preview.show(pick.plan.uri);
    }
  });

  reg("cursorPlans.revealInOS", async (arg: vscode.Uri | PlanTreeItem | undefined) => {
    const uri = resolveUri(arg);
    if (!uri) return;
    await vscode.commands.executeCommand("revealFileInOS", uri);
  });

  reg("cursorPlans.copyPath", async (arg: vscode.Uri | PlanTreeItem | undefined) => {
    const uri = resolveUri(arg);
    if (!uri) return;
    await vscode.env.clipboard.writeText(uri.fsPath);
    void vscode.window.setStatusBarMessage(vscode.l10n.t("Path copied to clipboard"), 2000);
  });

  reg("cursorPlans.rename", async (arg: vscode.Uri | PlanTreeItem | undefined) => {
    const uri = resolveUri(arg);
    if (!uri) return;
    const dir = path.dirname(uri.fsPath);
    const baseName = path.basename(uri.fsPath);
    const hasPlanExt = /\.plan\.md$/i.test(baseName);
    const withoutExt = hasPlanExt
      ? baseName.replace(/\.plan\.md$/i, "")
      : baseName.replace(/\.md$/i, "");

    const newName = await vscode.window.showInputBox({
      prompt: vscode.l10n.t("New plan name"),
      value: withoutExt,
      validateInput: (v) => (v.trim().length === 0 ? vscode.l10n.t("Name cannot be empty") : null),
    });
    if (!newName) return;
    const ext = hasPlanExt ? ".plan.md" : ".md";
    const targetPath = path.join(dir, `${newName.trim()}${ext}`);
    const targetUri = vscode.Uri.file(targetPath);
    try {
      await vscode.workspace.fs.stat(targetUri);
      void vscode.window.showErrorMessage(vscode.l10n.t("A plan with that name already exists"));
      return;
    } catch {
    }
    try {
      preview.closeIfOpen(uri);
      await vscode.workspace.fs.rename(uri, targetUri, { overwrite: false });
      treeProvider.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      void vscode.window.showErrorMessage(vscode.l10n.t("Renaming failed: {0}", msg));
    }
  });

  reg("cursorPlans.delete", async (arg: vscode.Uri | PlanTreeItem | undefined) => {
    const uri = resolveUri(arg);
    if (!uri) return;
    const config = readConfig();
    const name = path.basename(uri.fsPath);
    if (config.confirmDelete) {
      const answer = await vscode.window.showWarningMessage(
        vscode.l10n.t('Delete plan "{0}"? This cannot be undone.', name),
        { modal: true },
        vscode.l10n.t("Delete"),
      );
      if (answer !== vscode.l10n.t("Delete")) return;
    }
    try {
      preview.closeIfOpen(uri);
      await vscode.workspace.fs.delete(uri, { useTrash: true });
      treeProvider.refresh();
      void vscode.window.setStatusBarMessage(vscode.l10n.t("Plan deleted"), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      void vscode.window.showErrorMessage(msg);
    }
  });

  reg("cursorPlans.configure", async () => {
    await vscode.commands.executeCommand("workbench.action.openSettings", "cursorPlans");
  });

  return disposables;
}

function resolveUri(arg: vscode.Uri | PlanTreeItem | undefined): vscode.Uri | undefined {
  if (!arg) return undefined;
  if (arg instanceof vscode.Uri) return arg;
  if (arg instanceof PlanTreeItem) return arg.plan.uri;
  if (typeof arg === "object" && "plan" in arg && (arg as PlanTreeItem).plan) {
    return (arg as PlanTreeItem).plan.uri;
  }
  return undefined;
}
