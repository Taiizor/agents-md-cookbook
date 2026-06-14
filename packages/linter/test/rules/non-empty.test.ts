import { test, expect, describe } from "bun:test";
import { parseDocument } from "../../src/document.ts";
import { nonEmptyRule } from "../../src/rules/non-empty.ts";

describe("AMC-NONEMPTY", () => {
  test("passes when content is >= 100 non-whitespace chars", () => {
    const body = "# Project\n\n" + "This is a real instruction. ".repeat(6);
    const doc = parseDocument(body, { filename: "AGENTS.md" });
    expect(nonEmptyRule.check(doc)).toEqual([]);
  });

  test("warns on a near-empty stub (< 100 chars)", () => {
    const doc = parseDocument("# TODO\n", { filename: "AGENTS.md" });
    const f = nonEmptyRule.check(doc);
    expect(f.length).toBe(1);
    expect(f[0]!.ruleId).toBe("AMC-NONEMPTY");
    expect(f[0]!.severity).toBe("warn");
  });

  test("counts non-whitespace characters, not raw length", () => {
    const doc = parseDocument("#\n\n\n   \n\n\n", { filename: "AGENTS.md" });
    const f = nonEmptyRule.check(doc);
    expect(f.length).toBe(1);
  });
});
