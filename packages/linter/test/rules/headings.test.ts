import { test, expect, describe } from "bun:test";
import { parseDocument } from "../../src/document.ts";
import { headingsRule } from "../../src/rules/headings.ts";

describe("AMC-HEADINGS", () => {
  test("passes with a single H1 then H2s", () => {
    const doc = parseDocument("# Title\n\n## A\n\n## B\n", {
      filename: "AGENTS.md",
    });
    expect(headingsRule.check(doc)).toEqual([]);
  });

  test("warns when there are no headings", () => {
    const doc = parseDocument("Just prose, no headings.\n", {
      filename: "AGENTS.md",
    });
    const f = headingsRule.check(doc);
    expect(f.some((x) => x.message.includes("no headings"))).toBe(true);
    expect(f[0]!.ruleId).toBe("AMC-HEADINGS");
  });

  test("warns when a heading level is skipped (H1 -> H3)", () => {
    const doc = parseDocument("# Title\n\n### Deep\n", {
      filename: "AGENTS.md",
    });
    const f = headingsRule.check(doc);
    expect(f.some((x) => x.message.includes("skips"))).toBe(true);
  });

  test("does not flag descending back to a shallower level", () => {
    const doc = parseDocument("# T\n\n## A\n\n### A1\n\n## B\n", {
      filename: "AGENTS.md",
    });
    expect(headingsRule.check(doc)).toEqual([]);
  });
});
