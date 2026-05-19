import * as crypto from "crypto";
import * as vscode from "vscode";
import { Plan, computeProgress } from "../plans/types";
import { PlanScanner } from "../plans/scanner";
import { readConfig } from "../config";
import { renderMarkdown, escapeHtml } from "./renderer";

const VIEW_TYPE = "cursorPlans.preview";

interface PanelState {
  uri: string;
}

export class PlanPreviewManager implements vscode.Disposable {
  private readonly panels = new Map<string, vscode.WebviewPanel>();
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly scanner: PlanScanner,
  ) {}

  registerSerializer(): vscode.Disposable {
    const serializer: vscode.WebviewPanelSerializer<PanelState> = {
      deserializeWebviewPanel: async (panel, state) => {
        if (state?.uri) {
          try {
            const uri = vscode.Uri.parse(state.uri);
            this.attachPanel(uri, panel);
            await this.refreshPanel(uri);
            return;
          } catch {
          }
        }
        panel.dispose();
      },
    };
    const d = vscode.window.registerWebviewPanelSerializer(VIEW_TYPE, serializer);
    this.disposables.push(d);
    return d;
  }

  async show(uri: vscode.Uri, viewColumn: vscode.ViewColumn = vscode.ViewColumn.Active): Promise<void> {
    const key = uri.toString();
    const existing = this.panels.get(key);
    if (existing) {
      existing.reveal(existing.viewColumn ?? viewColumn);
      await this.refreshPanel(uri);
      return;
    }
    const plan = await this.loadPlan(uri);
    const title = plan?.name ?? uri.path.split("/").pop() ?? "Plan";
    const panel = vscode.window.createWebviewPanel(VIEW_TYPE, title, viewColumn, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "media")],
    });
    panel.iconPath = vscode.Uri.joinPath(this.context.extensionUri, "media", "sidebar-icon.svg");
    this.attachPanel(uri, panel);
    await this.refreshPanel(uri, plan);
  }

  hasPanel(uri: vscode.Uri): boolean {
    return this.panels.has(uri.toString());
  }

  async refresh(uri: vscode.Uri): Promise<void> {
    if (!this.panels.has(uri.toString())) return;
    await this.refreshPanel(uri);
  }

  closeIfOpen(uri: vscode.Uri): void {
    const p = this.panels.get(uri.toString());
    if (p) p.dispose();
  }

  private attachPanel(uri: vscode.Uri, panel: vscode.WebviewPanel): void {
    const key = uri.toString();
    this.panels.set(key, panel);
    panel.onDidDispose(() => this.panels.delete(key));
    panel.webview.onDidReceiveMessage((msg) => this.handleMessage(uri, msg));
  }

  private async loadPlan(uri: vscode.Uri): Promise<Plan | undefined> {
    const plans = await this.scanner.scan(readConfig());
    return plans.find((p) => p.uri.toString() === uri.toString());
  }

  private async refreshPanel(uri: vscode.Uri, planArg?: Plan): Promise<void> {
    const panel = this.panels.get(uri.toString());
    if (!panel) return;
    let plan = planArg;
    if (!plan) {
      this.scanner.invalidate();
      plan = await this.loadPlan(uri);
    }
    if (!plan) {
      panel.webview.html = this.renderMissing(panel.webview, uri);
      return;
    }
    panel.title = plan.name;
    panel.webview.html = this.renderHtml(panel.webview, plan);
  }

  private handleMessage(uri: vscode.Uri, msg: unknown): void {
    if (!msg || typeof msg !== "object") return;
    const m = msg as { type?: string; command?: string };
    if (m.type !== "command" || !m.command) return;
    switch (m.command) {
      case "openSource":
        void vscode.commands.executeCommand("cursorPlans.openSource", uri);
        break;
      case "revealInOS":
        void vscode.commands.executeCommand("cursorPlans.revealInOS", uri);
        break;
      case "copyMarkdown":
        void this.copyMarkdown(uri);
        break;
    }
  }

  private async copyMarkdown(uri: vscode.Uri): Promise<void> {
    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.env.clipboard.writeText(doc.getText());
      const panel = this.panels.get(uri.toString());
      panel?.webview.postMessage({ type: "toast", text: vscode.l10n.t("Copied") });
    } catch {
    }
  }

  private renderMissing(webview: vscode.Webview, uri: vscode.Uri): string {
    const nonce = makeNonce();
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "preview.css"),
    );
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp(webview, nonce)}" />
<link rel="stylesheet" href="${cssUri}" />
<title>Plan</title>
</head>
<body>
<div class="container">
  <header class="plan-header">
    <h1 class="plan-title">${escapeHtml(uri.path.split("/").pop() ?? "Plan")}</h1>
    <p class="plan-overview">${escapeHtml(vscode.l10n.t("Plan deleted"))}</p>
  </header>
