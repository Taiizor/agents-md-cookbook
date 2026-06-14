import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectClaude, convertClaude } from "../src/converters/claude";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "claude-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("claude converter", () => {
  test("root CLAUDE.md becomes an always-on rule", () => {
    writeFileSync(join(dir, "CLAUDE.md"), "# Project\n\nRun bun test before commits.\n");
    expect(detectClaude(dir)).toContain("CLAUDE.md");
    const rules = convertClaude(dir);
    const root = rules.find((r) => r.sourceFile === "CLAUDE.md")!;
    expect(root.scope?.mode).toBe("always");
    expect(root.body).toContain("Run bun test before commits.");
  });

  test("resolves @path imports by inlining the referenced file", () => {
    writeFileSync(join(dir, "CLAUDE.md"), "Style rules:\n\n@docs/style.md\n");
    mkdirSync(join(dir, "docs"), { recursive: true });
    writeFileSync(join(dir, "docs", "style.md"), "Use tabs, not spaces.\n");
    const rules = convertClaude(dir);
    const root = rules.find((r) => r.sourceFile === "CLAUDE.md")!;
    expect(root.body).toContain("Use tabs, not spaces.");
    expect(root.body).not.toContain("@docs/style.md");
  });

  test("does not resolve @path references inside fenced code blocks", () => {
    writeFileSync(
      join(dir, "CLAUDE.md"),
      "Example:\n\n```\n@docs/style.md\n```\n",
    );
    mkdirSync(join(dir, "docs"), { recursive: true });
    writeFileSync(join(dir, "docs", "style.md"), "SHOULD NOT APPEAR.\n");
    const rules = convertClaude(dir);
    const root = rules.find((r) => r.sourceFile === "CLAUDE.md")!;
    expect(root.body).toContain("@docs/style.md");
    expect(root.body).not.toContain("SHOULD NOT APPEAR.");
  });

  test("subdir CLAUDE.md becomes a glob-scoped rule for nesting", () => {
    mkdirSync(join(dir, "frontend"), { recursive: true });
    writeFileSync(join(dir, "frontend", "CLAUDE.md"), "Use React function components.\n");
    const rules = convertClaude(dir);
    const sub = rules.find((r) => r.sourceFile === "frontend/CLAUDE.md")!;
    expect(sub.scope?.mode).toBe("glob");
    expect(sub.scope?.globs).toEqual(["frontend/**"]);
  });

  test("concatenates .claude/rules/* files", () => {
    mkdirSync(join(dir, ".claude", "rules"), { recursive: true });
    writeFileSync(join(dir, ".claude", "rules", "a.md"), "Rule A.\n");
    writeFileSync(join(dir, ".claude", "rules", "b.md"), "Rule B.\n");
    const rules = convertClaude(dir);
    const bodies = rules.map((r) => r.body).join("\n");
    expect(bodies).toContain("Rule A.");
    expect(bodies).toContain("Rule B.");
  });

  test("excludes CLAUDE.local.md (personal file)", () => {
    writeFileSync(join(dir, "CLAUDE.md"), "Shared rules.\n");
    writeFileSync(join(dir, "CLAUDE.local.md"), "MY SECRET LOCAL RULE.\n");
    expect(detectClaude(dir)).not.toContain("CLAUDE.local.md");
    const rules = convertClaude(dir);
    expect(rules.map((r) => r.body).join("\n")).not.toContain("MY SECRET LOCAL RULE.");
  });
});
