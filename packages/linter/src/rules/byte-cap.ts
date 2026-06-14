import type { Rule, Finding } from "../types.ts";

/** Codex truncates AGENTS.md at 32 KiB by default. */
export const CODEX_BYTE_CAP = 32768;

/**
 * XP-007: error when the file exceeds the Codex byte cap (configurable via
 * { maxBytes }). Past the cap, Codex silently truncates the file.
 */
export const byteCapRule: Rule = {
  id: "XP-007",
  severity: "error",
  description: `Stay within the Codex ${CODEX_BYTE_CAP}-byte cap (configurable).`,
  check(doc, config): Finding[] {
    const maxBytes = (config?.maxBytes as number | undefined) ?? CODEX_BYTE_CAP;
    if (doc.byteLength <= maxBytes) return [];
    return [
      {
        ruleId: "XP-007",
        severity: "error",
        message: `File is ${doc.byteLength} bytes, over the ${maxBytes}-byte cap. Codex truncates past this; trim or split into nested AGENTS.md files.`,
        line: 1,
        fix: "Move package-specific detail into nested AGENTS.md files.",
      },
    ];
  },
};
