import * as vscode from "vscode";

export type PlanStatus = "pending" | "in-progress" | "completed" | "error";

export interface PlanTodo {
  id: string;
  content: string;
  status: PlanStatus;
}

export type PlanSource = "global" | "workspace" | "extra";

export interface Plan {
  uri: vscode.Uri;
  source: PlanSource;
  name: string;
  overview?: string;
  todos: PlanTodo[];
  isProject: boolean;
  body: string;
  mtime: number;
  parseError?: string;
}

export interface PlanProgress {
  completed: number;
  total: number;
  hasError: boolean;
  hasInProgress: boolean;
}

export function computeProgress(plan: Plan): PlanProgress {
  let completed = 0;
  let hasError = false;
  let hasInProgress = false;
  for (const t of plan.todos) {
    if (t.status === "completed") completed++;
    else if (t.status === "error") hasError = true;
    else if (t.status === "in-progress") hasInProgress = true;
  }
  return { completed, total: plan.todos.length, hasError, hasInProgress };
}
