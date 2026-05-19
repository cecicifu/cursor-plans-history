import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { PlanScanner } from "../plans/scanner";
import {
  BAD_YAML,
  MISSING_FRONTMATTER,
  UNKNOWN_STATUS,
  VALID_PLAN,
  makeTempDir,
  writeFile,
} from "./fixtures";

suite("PlanScanner", () => {
  let tmpDir: string;
  let scanner: PlanScanner;
  let output: vscode.OutputChannel;

  setup(() => {
    tmpDir = makeTempDir();
    output = vscode.window.createOutputChannel("test-plans");
    scanner = new PlanScanner(output);
  });

  teardown(() => {
    output.dispose();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("parses a valid plan with todos and frontmatter", async () => {
    writeFile(tmpDir, "sample.plan.md", VALID_PLAN);
    const plans = await scanner.scan({
      globalPlansDir: tmpDir,
      includeWorkspace: false,
      workspaceGlobs: [],
      extraGlobs: [],
    });
    assert.strictEqual(plans.length, 1);
    const p = plans[0];
    assert.strictEqual(p.name, "Sample");
    assert.strictEqual(p.overview, "Sample overview");
    assert.strictEqual(p.isProject, true);
    assert.strictEqual(p.todos.length, 3);
    assert.deepStrictEqual(
      p.todos.map((t) => t.status),
      ["completed", "in-progress", "pending"],
    );
    assert.ok(p.body.includes("Hello"));
    assert.strictEqual(p.source, "global");
  });

  test("falls back to filename when frontmatter is missing", async () => {
    writeFile(tmpDir, "no-frontmatter.plan.md", MISSING_FRONTMATTER);
    const plans = await scanner.scan({
      globalPlansDir: tmpDir,
      includeWorkspace: false,
      workspaceGlobs: [],
      extraGlobs: [],
    });
    assert.strictEqual(plans.length, 1);
    assert.strictEqual(plans[0].name, "no-frontmatter");
    assert.strictEqual(plans[0].todos.length, 0);
  });

  test("recovers from broken YAML without throwing", async () => {
    writeFile(tmpDir, "bad.plan.md", BAD_YAML);
    const plans = await scanner.scan({
      globalPlansDir: tmpDir,
      includeWorkspace: false,
      workspaceGlobs: [],
      extraGlobs: [],
    });
    assert.strictEqual(plans.length, 1);
    assert.strictEqual(plans[0].name, "bad");
    assert.ok(plans[0].parseError);
  });

  test("coerces unknown todo statuses to 'pending'", async () => {
    writeFile(tmpDir, "weird.plan.md", UNKNOWN_STATUS);
    const plans = await scanner.scan({
      globalPlansDir: tmpDir,
      includeWorkspace: false,
      workspaceGlobs: [],
      extraGlobs: [],
    });
    assert.strictEqual(plans.length, 1);
    assert.strictEqual(plans[0].todos[0].status, "pending");
  });

  test("ignores files that are not *.plan.md in global dir", async () => {
    writeFile(tmpDir, "ignore.md", "# hi");
    writeFile(tmpDir, "ok.plan.md", VALID_PLAN);
    const plans = await scanner.scan({
      globalPlansDir: tmpDir,
      includeWorkspace: false,
      workspaceGlobs: [],
      extraGlobs: [],
    });
    assert.strictEqual(plans.length, 1);
    assert.strictEqual(path.basename(plans[0].uri.fsPath), "ok.plan.md");
  });

  test("invalidate() forces a re-read", async () => {
    writeFile(tmpDir, "one.plan.md", VALID_PLAN);
    const first = await scanner.scan({
      globalPlansDir: tmpDir,
      includeWorkspace: false,
      workspaceGlobs: [],
      extraGlobs: [],
    });
    assert.strictEqual(first.length, 1);
    writeFile(tmpDir, "two.plan.md", VALID_PLAN);
    scanner.invalidate();
    const second = await scanner.scan({
      globalPlansDir: tmpDir,
      includeWorkspace: false,
      workspaceGlobs: [],
      extraGlobs: [],
    });
    assert.strictEqual(second.length, 2);
  });
});
