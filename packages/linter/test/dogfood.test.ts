import { test, expect, describe, afterEach } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import { lint } from "../src/index.ts";
import { run } from "../src/cli.ts";

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

  describe("CI dogfood step exit code", () => {
    const originalCwd = process.cwd();
    afterEach(() => process.chdir(originalCwd));

    // Mirror the EXACT invocation shipped in .github/workflows/ci.yml's
    // test-and-dogfood job, so the GREEN suite actually exercises the CI
    // step's exit code instead of only string-matching ci.yml tokens.
    function dogfoodCiInvocation(): string[] {
      const ci = join(REPO_ROOT, ".github", "workflows", "ci.yml");
      const raw = readFileSync(ci, "utf8");
      const match = raw.match(/dist\/cli\.js\s+(.+)$/m);
      expect(match, "ci.yml must contain a dist/cli.js dogfood run line").toBeTruthy();
      // Split the args, stripping surrounding quotes from the glob.
      return match![1]!
        .trim()
        .split(/\s+/)
        .map((a) => a.replace(/^"|"$/g, ""));
    }

    test("ci.yml dogfood invocation has no --strict (warnings must not fail CI)", () => {
      expect(dogfoodCiInvocation()).not.toContain("--strict");
    });

    test("running the CI dogfood invocation against templates exits 0", async () => {
      const argv = dogfoodCiInvocation();
      process.chdir(REPO_ROOT);
      const code = await run(argv, { write: () => {} });
      expect(code).toBe(0);
    });
  });
});
