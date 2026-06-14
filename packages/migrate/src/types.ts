/** Known legacy AI-assistant rule formats this tool can convert. */
export enum SourceFormat {
  Cursor = "cursor",
  Claude = "claude",
  Windsurf = "windsurf",
  Copilot = "copilot",
  Cline = "cline",
  Aider = "aider",
}

/**
 * Activation/scoping mode normalized across formats.
 * - always: always-on, inline directly into the root body.
 * - glob:   conditionally active for matching files; degrade to prose or nested AGENTS.md.
 * - manual: on-demand / user-invoked; goes under "Optional / on-demand rules" or dropped.
 * - agent:  model/agent-requested ("when relevant"); rendered as a lead-in note.
 */
export type ScopeMode = "always" | "glob" | "manual" | "agent";

export interface Scope {
  mode: ScopeMode;
  /** Glob patterns the rule applies to (for mode "glob"). */
  globs?: string[];
  /** Human description, used for "> Rule:" / "> When relevant:" lead-ins. */
  description?: string;
  /** Agents this rule is explicitly excluded for (Copilot excludeAgent). */
  excludeAgent?: string[];
}

export interface ParsedRule {
  /** Markdown body of the rule (already import-resolved, no frontmatter). */
  body: string;
  /** Normalized scoping/activation metadata. Absent => treat as always-on. */
  scope?: Scope;
  /** Stable ordering hint within a source (e.g. numeric filename prefix). */
  order?: number;
  /** Path of the file this rule came from, relative to the scanned root. */
  sourceFile: string;
  /** Format this rule was parsed from. */
  format: SourceFormat;
  /** Optional heading to group this rule under in the output. */
  heading?: string;
}

export interface NestedFile {
  /** Path relative to root, e.g. "src/AGENTS.md". */
  path: string;
  content: string;
}

export interface ConversionResult {
  rootAgentsMd: string;
  nestedFiles: NestedFile[];
  /** Human-readable warnings for every lossy degradation. */
  warnings: string[];
}

export interface DetectedSource {
  format: SourceFormat;
  /** Source files (relative to root) that matched this format. */
  files: string[];
}

export interface ConvertOptions {
  /** Directory to scan. */
  root: string;
  /** Output filename for the root file (default "AGENTS.md"). */
  out?: string;
  /** Emit nested AGENTS.md for clean directory-prefix globs (default true). */
  nested?: boolean;
  /** Drop manual/on-demand rules entirely instead of an Optional section. */
  dropManual?: boolean;
  /** Restrict to a subset of formats. Empty/undefined => all. */
  only?: SourceFormat[];
}
