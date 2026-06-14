import { test, expect, describe } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import { lint } from "../src/index.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..");

describe("self-dogfood: templates pass the linter", () => {
  test("every templates/**/AGENTS.md lints with zero errors", () => {
    const glob = new Glob("templates/**/AGENTS.md");
    const files = [...glob.scanSync(REPO_ROOT)];
    expect(files.length).toBeGreaterThan(0);
    for (const rel of files) {
      const abs = join(REPO_ROOT, rel);
      const content = readFileSync(abs, "utf8");
      const result = lint(content, { filename: "AGENTS.md" });
      const errors = result.findings.filter((f) => f.severity === "error");
      expect(errors, `${rel} should have no errors`).toEqual([]);
    }
  });

  test("ci.yml contains an ACTIVE dogfood lint job", () => {
    const ci = join(REPO_ROOT, ".github", "workflows", "ci.yml");
    expect(existsSync(ci)).toBe(true);
    const raw = readFileSync(ci, "utf8");
    // The content plan ships ci.yml with a COMMENTED dogfood seam (which
    // mentions agents-md-lint inside a comment). Assert on tokens unique to
    // the ACTIVE job so the test stays red until Step 4 wires it in for real.
    expect(raw).toContain("test-and-dogfood");
    expect(raw).toContain("packages/linter/dist/cli.js");
    expect(raw).toContain("templates/**/AGENTS.md");
  });
});
