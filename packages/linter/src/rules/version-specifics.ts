import type { Rule, Finding } from "../types.ts";

/** Tools whose version often matters for reproducible agent runs. */
const VERSIONABLE_TOOLS = [
  "node",
  "bun",
  "deno",
  "python",
  "go",
  "rust",
  "java",
  "ruby",
  "php",
  "dotnet",
];

/** Matches a version number like 20, 20.11, 1.1.0, v18, ^5.6. */
const VERSION_PATTERN = /\b[v^~]?\d+(\.\d+){1,2}\b|\bnode\s*\d+\b|\b\d+\.x\b/i;

/**
 * AMC-VERSION: INFO when versionable tools are named but no version pin
 * appears anywhere. Naming a tool with its version improves reproducibility.
 */
export const versionSpecificsRule: Rule = {
  id: "AMC-VERSION",
  severity: "info",
  description: "Suggest pinning tool/runtime versions when tools are named.",
  check(doc): Finding[] {
    const lower = doc.raw.toLowerCase();
    const mentionsTool = VERSIONABLE_TOOLS.some((t) =>
      new RegExp(`\\b${t}\\b`).test(lower),
    );
    if (!mentionsTool) return [];
    if (VERSION_PATTERN.test(doc.raw)) return [];
    return [
      {
        ruleId: "AMC-VERSION",
        severity: "info",
        message:
          "Runtimes/tools are named without version pins. Add versions (e.g. Node 20.11, Bun 1.1) for reproducible agent runs.",
        line: 1,
        fix: "Add a stack-with-versions line or note in setup.",
      },
    ];
  },
};
