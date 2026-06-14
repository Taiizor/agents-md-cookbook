import type { Rule, Finding } from "../types.ts";

/**
 * AGM-001: the file must parse as valid Markdown. mdast is permissive, so we
 * additionally detect the highest-signal structural breakage: an unterminated
 * fenced code block (odd number of fence lines).
 */
export const validMarkdownRule: Rule = {
  id: "AGM-001",
  severity: "error",
  description: "File must be valid CommonMark/GFM Markdown.",
  check(doc): Finding[] {
    const findings: Finding[] = [];
    const fenceLines = doc.lines.filter((l) => /^\s*(```|~~~)/.test(l));
    if (fenceLines.length % 2 !== 0) {
      const lastFenceIndex = doc.lines.findIndex((l) =>
        /^\s*(```|~~~)/.test(l),
      );
      const finding: Finding = {
        ruleId: "AGM-001",
        severity: "error",
        message:
          "Unterminated fenced code block: an opening ``` has no matching closing fence.",
        fix: "Add a closing ``` fence.",
      };
      if (lastFenceIndex >= 0) finding.line = lastFenceIndex + 1;
      findings.push(finding);
    }
    return findings;
  },
};
