import { test, expect, describe } from "bun:test";
import { formatText, formatJson } from "../src/report.ts";
import type { LintResult } from "../src/types.ts";

const RESULTS: LintResult[] = [
  {
    file: "AGENTS.md",
    score: 72,
    grade: "C",
    findings: [
      { ruleId: "XP-007", severity: "error", message: "too big", line: 1 },
      { ruleId: "AMC-CMD", severity: "warn", message: "no commands" },
    ],
  },
];

describe("formatText", () => {
  test("includes file, findings, severities, and score line", () => {
    const out = formatText(RESULTS);
    expect(out).toContain("AGENTS.md");
    expect(out).toContain("error");
    expect(out).toContain("XP-007");
    expect(out).toContain("too big");
    expect(out).toContain("warn");
    expect(out).toContain("AMC-CMD");
    expect(out).toContain("72");
    expect(out).toContain("C");
  });

  test("shows a clean message when there are no findings", () => {
    const clean = formatText([
      { file: "AGENTS.md", score: 100, grade: "A", findings: [] },
    ]);
    expect(clean).toContain("0 problems");
  });

  test("renders line:column when present", () => {
    const out = formatText([
      {
        file: "AGENTS.md",
        score: 90,
        grade: "A",
        findings: [
          { ruleId: "AMC-SECRET", severity: "error", message: "x", line: 4, column: 2 },
        ],
      },
    ]);
    expect(out).toContain("4:2");
  });
});

describe("formatJson", () => {
  test("emits valid parseable JSON with summary", () => {
    const out = formatJson(RESULTS);
    const parsed = JSON.parse(out);
    expect(parsed.results[0].file).toBe("AGENTS.md");
    expect(parsed.summary.errors).toBe(1);
    expect(parsed.summary.warnings).toBe(1);
    expect(parsed.summary.files).toBe(1);
  });
});
