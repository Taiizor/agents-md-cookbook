import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lint, lintAll } from "../src/index.ts";

describe("lint", () => {
  test("returns a LintResult with findings, score, grade", () => {
    const res = lint("# TODO\n", { filename: "AGENTS.md" });
    expect(res.file).toBe("AGENTS.md");
    expect(Array.isArray(res.findings)).toBe(true);
    expect(typeof res.score).toBe("number");
    expect(["A", "B", "C", "D", "F"]).toContain(res.grade);
  });

  test("skips freshness rules in standalone mode", () => {
    const res = lint("See `src/missing.ts`.\n", { filename: "AGENTS.md" });
    expect(res.findings.some((f) => f.ruleId === "AMC-PATH")).toBe(false);
  });

  test("runs freshness rules when root is provided", () => {
    const repo = mkdtempSync(join(tmpdir(), "amc-api-"));
    try {
      const res = lint("See `src/missing.ts`.\n", {
        filename: "AGENTS.md",
        root: repo,
      });
      expect(res.findings.some((f) => f.ruleId === "AMC-PATH")).toBe(true);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  test("honors ruleConfig overrides", () => {
    const res = lint("x".repeat(50), {
      filename: "AGENTS.md",
      ruleConfig: { "XP-007": { maxBytes: 10 } },
    });
    expect(res.findings.some((f) => f.ruleId === "XP-007")).toBe(true);
  });
});

describe("lintAll", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "amc-all-"));
    writeFileSync(join(dir, "AGENTS.md"), "# A\n\n## Setup\n```bash\nbun install\n```\n");
    writeFileSync(join(dir, "AGENTS2.md"), "# B\n");
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  test("lints multiple files and preserves the supplied filename", () => {
    const a = join(dir, "AGENTS.md");
    const b = join(dir, "AGENTS2.md");
    const results = lintAll([a, b]);
    expect(results.length).toBe(2);
    expect(results[0]!.file).toBe(a);
    expect(results[1]!.findings.some((f) => f.ruleId === "AMC-FILENAME")).toBe(
      true,
    );
  });
});
