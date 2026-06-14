import { test, expect, describe } from "bun:test";
import {
  SEVERITIES,
  GRADES,
  isSeverity,
  type Finding,
  type Rule,
  type LintResult,
} from "../src/types.ts";

describe("types", () => {
  test("SEVERITIES lists the three severities in priority order", () => {
    expect(SEVERITIES).toEqual(["error", "warn", "info"]);
  });

  test("GRADES lists letter grades from best to worst", () => {
    expect(GRADES).toEqual(["A", "B", "C", "D", "F"]);
  });

  test("isSeverity narrows valid strings", () => {
    expect(isSeverity("error")).toBe(true);
    expect(isSeverity("warn")).toBe(true);
    expect(isSeverity("info")).toBe(true);
    expect(isSeverity("fatal")).toBe(false);
  });

  test("a Finding is structurally valid", () => {
    const f: Finding = {
      ruleId: "AGM-001",
      severity: "error",
      message: "boom",
      line: 1,
      column: 2,
      fix: "do x",
    };
    expect(f.ruleId).toBe("AGM-001");
    expect(f.severity).toBe("error");
  });

  test("a Rule and LintResult are structurally valid", () => {
    const rule: Rule = {
      id: "AGM-001",
      severity: "error",
      check: () => [],
    };
    const result: LintResult = {
      file: "AGENTS.md",
      findings: [],
      score: 100,
      grade: "A",
    };
    expect(rule.check({} as never)).toEqual([]);
    expect(result.grade).toBe("A");
  });
});
