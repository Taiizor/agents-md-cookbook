import type { Rule, Finding } from "../types.ts";

/** Windsurf reads at most 6,000 characters from a single rules file. */
export const WINDSURF_FILE_CHAR_CAP = 6000;

/**
 * AGM-003: warn when the file exceeds the per-file Windsurf char cap. The
 * 12,000-char total cap is enforced across files by the orchestrator.
 */
export const windsurfCharsRule: Rule = {
  id: "AGM-003",
  severity: "warn",
  description: `Stay within the Windsurf ${WINDSURF_FILE_CHAR_CAP}-char per-file cap.`,
  check(doc, config): Finding[] {
    const cap =
      (config?.maxChars as number | undefined) ?? WINDSURF_FILE_CHAR_CAP;
    if (doc.raw.length <= cap) return [];
    return [
      {
        ruleId: "AGM-003",
        severity: "warn",
        message: `File is ${doc.raw.length} chars, over the Windsurf ${cap}-char per-file cap. Windsurf ignores content past this.`,
        line: 1,
        fix: "Trim prose or split into nested AGENTS.md files.",
      },
    ];
  },
};