</div>
</body>
</html>`;
  }

  private renderHtml(webview: vscode.Webview, plan: Plan): string {
    const nonce = makeNonce();
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "preview.css"),
    );
    const hljsCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "highlight.css"),
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "preview.js"),
    );

    const progress = computeProgress(plan);
    const progressPct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
    const bodyHtml = renderMarkdown(plan.body);

    const todoListHtml = plan.todos.length
      ? `<ul class="todos">${plan.todos
          .map(
            (t) => `
        <li>
          <span class="status-dot status-${t.status}" title="${escapeHtml(vscode.l10n.t(t.status))}">
            ${statusGlyph(t.status)}
          </span>
          <div class="todo-content${t.status === "completed" ? " completed" : ""}">${escapeHtml(t.content)}</div>
        </li>`,
          )
          .join("")}</ul>`
      : `<p class="plan-overview"><em>${escapeHtml(vscode.l10n.t("No todos"))}</em></p>`;

    const parseError = plan.parseError
      ? `<div class="parse-error">${escapeHtml(plan.parseError)}</div>`
      : "";

    const projectBadge = plan.isProject
      ? `<span class="project-badge">${escapeHtml(vscode.l10n.t("Project"))}</span>`
      : "";

    const overviewHtml = plan.overview
      ? `<p class="plan-overview">${escapeHtml(plan.overview)}</p>`
      : "";

    const progressLabel =
      progress.total > 0 ? vscode.l10n.t("{0} of {1} done", progress.completed, progress.total) : "";

    const progressBlock =
      progress.total > 0
        ? `<div class="progress-row">
             <div class="progress-bar"><div class="progress-bar-fill" style="width:${progressPct}%"></div></div>
             <span>${escapeHtml(progressLabel)}</span>
           </div>`
        : "";

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp(webview, nonce)}" />
<link rel="stylesheet" href="${cssUri}" />
<link rel="stylesheet" href="${hljsCssUri}" />
<title>${escapeHtml(plan.name)}</title>
</head>
<body>
<div class="container">
  <header class="plan-header">
    <div class="plan-title-row">
      <h1 class="plan-title">${escapeHtml(plan.name)}</h1>
      ${projectBadge}
    </div>
    ${overviewHtml}
    ${progressBlock}
    <div class="plan-toolbar">
      <button data-command="openSource">${escapeHtml(vscode.l10n.t("Open Plan Source"))}</button>
      <button data-command="revealInOS">${escapeHtml(vscode.l10n.t("Reveal in File Explorer"))}</button>
      <button data-command="copyMarkdown">${escapeHtml(vscode.l10n.t("Copy Markdown"))}</button>
    </div>
    ${parseError}
  </header>

  ${
    plan.todos.length
      ? `<div class="section-title">${escapeHtml(vscode.l10n.t("Todos"))}</div>${todoListHtml}`
      : ""
  }

  ${
    plan.body.trim()
      ? `<div class="section-title">${escapeHtml(vscode.l10n.t("Body"))}</div>
         <div class="markdown-body">${bodyHtml}</div>`
      : ""
  }

  <div id="toast" class="toast"></div>
</div>
<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    for (const p of this.panels.values()) {
      try {
        p.dispose();
      } catch {
      }
    }
    this.panels.clear();
  }
}

function csp(webview: vscode.Webview, nonce: string): string {
  return [
    `default-src 'none'`,
    `img-src ${webview.cspSource} https: data:`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `font-src ${webview.cspSource}`,
    `script-src 'nonce-${nonce}'`,
  ].join("; ");
}

function makeNonce(): string {
  return crypto.randomBytes(16).toString("base64").replace(/[^a-zA-Z0-9]/g, "");
}

function statusGlyph(status: string): string {
  switch (status) {
    case "completed":
      return "&#10003;";
    case "in-progress":
      return "&#9633;";
    case "error":
      return "&#33;";
    default:
      return "";
  }
}
