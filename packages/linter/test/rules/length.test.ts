import { test, expect, describe } from "bun:test";
import { parseDocument } from "../../src/document.ts";
import { byteCapRule, CODEX_BYTE_CAP } from "../../src/rules/byte-cap.ts";
import {
  windsurfCharsRule,
  WINDSURF_FILE_CHAR_CAP,
} from "../../src/rules/windsurf-chars.ts";
import {
  lineBudgetRule,
  SOFT_LINE_LIMIT,
  HEAVY_LINE_LIMIT,
} from "../../src/rules/line-budget.ts";

describe("XP-007 byte cap", () => {
  test("passes under the Codex 32 KiB cap", () => {
    const doc = parseDocument("# small\n", { filename: "AGENTS.md" });
    expect(byteCapRule.check(doc)).toEqual([]);
  });

  test("errors over the cap", () => {
    const big = "x".repeat(CODEX_BYTE_CAP + 1);
    const doc = parseDocument(big, { filename: "AGENTS.md" });
    const f = byteCapRule.check(doc);
    expect(f[0]!.ruleId).toBe("XP-007");
    expect(f[0]!.severity).toBe("error");
  });

  test("cap is configurable", () => {
    const doc = parseDocument("x".repeat(50), { filename: "AGENTS.md" });
    const f = byteCapRule.check(doc, { maxBytes: 10 });
    expect(f.length).toBe(1);
  });
});

describe("AGM-003 windsurf char cap", () => {
  test("warns over 6000 chars in a single file", () => {
    const doc = parseDocument("a".repeat(WINDSURF_FILE_CHAR_CAP + 1), {
      filename: "AGENTS.md",
    });
    const f = windsurfCharsRule.check(doc);
    expect(f[0]!.ruleId).toBe("AGM-003");
    expect(f[0]!.severity).toBe("warn");
  });

  test("passes under the cap", () => {
    const doc = parseDocument("a".repeat(100), { filename: "AGENTS.md" });
    expect(windsurfCharsRule.check(doc)).toEqual([]);
  });
});

describe("AMC-LENGTH line budgets", () => {
  test("passes under the soft limit", () => {
    const doc = parseDocument("x\n".repeat(50), { filename: "AGENTS.md" });
    expect(lineBudgetRule.check(doc)).toEqual([]);
  });

  test("warns over the soft limit", () => {
    const doc = parseDocument("x\n".repeat(SOFT_LINE_LIMIT + 5), {
      filename: "AGENTS.md",
    });
    const f = lineBudgetRule.check(doc);
    expect(f.length).toBe(1);
    expect(f[0]!.message).toContain("150");
  });

  test("emits a heavier warning over the heavy limit", () => {
    const doc = parseDocument("x\n".repeat(HEAVY_LINE_LIMIT + 5), {
      filename: "AGENTS.md",
    });
    const f = lineBudgetRule.check(doc);
    expect(f.length).toBe(1);
    expect(f[0]!.message).toContain("300");
  });
});
