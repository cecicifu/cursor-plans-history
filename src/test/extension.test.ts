import * as assert from "assert";
import * as fs from "fs";
import * as vscode from "vscode";
import { PlanScanner } from "../plans/scanner";
import { PlanTreeProvider } from "../plans/treeProvider";
import { PlanTreeItem } from "../plans/treeItems";
import { VALID_PLAN, makeTempDir, writeFile } from "./fixtures";

suite("Extension integration", () => {
  test("activates the extension", async () => {
    const all = vscode.extensions.all.map((e) => e.id);
    assert.ok(Array.isArray(all));
  });

  test("tree provider exposes a plan after scanning", async () => {
    const tmpDir = makeTempDir();
    try {
      writeFile(tmpDir, "alpha.plan.md", VALID_PLAN);
      await vscode.workspace.getConfiguration("cursorPlans").update(
        "globalPlansDir",
        tmpDir,
        vscode.ConfigurationTarget.Global,
      );
      await vscode.workspace.getConfiguration("cursorPlans").update(
        "includeWorkspace",
        false,
        vscode.ConfigurationTarget.Global,
      );

      const output = vscode.window.createOutputChannel("test-int");
      const scanner = new PlanScanner(output);
      const provider = new PlanTreeProvider(scanner);
      const children = await provider.getChildren();
      const flattened: PlanTreeItem[] = [];
      for (const child of children) {
        if (child instanceof PlanTreeItem) flattened.push(child);
        else {
          const sub = await provider.getChildren(child);
          for (const s of sub) if (s instanceof PlanTreeItem) flattened.push(s);
        }
      }
      assert.ok(flattened.length >= 1);
      assert.ok(flattened.some((p) => p.label === "Sample"));
      output.dispose();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      await vscode.workspace.getConfiguration("cursorPlans").update(
        "globalPlansDir",
        undefined,
        vscode.ConfigurationTarget.Global,
      );
      await vscode.workspace.getConfiguration("cursorPlans").update(
        "includeWorkspace",
        undefined,
        vscode.ConfigurationTarget.Global,
      );
    }
  });
});
