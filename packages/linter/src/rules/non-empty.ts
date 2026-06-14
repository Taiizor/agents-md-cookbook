import type { Rule, Finding } from "../types.ts";

/** Minimum non-whitespace character count below which a file is a stub. */
export const MIN_CONTENT_CHARS = 100;

/**
 * AMC-NONEMPTY: an AGENTS.md should carry real, non-inferable instructions.
 * Files under MIN_CONTENT_CHARS of non-whitespace content are stubs.
 */
export const nonEmptyRule: Rule = {
  id: "AMC-NONEMPTY",
  severity: "warn",
  description: `Flag stub files under ${MIN_CONTENT_CHARS} non-whitespace characters.`,
  check(doc): Finding[] {
    const contentChars = doc.raw.replace(/\s/g, "").length;
    if (contentChars >= MIN_CONTENT_CHARS) return [];
    return [
      {
        ruleId: "AMC-NONEMPTY",
        severity: "warn",
        message: `File is a near-empty stub (${contentChars} non-whitespace chars; expected >= ${MIN_CONTENT_CHARS}). Add real, non-inferable instructions.`,
        line: 1,
        fix: "Add setup/test commands, code style notes, and boundaries.",
      },
    ];
  },
};
