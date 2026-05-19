import * as vscode from "vscode";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function relativeDate(mtime: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - mtime);
  if (diff < MINUTE) return vscode.l10n.t("just now");
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE);
    return vscode.l10n.t("{0}m ago", m);
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return vscode.l10n.t("{0}h ago", h);
  }
  if (diff < WEEK) {
    const d = Math.floor(diff / DAY);
    return vscode.l10n.t("{0}d ago", d);
  }
  const date = new Date(mtime);
  return date.toLocaleDateString();
}

export function dateBucket(mtime: number, now: number = Date.now()): string {
  const diff = now - mtime;
  if (diff < DAY) return vscode.l10n.t("Today");
  if (diff < 2 * DAY) return vscode.l10n.t("Yesterday");
  if (diff < WEEK) return vscode.l10n.t("This week");
  if (diff < 30 * DAY) return vscode.l10n.t("This month");
  return vscode.l10n.t("Older");
}
