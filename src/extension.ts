import * as vscode from "vscode";
import { PlanScanner } from "./plans/scanner";
import { PlanTreeProvider } from "./plans/treeProvider";
import { PlanPreviewManager } from "./preview/PlanPreviewPanel";
import { PlanFileWatcher } from "./fileWatcher";
import { registerCommands } from "./commands";
import { onConfigChange, readConfig } from "./config";

let outputChannel: vscode.OutputChannel | undefined;

export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel("Cursor Plans");
  context.subscriptions.push(outputChannel);

  const scanner = new PlanScanner(outputChannel);
  const treeProvider = new PlanTreeProvider(scanner);
  const preview = new PlanPreviewManager(context, scanner);

  const treeView = vscode.window.createTreeView("cursorPlans.history", {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
    canSelectMany: false,
  });
  context.subscriptions.push(treeView);
  context.subscriptions.push(preview);

  const watcher = new PlanFileWatcher((uri, _event) => {
    treeProvider.refresh();
    if (preview.hasPanel(uri)) {
      void preview.refresh(uri);
    }
  });
  context.subscriptions.push(watcher);
  watcher.reconfigure(readConfig());

  context.subscriptions.push(
    onConfigChange(() => {
      watcher.reconfigure(readConfig());
      treeProvider.refresh();
    }),
  );

  registerCommands({ context, treeProvider, preview });
  context.subscriptions.push(preview.registerSerializer());

  registerCustomEditorOpener(context, preview);
}

function registerCustomEditorOpener(
  context: vscode.ExtensionContext,
  preview: PlanPreviewManager,
): void {
  const openIfEnabled = (doc: vscode.TextDocument) => {
    if (!readConfig().useCustomEditor) return;
    if (doc.uri.scheme !== "file") return;
    if (!/\.plan\.md$/i.test(doc.fileName)) return;
    if (preview.hasPanel(doc.uri)) return;
    void preview.show(doc.uri, vscode.ViewColumn.Beside);
  };

  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(openIfEnabled));
  for (const doc of vscode.workspace.textDocuments) openIfEnabled(doc);
}

export function deactivate(): void {
}
