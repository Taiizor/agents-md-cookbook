import type { Rule, Finding } from "../types.ts";

/** Sweet spot is ~100-150 lines; warn beyond this soft limit. */
export const SOFT_LINE_LIMIT = 150;
/** Gains reverse hard beyond ~300 lines; emit a heavier warning. */
export const HEAVY_LINE_LIMIT = 300;

function countLines(raw: string): number {
  const trimmed = raw.replace(/\n+$/, "");
  return trimmed.length === 0 ? 0 : trimmed.split("\n").length;
}

/**
 * AMC-LENGTH: warn over the soft 150-line budget; emit a stronger warning
 * over 300 lines, where evidence shows correctness gains reverse.
 */
export const lineBudgetRule: Rule = {
  id: "AMC-LENGTH",
  severity: "warn",
  description: `Keep files under ${SOFT_LINE_LIMIT} lines (hard warning over ${HEAVY_LINE_LIMIT}).`,
  check(doc, config): Finding[] {
    const soft = (config?.softLimit as number | undefined) ?? SOFT_LINE_LIMIT;
    const heavy = (config?.heavyLimit as number | undefined) ?? HEAVY_LINE_LIMIT;
    const lineCount = countLines(doc.raw);
    if (lineCount > heavy) {
      return [
        {
          ruleId: "AMC-LENGTH",
          severity: "warn",
          message: `File is ${lineCount} lines, well over ${heavy}. Beyond ~300 lines correctness gains reverse — split into nested files and link references.`,
          line: 1,
          fix: "Aggressively trim; move detail to nested AGENTS.md or linked docs.",
        },
      ];
    }
    if (lineCount > soft) {
      return [
        {
          ruleId: "AMC-LENGTH",
          severity: "warn",
          message: `File is ${lineCount} lines, over the ${soft}-line sweet spot. Trim toward 100-150 lines.`,
          line: 1,
          fix: "Remove inferable detail; point to linters/formatters instead of prose.",
        },
      ];
    }
    return [];
  },
};
