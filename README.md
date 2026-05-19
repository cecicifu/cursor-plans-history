# Cursor Plans History

> Browse, preview and manage your Cursor `*.plan.md` history from the side bar — in VS Code **and** Cursor.

Cursor's Plan Mode saves each plan as a `*.plan.md` file under `~/.cursor/plans/`. This extension adds a dedicated activity bar icon that lists every plan (global + workspace + your custom globs) and renders each one in a rich webview that mirrors Cursor's native plan view.

## Features

- **Activity bar view**: a new icon in the primary side bar lists every plan, grouped by origin (Global / Workspace / Extra) or by date.
- **Rich preview**: title, overview, todo statuses with colored pills, progress bar, project badge and the full markdown body — styled with native VS Code theme colors.
- **Workspace + global + custom**: discovers `~/.cursor/plans/*.plan.md` plus any glob you configure inside your workspace (e.g. `.cursor/plans/**`, `docs/plans/**`).
- **Live updates**: built-in file watcher refreshes both the tree and the open preview as soon as Cursor (or you) saves a plan.
- **Quick actions**: open source, reveal in OS, copy path, rename, delete (trash, with confirmation).
- **Search palette**: `Cursor Plans: Search Plans...` quick pick across every discovered plan.
- **Bilingual UI**: English by default, Spanish included. Uses VS Code's native NLS so it follows the editor language automatically.
- **Optional auto-preview**: when `cursorPlans.useCustomEditor` is on, opening a `*.plan.md` from the explorer also reveals the rendered preview beside the source.

## Installation

### Cursor

Cursor uses the Open VSX registry. Open the Extensions view (`Ctrl+Shift+X`), search for **Cursor Plans History** and click **Install**.

### VS Code

Open the Extensions view (`Ctrl+Shift+X`), search for **Cursor Plans History** and click **Install**, or grab the `.vsix` from [GitHub Releases](https://github.com/cecicifu/cursor-plans-history/releases) and install it via `Extensions: Install from VSIX...`.

## Usage

1. Click the **Cursor Plans** icon in the activity bar (primary side bar).
2. The view lists every plan it discovers.
3. Click a plan to open the rendered preview.
4. Right-click for `Open Source`, `Reveal in File Explorer`, `Copy Path`, `Rename`, `Delete`.

## Settings

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `cursorPlans.globalPlansDir` | string | `~/.cursor/plans` | Path to the global Cursor plans directory. |
| `cursorPlans.includeWorkspace` | boolean | `true` | Include workspace plans matched by `workspaceGlobs`. |
| `cursorPlans.workspaceGlobs` | string[] | `[".cursor/plans/**/*.plan.md"]` | Globs relative to each workspace folder. |
| `cursorPlans.extraGlobs` | string[] | `[]` | Extra workspace-relative or absolute globs to scan. |
| `cursorPlans.groupBy` | `source` \| `date` \| `none` | `source` | How tree items are grouped. |
| `cursorPlans.sortBy` | `modified-desc` \| `modified-asc` \| `name` | `modified-desc` | Sort order inside each group. |
| `cursorPlans.useCustomEditor` | boolean | `false` | Auto-open the rendered preview beside `*.plan.md` files. |
| `cursorPlans.confirmDelete` | boolean | `true` | Ask before deleting a plan. |

## Plan file format

Plans use a YAML frontmatter block followed by markdown:

```yaml
---
name: My Feature
overview: One-line description shown under the title.
todos:
  - id: setup
    content: Install dependencies
    status: completed
  - id: build
    content: Wire the new module
    status: in-progress
isProject: false
---

## Body

Free-form markdown rendered as the body of the preview.
```

Allowed `todos[].status` values: `pending`, `in-progress`, `completed`, `error`.

## Build from source

```bash
npm install
npm run build
npm run package        # builds the .vsix
```

To run the test suite locally:

```bash
npm test
```

## Publishing (maintainer notes)

The release workflow publishes to both marketplaces from the same `.vsix`:

- VS Code Marketplace via `@vscode/vsce` (`VSCE_PAT` secret).
- Open VSX (mirrored by Cursor) via `ovsx` (`OVSX_PAT` secret).

Tag the release (`vX.Y.Z`) and push the tag to trigger `.github/workflows/release.yml`.

## License

MIT — see [`LICENSE`](./LICENSE).
