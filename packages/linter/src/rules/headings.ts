import type { Rule, Finding } from "../types.ts";

/**
 * AMC-HEADINGS: require at least one heading and forbid skipped heading
 * levels (e.g. H1 directly to H3), which harms machine + human scanning.
 */
export const headingsRule: Rule = {
  id: "AMC-HEADINGS",
  severity: "warn",
  description: "Require >= 1 heading and no skipped heading levels.",
  check(doc): Finding[] {
    const findings: Finding[] = [];
    if (doc.headings.length === 0) {
      findings.push({
        ruleId: "AMC-HEADINGS",
        severity: "warn",
        message:
          "Document has no headings. Use sections (e.g. ## Setup commands, ## Testing) so agents can navigate it.",
        line: 1,
        fix: "Add at least one ## section heading.",
      });
      return findings;
    }
    let prevDepth = doc.headings[0]!.depth;
    for (const h of doc.headings.slice(1)) {
      if (h.depth > prevDepth + 1) {
        findings.push({
          ruleId: "AMC-HEADINGS",
          severity: "warn",
          message: `Heading "${h.text}" skips from H${prevDepth} to H${h.depth}. Increase heading depth by one level at a time.`,
          line: h.line,
          fix: `Change "${h.text}" to an H${prevDepth + 1}.`,
        });
      }
      prevDepth = h.depth;
    }
    return findings;
  },
};
