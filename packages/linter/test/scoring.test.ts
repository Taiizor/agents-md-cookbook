import { test, expect, describe } from "bun:test";
import { parseDocument } from "../src/document.ts";
import { allRules } from "../src/rules/index.ts";
import { scoreDocument, gradeFor, WEIGHTS } from "../src/scoring.ts";
import type { Finding } from "../src/types.ts";

function runRules(content: string): Finding[] {
  const doc = parseDocument(content, { filename: "AGENTS.md" });
  return allRules.flatMap((r) => r.check(doc));
}

const GOOD = `# Project Overview

Small TS service. Node 20.11, Bun 1.1.

## Setup commands
\`\`\`bash
bun install --frozen-lockfile
\`\`\`

## Build and test commands
\`\`\`bash
bun test
bun run build
\`\`\`

## Code style
Formatted by prettier; run \`bun run lint\`.

## Git workflow
Conventional commits; open a PR to develop.

## Boundaries
- Always: run \`bun test\` before pushing.
- Ask first: changing the DB schema.
- Never: commit secrets — use env vars instead.

See \`README.md\` for more.
`;

describe("scoring", () => {
  test("gradeFor maps score bands to letters", () => {
    expect(gradeFor(95)).toBe("A");
    expect(gradeFor(82)).toBe("B");
    expect(gradeFor(72)).toBe("C");
    expect(gradeFor(61)).toBe("D");
    expect(gradeFor(40)).toBe("F");
  });

  test("a strong file scores high (A or B)", () => {
    const doc = parseDocument(GOOD, { filename: "AGENTS.md" });
    const findings = allRules.flatMap((r) => r.check(doc));
    const { score, grade } = scoreDocument(doc, findings);
    expect(score).toBeGreaterThanOrEqual(80);
    expect(["A", "B"]).toContain(grade);
  });

  test("a stub scores low (D or F)", () => {
    const doc = parseDocument("# TODO\n", { filename: "AGENTS.md" });
    const findings = allRules.flatMap((r) => r.check(doc));
    const { score, grade } = scoreDocument(doc, findings);
    expect(score).toBeLessThan(65);
    expect(["D", "F"]).toContain(grade);
  });

  test("score is clamped to 0..100", () => {
    const doc = parseDocument("write clean code\n".repeat(40), {
      filename: "AGENTS.md",
    });
    const findings = allRules.flatMap((r) => r.check(doc));
    const { score } = scoreDocument(doc, findings);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test("WEIGHTS constants are explicit numbers", () => {
    expect(typeof WEIGHTS.errorPenalty).toBe("number");
    expect(typeof WEIGHTS.hasBuildAndTest).toBe("number");
    expect(WEIGHTS.base).toBe(100);
  });

  test("a platitude lowers the score versus a clean equivalent", () => {
    const clean = runRules(GOOD);
    const docClean = parseDocument(GOOD, { filename: "AGENTS.md" });
    const cleanScore = scoreDocument(docClean, clean).score;

    const withPlatitude = GOOD + "\nWrite clean code and be helpful.\n";
    const docBad = parseDocument(withPlatitude, { filename: "AGENTS.md" });
    const badScore = scoreDocument(
      docBad,
      allRules.flatMap((r) => r.check(docBad)),
    ).score;

    expect(badScore).toBeLessThan(cleanScore);
  });
});
