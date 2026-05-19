import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export function makeTempDir(prefix = "cursor-plans-test-"): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function writeFile(dir: string, name: string, content: string): string {
  const target = path.join(dir, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
  return target;
}

export const VALID_PLAN = `---
name: Sample
overview: Sample overview
todos:
  - id: a
    content: Do A
    status: completed
  - id: b
    content: Do B
    status: in-progress
  - id: c
    content: Do C
    status: pending
isProject: true
---

# Body

Hello _world_.
`;

export const MISSING_FRONTMATTER = `# Just markdown

Nothing else.
`;

export const BAD_YAML = `---
name: [unclosed
---

body
`;

export const UNKNOWN_STATUS = `---
name: With weird status
todos:
  - id: x
    content: do something
    status: not-a-real-status
---

body
`;
