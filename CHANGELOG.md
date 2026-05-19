# Changelog

All notable changes to this extension will be documented in this file.

## [1.0.0] - 2026-05-19

### Added

- Primary side bar view listing every Cursor plan (`*.plan.md`).
- Sources: global `~/.cursor/plans/`, workspace globs, and custom user globs.
- Rich webview preview that mirrors Cursor's native plan view (title, overview, todo statuses, markdown body).
- File watcher with debounced refresh on create/change/delete.
- Bilingual UI (English + Spanish) via `vscode.l10n` and NLS bundles.
- Commands: open preview, open source, refresh, search, reveal in OS, copy path, rename, delete.
- Optional custom editor for `*.plan.md` files (opt-in).
