import * as vscode from "vscode";
import { Plan, computeProgress } from "./types";
import { relativeDate } from "../util/time";

export class PlanTreeItem extends vscode.TreeItem {
  readonly plan: Plan;

  constructor(plan: Plan) {
    super(plan.name, vscode.TreeItemCollapsibleState.None);
    this.plan = plan;
    this.id = plan.uri.toString();

    const progress = computeProgress(plan);
    const parts: string[] = [];
    if (progress.total > 0) {
      parts.push(`${progress.completed}/${progress.total}`);
    }
    parts.push(relativeDate(plan.mtime));
    this.description = parts.join("  ");

    this.tooltip = this.buildTooltip();
    this.resourceUri = plan.uri;
    this.contextValue = "plan";
    this.iconPath = iconForPlan(plan);

    this.command = {
      command: "cursorPlans.openPreview",
      title: "Open Plan Preview",
      arguments: [plan.uri],
    };
  }

  private buildTooltip(): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.supportThemeIcons = true;
    md.isTrusted = false;
    md.appendMarkdown(`**${escapeMd(this.plan.name)}**\n\n`);
    if (this.plan.overview) {
      md.appendMarkdown(`${escapeMd(this.plan.overview)}\n\n`);
    }
    const progress = computeProgress(this.plan);
    if (progress.total > 0) {
      md.appendMarkdown(
        `$(checklist) ${vscode.l10n.t("{0} of {1} done", progress.completed, progress.total)}\n\n`,
      );
      const preview = this.plan.todos.slice(0, 5);
      for (const t of preview) {
        md.appendMarkdown(`- ${statusIconMd(t.status)} ${escapeMd(t.content)}\n`);
      }
      if (this.plan.todos.length > preview.length) {
        md.appendMarkdown(`- _+${this.plan.todos.length - preview.length} more_\n`);
      }
    } else {
      md.appendMarkdown(`_${vscode.l10n.t("No todos")}_\n`);
    }
    md.appendMarkdown(`\n\`${this.plan.uri.fsPath}\``);
    return md;
  }
}

export class GroupTreeItem extends vscode.TreeItem {
  readonly groupKey: string;
  readonly plans: Plan[];

  constructor(label: string, groupKey: string, plans: Plan[]) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
    this.groupKey = groupKey;
    this.plans = plans;
    this.id = `group:${groupKey}`;
    this.description = String(plans.length);
    this.contextValue = "planGroup";
    this.iconPath = new vscode.ThemeIcon("folder");
  }
}

export type Node = GroupTreeItem | PlanTreeItem;

function iconForPlan(plan: Plan): vscode.ThemeIcon {
  const p = computeProgress(plan);
  if (p.hasError) {
    return new vscode.ThemeIcon("warning", new vscode.ThemeColor("testing.iconFailed"));
  }
  if (p.total > 0 && p.completed === p.total) {
    return new vscode.ThemeIcon("pass", new vscode.ThemeColor("testing.iconPassed"));
  }
  if (p.hasInProgress) {
    return new vscode.ThemeIcon("sync", new vscode.ThemeColor("charts.blue"));
  }
  return new vscode.ThemeIcon("checklist");
}

function statusIconMd(status: string): string {
  switch (status) {
    case "completed":
      return "$(pass)";
    case "in-progress":
      return "$(sync)";
    case "error":
      return "$(error)";
    default:
      return "$(circle-large-outline)";
  }
}

function escapeMd(s: string): string {
  return s.replace(/[\\`*_{}\[\]()#+\-.!|>]/g, (m) => `\\${m}`);
}
