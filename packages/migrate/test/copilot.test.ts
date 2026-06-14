import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectCopilot, convertCopilot } from "../src/converters/copilot";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "copilot-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("copilot converter", () => {
  test("copilot-instructions.md becomes an always-on rule", () => {
    mkdirSync(join(dir, ".github"), { recursive: true });
    writeFileSync(join(dir, ".github", "copilot-instructions.md"), "Use conventional commits.\n");
    expect(detectCopilot(dir)).toContain(".github/copilot-instructions.md");
    const r = convertCopilot(dir).find((x) => x.sourceFile === ".github/copilot-instructions.md")!;
    expect(r.scope?.mode).toBe("always");
    expect(r.body).toBe("Use conventional commits.");
  });

  test("instructions file with applyTo ** maps to always", () => {
    mkdirSync(join(dir, ".github", "instructions"), { recursive: true });
    writeFileSync(
      join(dir, ".github", "instructions", "all.instructions.md"),
      "---\napplyTo: \"**\"\n---\nAlways add JSDoc.\n",
    );
    expect(convertCopilot(dir)[0]!.scope?.mode).toBe("always");
  });

  test("instructions file with a real glob maps to glob mode", () => {
    mkdirSync(join(dir, ".github", "instructions"), { recursive: true });
    writeFileSync(
      join(dir, ".github", "instructions", "ts.instructions.md"),
      "---\napplyTo: \"src/**, **/*.ts\"\ndescription: TS rules\n---\nNo any.\n",
    );
    const r = convertCopilot(dir)[0]!;
    expect(r.scope?.mode).toBe("glob");
    expect(r.scope?.globs).toEqual(["src/**", "**/*.ts"]);
    expect(r.scope?.description).toBe("TS rules");
  });

  test("excludeAgent is recorded on the scope", () => {
    mkdirSync(join(dir, ".github", "instructions"), { recursive: true });
    writeFileSync(
      join(dir, ".github", "instructions", "x.instructions.md"),
      "---\napplyTo: \"**\"\nexcludeAgent: code-review\n---\nNote.\n",
    );
    expect(convertCopilot(dir)[0]!.scope?.excludeAgent).toEqual(["code-review"]);
  });
});
