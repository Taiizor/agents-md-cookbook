import type { Rule, Finding } from "../types.ts";

/** Suggested max length for the optional v1.1 description field. */
export const MAX_DESCRIPTION_CHARS = 200;

/**
 * AMC-FRONTMATTER: frontmatter is OPTIONAL (draft v1.1). When present, lightly
 * validate the two known keys (description: string <200, tags: string[]).
 * Unknown keys are ignored for forward-compatibility and never error.
 */
export const frontmatterRule: Rule = {
  id: "AMC-FRONTMATTER",
  severity: "warn",
  description:
    "Validate optional v1.1 frontmatter (description, tags); ignore unknown keys.",
  check(doc): Finding[] {
    const fm = doc.frontmatter;
    if (fm === null) return [];
    const findings: Finding[] = [];

    if ("description" in fm) {
      const d = fm["description"];
      if (typeof d !== "string") {
        findings.push({
          ruleId: "AMC-FRONTMATTER",
          severity: "warn",
          message: "Frontmatter `description` should be a string.",
          line: 1,
          fix: "Set description to a single short string.",
        });
      } else if (d.length > MAX_DESCRIPTION_CHARS) {
        findings.push({
          ruleId: "AMC-FRONTMATTER",
          severity: "warn",
          message: `Frontmatter \`description\` is ${d.length} chars; keep it under ${MAX_DESCRIPTION_CHARS}.`,
          line: 1,
          fix: "Shorten the description.",
        });
      }
    }

    if ("tags" in fm) {
      const t = fm["tags"];
      const isStringArray =
        Array.isArray(t) && t.every((x) => typeof x === "string");
      if (!isStringArray) {
        findings.push({
          ruleId: "AMC-FRONTMATTER",
          severity: "warn",
          message: "Frontmatter `tags` should be an array of strings.",
          line: 1,
          fix: "Use a YAML list of string tags.",
        });
      }
    }

    return findings;
  },
};
