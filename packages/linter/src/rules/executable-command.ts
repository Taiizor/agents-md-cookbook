import type { Rule, Finding } from "../types.ts";

/**
 * AMC-CMD: require at least one runnable shell command. The single most
 * valuable AGENTS.md content is exact, copy-pasteable commands.
 */
export const executableCommandRule: Rule = {
  id: "AMC-CMD",
  severity: "warn",
  description: "Require >= 1 runnable shell command (with flags where relevant).",
  check(doc): Finding[] {
    if (doc.commands.length > 0) return [];
    return [
      {
        ruleId: "AMC-CMD",
        severity: "warn",
        message:
          "No runnable shell commands found. Add exact setup/test/build commands (e.g. `bun install`, `bun test`) — agents auto-execute these.",
        line: 1,
        fix: "Add a Setup/Testing section with fenced shell commands.",
      },
    ];
  },
};
