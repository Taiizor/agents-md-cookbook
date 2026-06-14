import { existsSync, readFileSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import type { Rule, Finding } from "../types.ts";

/** Years older than this (relative to a fixed baseline) are flagged as stale. */
export const STALE_YEAR_BEFORE = 2024;

/** Matches inline-code path-like tokens (contain a slash or a dotted file). */
const PATHLIKE = /^[\w.@\-]+(?:\/[\w.@\-]+)+\/?$|^[\w\-]+\.[a-z0-9]{1,6}$/i;

function inlineCodeTokens(doc: { commands: { text: string }[]; raw: string }): string[] {
  const tokens = new Set<string>();
  const re = /`([^`\n]+)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(doc.raw)) !== null) {
    tokens.add(m[1]!.trim());
  }
  return [...tokens];
}

/**
 * AMC-PATH: error when a referenced repo path does not exist. Runs only in
 * repo-context mode (doc.repoRoot set); standalone mode returns nothing.
 */
export const referencedPathsRule: Rule = {
  id: "AMC-PATH",
  severity: "error",
  requiresRepo: true,
  description: "Referenced repo paths must exist (repo-context mode only).",
  check(doc): Finding[] {
    if (!doc.repoRoot) return [];
    const findings: Finding[] = [];
    for (const token of inlineCodeTokens(doc)) {
      const candidate = token.replace(/^\.\//, "");
      if (!PATHLIKE.test(candidate)) continue;
      if (candidate.includes(" ")) continue;
      const abs = isAbsolute(candidate)
        ? candidate
        : join(doc.repoRoot, candidate);
      if (!existsSync(abs)) {
        const line = doc.raw.slice(0, doc.raw.indexOf(token)).split("\n").length;
        findings.push({
          ruleId: "AMC-PATH",
          severity: "error",
          message: `Referenced path \`${token}\` does not exist in the repo.`,
          line,
          fix: "Fix the path or remove the stale reference.",
        });
      }
    }
    return findings;
  },
};

/**
 * AMC-SCRIPT: warn when a referenced `npm/bun/pnpm/yarn run <script>` is not in
 * the repo's package.json. Repo-context mode only.
 */
export const referencedScriptsRule: Rule = {
  id: "AMC-SCRIPT",
  severity: "warn",
  requiresRepo: true,
  description:
    "Referenced package.json scripts must exist (repo-context mode only).",
  check(doc): Finding[] {
    if (!doc.repoRoot) return [];
    const pkgPath = join(doc.repoRoot, "package.json");
    if (!existsSync(pkgPath)) return [];
    let scripts: Record<string, unknown> = {};
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      scripts = (pkg.scripts as Record<string, unknown>) ?? {};
    } catch {
      return [];
    }
    const findings: Finding[] = [];
    const re = /\b(?:npm|bun|pnpm|yarn)\s+run\s+([\w:-]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(doc.raw)) !== null) {
      const script = m[1]!;
      if (!(script in scripts)) {
        const line = doc.raw.slice(0, m.index).split("\n").length;
        findings.push({
          ruleId: "AMC-SCRIPT",
          severity: "warn",
          message: `Referenced script "${script}" is not defined in package.json.`,
          line,
          fix: "Add the script to package.json or fix the reference.",
        });
      }
    }
    return findings;
  },
};

/**
 * AMC-STALE: INFO for TODO/FIXME markers and for years older than
 * STALE_YEAR_BEFORE. Repo-context mode only.
 */
export const staleMarkersRule: Rule = {
  id: "AMC-STALE",
  severity: "info",
  requiresRepo: true,
  description:
    "Flag TODO/FIXME markers and stale years (repo-context mode only).",
  check(doc): Finding[] {
    if (!doc.repoRoot) return [];
    const findings: Finding[] = [];
    doc.lines.forEach((lineText, idx) => {
      if (/\b(TODO|FIXME)\b/.test(lineText)) {
        findings.push({
          ruleId: "AMC-STALE",
          severity: "info",
          message: "TODO/FIXME marker in AGENTS.md — resolve or remove before relying on it.",
          line: idx + 1,
        });
      }
      const yearMatch = lineText.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        const year = Number(yearMatch[0]);
        if (year < STALE_YEAR_BEFORE) {
          findings.push({
            ruleId: "AMC-STALE",
            severity: "info",
            message: `Possibly stale year "${year}". Confirm the document is current.`,
            line: idx + 1,
          });
        }
      }
    });
    return findings;
  },
};
