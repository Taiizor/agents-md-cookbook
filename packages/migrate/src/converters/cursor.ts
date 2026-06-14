import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { parseFrontmatter } from "../frontmatter";
import { splitCommaGlobs } from "../glob";
import { SourceFormat, type ParsedRule, type Scope } from "../types";

/** Recursively list files under `dir` with a given extension, relative to `root`. */
function listByExt(root: string, dir: string, ext: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listByExt(root, full, ext));
    } else if (entry.endsWith(ext)) {
      out.push(relative(root, full).split(sep).join("/"));
    }
  }
  return out.sort();
}

/** Return cursor source files (relative to root). */
export function detectCursor(root: string): string[] {
  const files: string[] = [];
  if (existsSync(join(root, ".cursorrules"))) files.push(".cursorrules");
  files.push(...listByExt(root, join(root, ".cursor", "rules"), ".mdc"));
  return files;
}

/** Convert all cursor source files in `root` into ParsedRules. */
export function convertCursor(root: string): ParsedRule[] {
  const rules: ParsedRule[] = [];

  const legacy = join(root, ".cursorrules");
  if (existsSync(legacy)) {
    const body = readFileSync(legacy, "utf8").trim();
    if (body !== "") {
      rules.push({
        body,
        scope: { mode: "always" },
        sourceFile: ".cursorrules",
        format: SourceFormat.Cursor,
      });
    }
  }

  for (const rel of listByExt(root, join(root, ".cursor", "rules"), ".mdc")) {
    const raw = readFileSync(join(root, rel), "utf8");
    const { data, body } = parseFrontmatter(raw);
    const trimmed = body.trim();
    if (trimmed === "") continue;

    const description = typeof data.description === "string" ? data.description : undefined;
    const alwaysApply = data.alwaysApply === true;
    // Cursor `globs` is a bare COMMA-SEPARATED string, not a YAML array.
    const globsRaw = typeof data.globs === "string" ? data.globs : "";
    const globs = splitCommaGlobs(globsRaw);

    let scope: Scope;
    if (alwaysApply) {
      scope = { mode: "always", description };
    } else if (globs.length > 0) {
      scope = { mode: "glob", globs, description };
    } else {
      scope = { mode: "manual", description };
    }

    rules.push({
      body: trimmed,
      scope,
      sourceFile: rel,
      format: SourceFormat.Cursor,
    });
  }

  return rules;
}
