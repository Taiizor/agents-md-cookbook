import type { Rule, Finding } from "../types.ts";

/** Canonical recommended section names (conventional, not required by spec). */
export const DEFAULT_REQUIRED_SECTIONS = [
  "Commands/Setup",
  "Testing",
  "Project Structure",
  "Code Style",
  "Git Workflow",
  "Boundaries",
] as const;

/** Lowercased keyword groups; a section matches if any keyword is a substring. */
const SECTION_SYNONYMS: Record<string, string[]> = {
  "Commands/Setup": ["setup", "commands", "dev environment", "getting started"],
  Testing: ["test", "testing"],
  "Project Structure": [
    "project structure",
    "structure",
    "architecture",
    "layout",
  ],
  "Code Style": ["code style", "style", "formatting", "lint"],
  "Git Workflow": ["git", "commit", "pr instructions", "pull request", "branch"],
  Boundaries: [
    "boundaries",
    "do not",
    "never",
    "always",
    "ask first",
    "constraints",
  ],
};

const BOUNDARY_TIERS = [
  { name: "always-do", keywords: ["always", "do:"] },
  { name: "ask-first", keywords: ["ask first", "ask-first", "ask before"] },
  { name: "never-do", keywords: ["never", "do not", "don't"] },
];

function headingMatches(headingsLower: string[], keywords: string[]): boolean {
  return headingsLower.some((h) => keywords.some((k) => h.includes(k)));
}

/**
 * AGM-002: warn for each missing recommended section, and emit an INFO when a
 * Boundaries section exists but does not express all three tiers.
 */
export const recommendedSectionsRule: Rule = {
  id: "AGM-002",
  severity: "warn",
  description:
    "Recommended sections (Setup, Testing, Structure, Code Style, Git, Boundaries) should be present.",
  check(doc, config): Finding[] {
    const required =
      (config?.required as string[] | undefined) ??
      [...DEFAULT_REQUIRED_SECTIONS];
    const headingsLower = doc.headings.map((h) => h.text.toLowerCase());
    const findings: Finding[] = [];

    for (const section of required) {
      const keywords = SECTION_SYNONYMS[section] ?? [section.toLowerCase()];
      if (!headingMatches(headingsLower, keywords)) {
        findings.push({
          ruleId: "AGM-002",
          severity: "warn",
          message: `Missing recommended "${section}" section.`,
          line: 1,
          fix: `Add a "## ${section}" section.`,
        });
      }
    }

    // Three-tier boundaries suggestion (INFO).
    const hasBoundaries = headingMatches(
      headingsLower,
      SECTION_SYNONYMS["Boundaries"]!,
    );
    if (hasBoundaries) {
      const bodyLower = doc.raw.toLowerCase();
      const presentTiers = BOUNDARY_TIERS.filter((t) =>
        t.keywords.some((k) => bodyLower.includes(k)),
      );
      if (presentTiers.length < 3) {
        findings.push({
          ruleId: "AGM-002",
          severity: "info",
          message:
            "Consider a three-tier Boundaries section: always-do, ask-first, and never-do. Pair each never-do with a positive do.",
          line: 1,
          fix: "Group boundaries under always-do / ask-first / never-do.",
        });
      }
    }

    return findings;
  },
};
