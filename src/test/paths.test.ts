import * as assert from "assert";
import * as os from "os";
import * as path from "path";
import { expandHome, normalizeDir } from "../util/paths";

suite("path utils", () => {
  test("expandHome leaves absolute paths untouched", () => {
    const p = path.isAbsolute("/tmp/foo") ? "/tmp/foo" : "C:/tmp/foo";
    assert.strictEqual(expandHome(p), p);
  });

  test("expandHome resolves ~", () => {
    const resolved = expandHome("~");
    assert.strictEqual(resolved, os.homedir());
  });

  test("expandHome resolves ~/sub/path on both separators", () => {
    const resolved = expandHome("~/foo/bar");
    assert.strictEqual(resolved, path.join(os.homedir(), "foo/bar"));
  });

  test("normalizeDir collapses redundant segments", () => {
    const result = normalizeDir("~/foo/./bar/../baz");
    assert.strictEqual(result, path.join(os.homedir(), "foo", "baz"));
  });
});
