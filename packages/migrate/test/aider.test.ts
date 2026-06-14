import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectAider, convertAider } from "../src/converters/aider";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "aider-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("aider converter", () => {
  test("CONVENTIONS.md becomes an always-on rule", () => {
    writeFileSync(join(dir, "CONVENTIONS.md"), "Use type hints everywhere.\n");
    expect(detectAider(dir)).toContain("CONVENTIONS.md");
    const r = convertAider(dir).find((x) => x.sourceFile === "CONVENTIONS.md")!;
    expect(r.scope?.mode).toBe("always");
    expect(r.body).toBe("Use type hints everywhere.");
  });

  test("resolves the read: list and inlines referenced files", () => {
    writeFileSync(join(dir, ".aider.conf.yml"), "read:\n  - guidelines.md\n");
    writeFileSync(join(dir, "guidelines.md"), "Keep PRs under 400 lines.\n");
    const bodies = convertAider(dir).map((r) => r.body).join("\n");
    expect(bodies).toContain("Keep PRs under 400 lines.");
  });

  test("maps lint/test/auto-test into a Build and test commands section", () => {
    writeFileSync(
      join(dir, ".aider.conf.yml"),
      "lint-cmd: ruff check .\ntest-cmd: pytest -q\nauto-test: true\nmodel: gpt-4o\n",
    );
    const cmdRule = convertAider(dir).find((r) => r.heading === "## Build and test commands")!;
    expect(cmdRule).toBeDefined();
    expect(cmdRule.body).toContain("ruff check .");
    expect(cmdRule.body).toContain("pytest -q");
    expect(cmdRule.body).toContain("Tests run automatically");
    expect(cmdRule.body).not.toContain("gpt-4o");
  });

  test("read: can be a single string", () => {
    writeFileSync(join(dir, ".aider.conf.yml"), "read: shared.md\n");
    writeFileSync(join(dir, "shared.md"), "Shared convention.\n");
    expect(convertAider(dir).map((r) => r.body).join("\n")).toContain("Shared convention.");
  });
});
