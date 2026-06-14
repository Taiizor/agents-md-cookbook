import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseDocument } from "../../src/document.ts";
import {
  referencedPathsRule,
  referencedScriptsRule,
  staleMarkersRule,
} from "../../src/rules/freshness.ts";

let repo: string;

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "amc-fresh-"));
  mkdirSync(join(repo, "src"));
  writeFileSync(join(repo, "src", "index.ts"), "export {};\n");
  writeFileSync(
    join(repo, "package.json"),
    JSON.stringify({ scripts: { test: "bun test", build: "bun build" } }),
  );
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe("AMC-PATH referenced paths exist", () => {
  test("no findings without repo context (standalone)", () => {
    const doc = parseDocument("See `src/missing.ts`.\n", {
      filename: "AGENTS.md",
    });
    expect(referencedPathsRule.check(doc)).toEqual([]);
  });

  test("passes when referenced path exists", () => {
    const doc = parseDocument("Entry: `src/index.ts`.\n", {
      filename: "AGENTS.md",
      root: repo,
    });
    expect(referencedPathsRule.check(doc)).toEqual([]);
  });

  test("errors when referenced path is missing", () => {
    const doc = parseDocument("Entry: `src/missing.ts`.\n", {
      filename: "AGENTS.md",
      root: repo,
    });
    const f = referencedPathsRule.check(doc);
    expect(f[0]!.ruleId).toBe("AMC-PATH");
    expect(f[0]!.severity).toBe("error");
  });
});

describe("AMC-SCRIPT referenced npm scripts exist", () => {
  test("passes for an existing script", () => {
    const doc = parseDocument("Run `npm run test`.\n", {
      filename: "AGENTS.md",
      root: repo,
    });
    expect(referencedScriptsRule.check(doc)).toEqual([]);
  });

  test("warns for a missing script", () => {
    const doc = parseDocument("Run `npm run nope`.\n", {
      filename: "AGENTS.md",
      root: repo,
    });
    const f = referencedScriptsRule.check(doc);
    expect(f[0]!.ruleId).toBe("AMC-SCRIPT");
    expect(f[0]!.severity).toBe("warn");
  });
});

describe("AMC-STALE markers", () => {
  test("info on TODO/FIXME", () => {
    const doc = parseDocument("# P\n\nTODO: finish this.\n", {
      filename: "AGENTS.md",
      root: repo,
    });
    const f = staleMarkersRule.check(doc);
    expect(f.some((x) => x.ruleId === "AMC-STALE")).toBe(true);
    expect(f[0]!.severity).toBe("info");
  });

  test("info on a stale year", () => {
    const doc = parseDocument("# P\n\nUpdated in 2019.\n", {
      filename: "AGENTS.md",
      root: repo,
    });
    const f = staleMarkersRule.check(doc);
    expect(f.some((x) => x.message.includes("2019"))).toBe(true);
  });
});
