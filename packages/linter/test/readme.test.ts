import { test, expect, describe } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { allRules } from "../src/rules/index.ts";

const README = join(import.meta.dir, "..", "README.md");

describe("package README", () => {
  test("documents every shipped rule id", () => {
    const raw = readFileSync(README, "utf8");
    for (const rule of allRules) {
      expect(raw, `README must mention ${rule.id}`).toContain(rule.id);
    }
  });

  test("shows bunx and npx install/usage", () => {
    const raw = readFileSync(README, "utf8");
    expect(raw).toContain("bunx agents-md-lint");
    expect(raw).toContain("npx agents-md-lint");
  });

  test("documents the key CLI flags", () => {
    const raw = readFileSync(README, "utf8");
    for (const flag of ["--fix", "--format", "--max-warnings", "--strict", "--root"]) {
      expect(raw).toContain(flag);
    }
  });
});
