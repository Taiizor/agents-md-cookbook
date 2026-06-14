import { test, expect, describe } from "bun:test";
import {
  allRules,
  standaloneRules,
  freshnessRules,
} from "../../src/rules/index.ts";

describe("rule registry", () => {
  test("exposes every implemented rule once", () => {
    const ids = allRules.map((r) => r.id).sort();
    expect(ids).toEqual(
      [
        "AGM-001",
        "AGM-002",
        "AGM-003",
        "AMC-CMD",
        "AMC-DONTS",
        "AMC-FILENAME",
        "AMC-FRONTMATTER",
        "AMC-HEADINGS",
        "AMC-LENGTH",
        "AMC-NONEMPTY",
        "AMC-PATH",
        "AMC-PLATITUDE",
        "AMC-SCRIPT",
        "AMC-SECRET",
        "AMC-STALE",
        "AMC-VERSION",
        "XP-007",
      ].sort(),
    );
  });

  test("rule ids are unique", () => {
    const ids = allRules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("freshnessRules are exactly the requiresRepo rules", () => {
    expect(freshnessRules.every((r) => r.requiresRepo === true)).toBe(true);
    expect(freshnessRules.map((r) => r.id).sort()).toEqual([
      "AMC-PATH",
      "AMC-SCRIPT",
      "AMC-STALE",
    ]);
  });

  test("standaloneRules excludes all freshness rules", () => {
    expect(standaloneRules.some((r) => r.requiresRepo)).toBe(false);
    expect(standaloneRules.length + freshnessRules.length).toBe(
      allRules.length,
    );
  });
});
