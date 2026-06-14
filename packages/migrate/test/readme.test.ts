import { test, expect, describe } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readme = readFileSync(join(import.meta.dir, "..", "README.md"), "utf8");

describe("package README", () => {
  test("documents the install/usage hook and command", () => {
    expect(readme).toContain("agents-md-migrate");
    expect(readme).toContain("bunx agents-md-migrate");
    expect(readme).toContain("npx agents-md-migrate");
  });

  test("includes a supported-formats table covering all six sources", () => {
    for (const f of [".cursorrules", "CLAUDE.md", ".windsurfrules", "copilot-instructions.md", ".clinerules", "CONVENTIONS.md"]) {
      expect(readme).toContain(f);
    }
  });

  test("explains the lossy-mapping caveats", () => {
    expect(readme.toLowerCase()).toContain("lossy");
    expect(readme).toContain("Applies to");
    expect(readme).toContain("Optional / on-demand rules");
  });
});
