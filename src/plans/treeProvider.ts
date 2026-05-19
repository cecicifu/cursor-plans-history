import * as vscode from "vscode";
import { Plan, PlanSource } from "./types";
import { GroupTreeItem, Node, PlanTreeItem } from "./treeItems";
import { PlanScanner } from "./scanner";
import { GroupBy, SortBy, readConfig } from "../config";
import { dateBucket } from "../util/time";

export class PlanTreeProvider implements vscode.TreeDataProvider<Node> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<Node | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private cachedPlans: Plan[] = [];
  private filter = "";

  constructor(private readonly scanner: PlanScanner) {}

  refresh(): void {
    this.scanner.invalidate();
    this._onDidChangeTreeData.fire();
  }

  setFilter(filter: string): void {
    this.filter = filter.trim().toLowerCase();
    this._onDidChangeTreeData.fire();
  }

  getPlans(): Plan[] {
    return this.cachedPlans;
  }

  getTreeItem(element: Node): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: Node): Promise<Node[]> {
    const config = readConfig();
    if (!element) {
      this.cachedPlans = await this.scanner.scan(config);
      const plans = this.applyFilter(this.cachedPlans);
      return this.buildGroups(plans, config.groupBy, config.sortBy);
    }
    if (element instanceof GroupTreeItem) {
      return sortPlans(element.plans, readConfig().sortBy).map((p) => new PlanTreeItem(p));
    }
    return [];
  }

  private applyFilter(plans: Plan[]): Plan[] {
    if (!this.filter) return plans;
    return plans.filter((p) => {
      const haystack = `${p.name}\n${p.overview ?? ""}`.toLowerCase();
      return haystack.includes(this.filter);
    });
  }

  private buildGroups(plans: Plan[], groupBy: GroupBy, sortBy: SortBy): Node[] {
    if (groupBy === "none" || plans.length === 0) {
      return sortPlans(plans, sortBy).map((p) => new PlanTreeItem(p));
    }
    if (groupBy === "source") {
      const order: PlanSource[] = ["global", "workspace", "extra"];
      const buckets = new Map<PlanSource, Plan[]>();
      for (const s of order) buckets.set(s, []);
      for (const p of plans) buckets.get(p.source)!.push(p);
      const result: Node[] = [];
      for (const s of order) {
        const list = buckets.get(s)!;
        if (list.length === 0) continue;
        result.push(new GroupTreeItem(labelForSource(s), `source:${s}`, list));
      }
      return result;
    }
    const buckets = new Map<string, Plan[]>();
    const orderedKeys: string[] = [];
    for (const p of plans) {
      const key = dateBucket(p.mtime);
      if (!buckets.has(key)) {
        buckets.set(key, []);
        orderedKeys.push(key);
      }
      buckets.get(key)!.push(p);
    }
    return orderedKeys.map((k) => new GroupTreeItem(k, `date:${k}`, buckets.get(k)!));
  }

  findPlan(uri: vscode.Uri): Plan | undefined {
    const target = uri.toString();
    return this.cachedPlans.find((p) => p.uri.toString() === target);
  }

  async ensureLoaded(): Promise<Plan[]> {
    if (this.cachedPlans.length === 0) {
      this.cachedPlans = await this.scanner.scan(readConfig());
    }
    return this.cachedPlans;
  }
}

function labelForSource(source: PlanSource): string {
  switch (source) {
    case "global":
      return vscode.l10n.t("Global");
    case "workspace":
      return vscode.l10n.t("Workspace");
    case "extra":
      return vscode.l10n.t("Extra");
  }
}

function sortPlans(plans: Plan[], sortBy: SortBy): Plan[] {
  const sorted = [...plans];
  switch (sortBy) {
    case "modified-asc":
      sorted.sort((a, b) => a.mtime - b.mtime);
      break;
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      break;
    case "modified-desc":
    default:
      sorted.sort((a, b) => b.mtime - a.mtime);
      break;
  }
  return sorted;
}
