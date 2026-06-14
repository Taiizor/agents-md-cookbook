import { readFileSync } from "node:fs";
import { parseDocument } from "./document.ts";
import { allRules } from "./rules/index.ts";
import { scoreDocument } from "./scoring.ts";
import type { Finding, LintResult, LintOptions } from "./types.ts";

export type {
  Severity,
  Grade,
  Finding,
  Rule,
  LintResult,
  LintOptions,
  Document,
  DocumentHeading,
  DocumentCodeBlock,
  DocumentCommand,
} from "./types.ts";
export { allRules, standaloneRules, freshnessRules } from "./rules/index.ts";
export { scoreDocument, gradeFor, WEIGHTS } from "./scoring.ts";
export { applyFixes } from "./fix.ts";
export { parseDocument } from "./document.ts";

/** Options for the single-string lint entry point. */
export interface LintContentOptions extends LintOptions {
  /** Filename to attribute to the content. Defaults to "AGENTS.md". */
  filename?: string;
}

/** Lint a single AGENTS.md content string. */
export function lint(content: string, options: LintContentOptions = {}): LintResult {
  const filename = options.filename ?? "AGENTS.md";
  const doc = parseDocument(content, {
    filename,
    ...(options.root !== undefined ? { root: options.root } : {}),
  });
  const findings: Finding[] = [];
  for (const rule of allRules) {
    if (rule.requiresRepo && !doc.repoRoot) continue;
    const config = options.ruleConfig?.[rule.id];
    findings.push(...rule.check(doc, config));
  }
  findings.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
  const { score, grade } = scoreDocument(doc, findings);
  return { file: filename, findings, score, grade };
}

/** Lint a list of file paths from disk. */
export function lintAll(paths: string[], options: LintOptions = {}): LintResult[] {
  return paths.map((path) => {
    const content = readFileSync(path, "utf8");
    const result = lint(content, { ...options, filename: path });
    return result;
  });
}
