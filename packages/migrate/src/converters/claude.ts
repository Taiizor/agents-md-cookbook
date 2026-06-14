import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, isAbsolute, sep, posix } from "node:path";
import { SourceFormat, type ParsedRule } from "../types";

/** Recursively find all CLAUDE.md files (excluding CLAUDE.local.md), relative to root. */
function findClaudeFiles(root: string, dir: string, acc: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git") continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      findClaudeFiles(root, full, acc);
    } else if (entry === "CLAUDE.md") {
      acc.push(relative(root, full).split(sep).join("/"));
    }
  }
}

/** List .claude/rules/* files (md/txt) relative to root, sorted. */
function findClaudeRules(root: string): string[] {
  const dir = join(root, ".claude", "rules");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((e) => e.endsWith(".md") || e.endsWith(".txt"))
    .sort()
    .map((e) => posix.join(".claude/rules", e));
}

/**
 * Inline `@path` imports relative to `importerAbs`, up to `depth` levels,
 * skipping any `@` reference that occurs inside a fenced code block.
 */
function resolveImports(
  text: string,
  importerAbs: string,
  root: string,
  depth: number,
  seen: Set<string>,
): string {
  if (depth <= 0) return text;
  const lines = text.split("\n");
  const out: string[] = [];
  let inFence = false;

  for (const line of lines) {
    if (/^(```|~~~)/.test(line.trim())) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    const m = !inFence ? /^\s*@([^\s`]+)\s*$/.exec(line) : null;
    if (m) {
      const target = join(dirname(importerAbs), m[1]!);
      const rel = relative(root, target);
      const key = target.toLowerCase();
      // Stay within the repo root: never inline a file resolved outside it
      // (e.g. `@../../../etc/passwd` or an absolute path from a hostile file).
      const insideRoot = rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
      if (insideRoot && existsSync(target) && statSync(target).isFile() && !seen.has(key)) {
        seen.add(key);
        const imported = readFileSync(target, "utf8");
        out.push(resolveImports(imported, target, root, depth - 1, seen).trimEnd());
        continue;
      }
    }
    out.push(line);
  }
  return out.join("\n");
}

/** Return claude source files (relative to root), excluding personal files. */
export function detectClaude(root: string): string[] {
  const claudeFiles: string[] = [];
  if (existsSync(root)) findClaudeFiles(root, root, claudeFiles);
  return [...claudeFiles.sort(), ...findClaudeRules(root)];
}

/** Convert all Claude Code sources in `root` into ParsedRules. */
export function convertClaude(root: string): ParsedRule[] {
  const rules: ParsedRule[] = [];
  const claudeFiles: string[] = [];
  if (existsSync(root)) findClaudeFiles(root, root, claudeFiles);
  claudeFiles.sort();

  for (const rel of claudeFiles) {
    const abs = join(root, rel);
    const raw = readFileSync(abs, "utf8");
    const resolved = resolveImports(raw, abs, root, 5, new Set([abs.toLowerCase()])).trim();
    if (resolved === "") continue;

    const dir = posix.dirname(rel);
    if (dir === "." || dir === "") {
      rules.push({
        body: resolved,
        scope: { mode: "always" },
        sourceFile: rel,
        format: SourceFormat.Claude,
      });
    } else {
      // Subdir CLAUDE.md => nest under that directory.
      rules.push({
        body: resolved,
        scope: { mode: "glob", globs: [`${dir}/**`] },
        sourceFile: rel,
        format: SourceFormat.Claude,
      });
    }
  }

  for (const rel of findClaudeRules(root)) {
    const body = readFileSync(join(root, rel), "utf8").trim();
    if (body === "") continue;
    rules.push({
      body,
      scope: { mode: "always" },
      sourceFile: rel,
      format: SourceFormat.Claude,
    });
  }

  return rules;
}
