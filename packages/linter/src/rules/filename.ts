import type { Rule, Finding } from "../types.ts";

/** Extract the basename from a path using either separator. */
function basename(p: string): string {
  const parts = p.split(/[\\/]/);
  return parts[parts.length - 1] ?? p;
}

/**
 * AMC-FILENAME: the file must be named exactly "AGENTS.md"
 * (uppercase AGENTS, lowercase .md). This is a hard requirement of the spec.
 */
export const filenameRule: Rule = {
  id: "AMC-FILENAME",
  severity: "error",
  description: 'File must be named exactly "AGENTS.md".',
  check(doc): Finding[] {
    const name = basename(doc.filename);
    if (name === "AGENTS.md") return [];
    return [
      {
        ruleId: "AMC-FILENAME",
        severity: "error",
        message: `Filename must be exactly "AGENTS.md" (got "${name}"). Tools only auto-load the exact casing.`,
        line: 1,
        fix: 'Rename the file to "AGENTS.md".',
      },
    ];
  },
};
