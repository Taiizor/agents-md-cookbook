import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectCline, convertCline } from "../src/converters/cline";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cline-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("cline converter", () => {
  test("single .clinerules file becomes an always-on rule", () => {
    writeFileSync(join(dir, ".clinerules"), "Write small functions.\n");
    expect(detectCline(dir)).toEqual([".clinerules"]);
    const r = convertCline(dir)[0]!;
    expect(r.scope?.mode).toBe("always");
    expect(r.body).toBe("Write small functions.");
  });

  test(".clinerules/ dir preserves numeric-prefix sort", () => {
    mkdirSync(join(dir, ".clinerules"), { recursive: true });
    writeFileSync(join(dir, ".clinerules", "02-style.md"), "Second.\n");
    writeFileSync(join(dir, ".clinerules", "01-setup.md"), "First.\n");
    const rules = convertCline(dir);
    expect(rules.map((r) => r.body)).toEqual(["First.", "Second."]);
    expect(rules[0]!.order).toBe(1);
    expect(rules[1]!.order).toBe(2);
  });

  test("frontmatter paths (YAML array) maps to glob mode joined for prose", () => {
    mkdirSync(join(dir, ".clinerules"), { recursive: true });
    writeFileSync(
      join(dir, ".clinerules", "10-api.md"),
      "---\npaths:\n  - src/api/**\n  - lib/**\n---\nValidate inputs.\n",
    );
    const r = convertCline(dir)[0]!;
    expect(r.scope?.mode).toBe("glob");
    expect(r.scope?.globs).toEqual(["src/api/**", "lib/**"]);
  });

  test("file in dir without frontmatter is always-on", () => {
    mkdirSync(join(dir, ".clinerules"), { recursive: true });
    writeFileSync(join(dir, ".clinerules", "00-core.txt"), "Core rule.\n");
    expect(convertCline(dir)[0]!.scope?.mode).toBe("always");
  });
});
