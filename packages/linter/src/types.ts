/** Finding severity, in descending priority order. */
export const SEVERITIES = ["error", "warn", "info"] as const;
export type Severity = (typeof SEVERITIES)[number];

/** Letter grades, best to worst. */
export const GRADES = ["A", "B", "C", "D", "F"] as const;
export type Grade = (typeof GRADES)[number];

export function isSeverity(value: string): value is Severity {
  return (SEVERITIES as readonly string[]).includes(value);
}

/** A single linter finding. */
export interface Finding {
  /** Stable rule identifier, e.g. "AGM-001". */
  ruleId: string;
  severity: Severity;
  message: string;
  /** 1-based line, when locatable. */
  line?: number;
  /** 1-based column, when locatable. */
  column?: number;
  /** Human-readable remediation hint (advisory; not always auto-applied). */
  fix?: string;
}

/** Parsed AGENTS.md document model (defined in document.ts). */
export interface Document {
  raw: string;
  lines: string[];
  ast: unknown;
  frontmatter: Record<string, unknown> | null;
  frontmatterRaw: string | null;
  headings: DocumentHeading[];
  codeBlocks: DocumentCodeBlock[];
  commands: DocumentCommand[];
  /** Absolute or relative filename as supplied (e.g. "AGENTS.md", "pkg/AGENTS.md"). */
  filename: string;
  /** Total UTF-8 byte length of raw. */
  byteLength: number;
  /** Repo root, when running in repo-context (freshness) mode. */
  repoRoot: string | null;
}

export interface DocumentHeading {
  /** Heading depth 1-6. */
  depth: number;
  /** Plain-text heading content. */
  text: string;
  line: number;
}

export interface DocumentCodeBlock {
  /** Info-string language, lowercased, or "" if none. */
  lang: string;
  value: string;
  line: number;
}

export interface DocumentCommand {
  /** The command text. */
  text: string;
  /** True when found in a fenced block, false when inline code. */
  fenced: boolean;
  line: number;
}

/** Options shared by rules, scorer, and the orchestrators. */
export interface LintOptions {
  /** Repo root path; presence enables freshness rules. */
  root?: string;
  /** Per-rule config overrides keyed by rule id. */
  ruleConfig?: Record<string, Record<string, unknown>>;
  /** Treat warnings as errors for exit-code purposes. */
  strict?: boolean;
}

/** A lint rule. Rules are pure: they read the Document and return findings. */
export interface Rule {
  id: string;
  severity: Severity;
  /** Optional doc string for the rules table / README generation. */
  description?: string;
  /** True when the rule requires repo context (freshness). */
  requiresRepo?: boolean;
  check(doc: Document, config?: Record<string, unknown>): Finding[];
}

/** Result of linting a single file. */
export interface LintResult {
  file: string;
  findings: Finding[];
  score: number;
  grade: Grade;
}
