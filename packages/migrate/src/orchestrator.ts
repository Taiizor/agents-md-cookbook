import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  SourceFormat,
  type ConversionResult,
  type ConvertOptions,
  type DetectedSource,
  type ParsedRule,
} from "./types";
import { rulesToMarkdown } from "./rules";
import { detectCursor, convertCursor } from "./converters/cursor";
import { detectClaude, convertClaude } from "./converters/claude";
import { detectWindsurf, convertWindsurf } from "./converters/windsurf";
import { detectCopilot, convertCopilot } from "./converters/copilot";
import { detectCline, convertCline } from "./converters/cline";
import { detectAider, convertAider } from "./converters/aider";
import { mergeSections } from "./merge";

interface FormatHandler {
  format: SourceFormat;
  detect: (root: string) => string[];
  convert: (root: string) => ParsedRule[];
}

const HANDLERS: FormatHandler[] = [
  { format: SourceFormat.Cursor, detect: detectCursor, convert: convertCursor },
  { format: SourceFormat.Claude, detect: detectClaude, convert: convertClaude },
  { format: SourceFormat.Windsurf, detect: detectWindsurf, convert: convertWindsurf },
  { format: SourceFormat.Copilot, detect: detectCopilot, convert: convertCopilot },
  { format: SourceFormat.Cline, detect: detectCline, convert: convertCline },
  { format: SourceFormat.Aider, detect: detectAider, convert: convertAider },
];

/** Scan a directory and report which known formats are present. */
export function detect(root: string): DetectedSource[] {
  if (!existsSync(root)) return [];
  const out: DetectedSource[] = [];
  for (const h of HANDLERS) {
    const files = h.detect(root);
    if (files.length > 0) out.push({ format: h.format, files });
  }
  return out;
}

/** Convert all matching sources in `root` into a ConversionResult (non-idempotent core). */
export function convert(options: ConvertOptions): ConversionResult {
  const { root, only, nested = true, dropManual = false } = options;
  const allow = only && only.length > 0 ? new Set(only) : null;

  const rules: ParsedRule[] = [];
  for (const h of HANDLERS) {
    if (allow && !allow.has(h.format)) continue;
    rules.push(...h.convert(root));
  }

  const { rootBody, nestedFiles, warnings } = rulesToMarkdown(rules, { nested, dropManual });

  const generated =
    rootBody.trim() === "" ? "# AGENTS.md\n" : `# AGENTS.md\n\n${rootBody.trim()}\n`;

  const outName = options.out ?? "AGENTS.md";
  const existingPath = join(root, outName);
  let rootAgentsMd = generated;
  if (existsSync(existingPath)) {
    const existing = readFileSync(existingPath, "utf8");
    rootAgentsMd = mergeSections(existing, rootBody.trim() === "" ? "" : `${rootBody.trim()}\n`);
  }

  return { rootAgentsMd, nestedFiles, warnings };
}
