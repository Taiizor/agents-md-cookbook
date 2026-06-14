#!/usr/bin/env node
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  type Dirent,
} from "node:fs";
import { sep } from "node:path";
import { pathToFileURL } from "node:url";
import { lint } from "./index.ts";
import { applyFixes } from "./fix.ts";
import { formatText, formatJson, summarize } from "./report.ts";
import type { LintResult } from "./types.ts";

interface ParsedArgs {
  files: string[];
  fix: boolean;
  format: "text" | "json";
  maxWarnings: number | null;
  strict: boolean;
  quiet: boolean;
  root: string | null;
  help: boolean;
}

const HELP = `agents-md-lint — lint your AGENTS.md

Usage:
  agents-md-lint [files-or-globs...] [options]

Options:
  --fix                 Apply safe high-confidence autofixes in place.
  --format <text|json>  Output format (default: text).
  --max-warnings <n>    Fail if warnings exceed n.
  --strict              Treat warnings as errors for the exit code.
  --quiet               Hide info-level findings.
  --root <path>         Repo root; enables freshness rules (path/script checks).
  --help                Show this help.

Default file: ./AGENTS.md
Exit codes: 0 = clean, 1 = errors / over --max-warnings / warnings under --strict.
`;

export function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    files: [],
    fix: false,
    format: "text",
    maxWarnings: null,
    strict: false,
    quiet: false,
    root: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    switch (arg) {
      case "--fix":
        parsed.fix = true;
        break;
      case "--strict":
        parsed.strict = true;
        break;
      case "--quiet":
        parsed.quiet = true;
        break;
      case "--help":
      case "-h":
        parsed.help = true;
        break;
      case "--format":
        parsed.format = argv[++i] === "json" ? "json" : "text";
        break;
      case "--max-warnings":
        parsed.maxWarnings = Number(argv[++i]);
        break;
      case "--root":
        parsed.root = argv[++i] ?? null;
        break;
      default:
        if (!arg.startsWith("--")) parsed.files.push(arg);
        break;
    }
  }
  if (parsed.files.length === 0) parsed.files.push("./AGENTS.md");
  return parsed;
}

/** Translate a glob pattern into a RegExp (supports *, ?, **, character classes). */
function globToRegExp(pattern: string): RegExp {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]!;
    if (c === "*") {
      if (pattern[i + 1] === "*") {
        // ** matches across path separators
        re += ".*";
        i++;
        if (pattern[i + 1] === "/") i++;
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else if (c === "[") {
      let j = i + 1;
      let cls = "[";
      if (pattern[j] === "!") {
        cls += "^";
        j++;
      }
      while (j < pattern.length && pattern[j] !== "]") {
        cls += pattern[j];
        j++;
      }
      cls += "]";
      re += cls;
      i = j;
    } else if (/[.+^${}()|\\]/.test(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return new RegExp("^" + re + "$");
}

/** Recursively collect files under `dir`, returning POSIX-style relative paths. */
function walk(dir: string, base: string, acc: string[]): void {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const abs = dir === "." ? entry.name : `${dir}${sep}${entry.name}`;
    const rel = base === "" ? entry.name : `${base}/${entry.name}`;
    if (entry.isDirectory()) {
      walk(abs, rel, acc);
    } else if (entry.isFile()) {
      acc.push(rel);
    }
  }
}

function expandGlobs(patterns: string[]): string[] {
  const out = new Set<string>();
  let allFiles: string[] | null = null;
  for (const pattern of patterns) {
    if (!/[*?{}[\]]/.test(pattern)) {
      if (existsSync(pattern)) out.add(pattern);
      continue;
    }
    if (allFiles === null) {
      allFiles = [];
      walk(".", "", allFiles);
    }
    const normalized = pattern.split(sep).join("/").replace(/^\.\//, "");
    const matcher = globToRegExp(normalized);
    for (const file of allFiles) {
      if (matcher.test(file)) out.add(file);
    }
  }
  return [...out];
}

export interface RunIO {
  /** Sink for output lines (defaults to console.log). */
  write?: (line: string) => void;
}

/** Programmatic CLI entry. Returns the process exit code. */
export async function run(argv: string[], io: RunIO = {}): Promise<number> {
  const write = io.write ?? ((s: string) => console.log(s));
  const args = parseArgs(argv);

  if (args.help) {
    write(HELP);
    return 0;
  }

  const files = expandGlobs(args.files);
  if (files.length === 0) {
    write(`No files matched: ${args.files.join(", ")}`);
    return 1;
  }

  const results: LintResult[] = [];
  for (const file of files) {
    let content = readFileSync(file, "utf8");
    if (args.fix) {
      const fixed = applyFixes(content);
      if (fixed.changed) {
        writeFileSync(file, fixed.content, "utf8");
        content = fixed.content;
        write(`Fixed ${file}: ${fixed.applied.join(", ")}`);
      }
    }
    const result = lint(content, {
      filename: file,
      ...(args.root !== null ? { root: args.root } : {}),
    });
    if (args.quiet) {
      result.findings = result.findings.filter((f) => f.severity !== "info");
    }
    results.push(result);
  }

  if (args.format === "json") {
    write(formatJson(results));
  } else {
    write(formatText(results));
  }

  const summary = summarize(results);
  if (summary.errors > 0) return 1;
  if (args.strict && summary.warnings > 0) return 1;
  if (args.maxWarnings !== null && summary.warnings > args.maxWarnings) {
    return 1;
  }
  return 0;
}

// Direct-execution entry (node dist/cli.js ...).
// Works under both bun and plain node: compare the invoked script to this module.
function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return pathToFileURL(entry).href === import.meta.url;
  } catch {
    return false;
  }
}

if (isMainModule()) {
  run(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
}
