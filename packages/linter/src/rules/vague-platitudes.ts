import type { Rule, Finding } from "../types.ts";

/** High-signal vague platitudes that waste tokens without informing the agent. */
export const PLATITUDES = [
  "write clean code",
  "follow best practices",
  "use good naming",
  "be helpful",
  "helpful coding assistant",
  "write maintainable code",
  "follow industry standards",
  "use proper error handling",
  "write readable code",
  "be professional",
];

/**
 * AMC-PLATITUDE: warn for each vague platitude. Frontier models already do
 * these; spelling them out wastes the budget on inferable instructions.
 */
export const vaguePlatitudesRule: Rule = {
  id: "AMC-PLATITUDE",
  severity: "warn",
  description: "Flag vague platitudes that waste budget on inferable advice.",
  check(doc): Finding[] {
    const lower = doc.raw.toLowerCase();
    const findings: Finding[] = [];
    for (const phrase of PLATITUDES) {
      const idx = lower.indexOf(phrase);
      if (idx !== -1) {
        const line = doc.raw.slice(0, idx).split("\n").length;
        findings.push({
          ruleId: "AMC-PLATITUDE",
          severity: "warn",
          message: `Vague platitude "${phrase}". Replace with a concrete, non-inferable instruction or remove it.`,
          line,
          fix: `Remove "${phrase}" or replace with a specific command/rule.`,
        });
      }
    }
    return findings;
  },
};
