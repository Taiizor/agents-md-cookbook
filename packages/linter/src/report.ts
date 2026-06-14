import type { LintResult, Finding } from "./types.ts";

function severityTag(s: Finding["severity"]): string {
  return s.padEnd(5, " ");
}

function location(f: Finding): string {
  if (f.line && f.column) return `${f.line}:${f.column}`;
  if (f.line) return `${f.line}`;
  return "-";
}

export interface ReportSummary {
  files: number;
  errors: number;
  warnings: number;
  infos: number;
}

export function summarize(results: LintResult[]): ReportSummary {
  let errors = 0;
  let warnings = 0;
  let infos = 0;
  for (const r of results) {
    for (const f of r.findings) {
      if (f.severity === "error") errors++;
      else if (f.severity === "warn") warnings++;
      else infos++;
    }
  }
  return { files: results.length, errors, warnings, infos };
}

/** Human-readable text report. */
export function formatText(results: LintResult[]): string {
  const out: string[] = [];
  for (const r of results) {
    out.push(`\n${r.file}  [score ${r.score}/100, grade ${r.grade}]`);
    if (r.findings.length === 0) {
      out.push("  0 problems");
      continue;
    }
    for (const f of r.findings) {
      out.push(
        `  ${location(f).padStart(6, " ")}  ${severityTag(f.severity)}  ${f.ruleId.padEnd(15, " ")}  ${f.message}`,
      );
    }
  }
  const s = summarize(results);
  out.push(
    `\n${s.files} file(s): ${s.errors} error(s), ${s.warnings} warning(s), ${s.infos} info.`,
  );
  return out.join("\n");
}

/** Machine-readable JSON report. */
export function formatJson(results: LintResult[]): string {
  return JSON.stringify(
    { results, summary: summarize(results) },
    null,
    2,
  );
}
