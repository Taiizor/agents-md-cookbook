import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectCursor, convertCursor } from "../src/converters/cursor";
import { SourceFormat } from "../src/types";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cursor-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("cursor converter", () => {
  test("legacy .cursorrules becomes a single always-on rule", () => {
    writeFileSync(join(dir, ".cursorrules"), "Always use 2-space indentation.\n");
    expect(detectCursor(dir)).toEqual([".cursorrules"]);
    const rules = convertCursor(dir);
    expect(rules).toHaveLength(1);
    expect(rules[0]!.body).toBe("Always use 2-space indentation.");
    expect(rules[0]!.scope?.mode).toBe("always");
    expect(rules[0]!.format).toBe(SourceFormat.Cursor);
  });

  test(".mdc with alwaysApply true maps to always-on", () => {
    mkdirSync(join(dir, ".cursor", "rules"), { recursive: true });
    writeFileSync(
      join(dir, ".cursor", "rules", "style.mdc"),
      "---\ndescription: Style guide\nalwaysApply: true\n---\nUse named exports.\n",
    );
    const rules = convertCursor(dir);
    expect(rules).toHaveLength(1);
    expect(rules[0]!.scope?.mode).toBe("always");
    expect(rules[0]!.body).toBe("Use named exports.");
  });

  test(".mdc with comma-separated globs maps to glob mode (split on comma, not YAML)", () => {
    mkdirSync(join(dir, ".cursor", "rules"), { recursive: true });
    writeFileSync(
      join(dir, ".cursor", "rules", "api.mdc"),
      "---\ndescription: API rules\nglobs: src/api/**, **/*.controller.ts\nalwaysApply: false\n---\nValidate all inputs.\n",
    );
    const rules = convertCursor(dir);
    expect(rules).toHaveLength(1);
    expect(rules[0]!.scope?.mode).toBe("glob");
    expect(rules[0]!.scope?.globs).toEqual(["src/api/**", "**/*.controller.ts"]);
    expect(rules[0]!.scope?.description).toBe("API rules");
  });

  test(".mdc with no globs and no alwaysApply maps to manual", () => {
    mkdirSync(join(dir, ".cursor", "rules"), { recursive: true });
    writeFileSync(
      join(dir, ".cursor", "rules", "release.mdc"),
      "---\ndescription: Release steps\n---\nTag and publish.\n",
    );
    const rules = convertCursor(dir);
    expect(rules[0]!.scope?.mode).toBe("manual");
  });

  test("returns no rules when no cursor files exist", () => {
    expect(detectCursor(dir)).toEqual([]);
    expect(convertCursor(dir)).toEqual([]);
  });
});
