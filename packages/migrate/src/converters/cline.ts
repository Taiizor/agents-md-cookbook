import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import { parseFrontmatter } from "../frontmatter";
import { SourceFormat, type ParsedRule, type Scope } from "../types";

/** Extract a leading numeric prefix (e.g. "01-foo.md" -> 1) for ordering. */
function numericPrefix(name: string): number {
  const m = /^(\d+)/.exec(name);
  return m ? parseInt(m[1]!, 10) : Number.MAX_SAFE_INTEGER;
}

/** Sort dir entries by numeric prefix, then lexicographically. */
function sortRuleNames(names: string[]): string[] {
  return [...names].sort((a, b) => {
    const na = numericPrefix(a);
    const nb = numericPrefix(b);
    if (na !== nb) return na - nb;
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

/** Normalize `paths` (YAML array preferred; tolerate a single string). */
function normalizePaths(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string" && value.trim() !== "") return [value.trim()];
  return [];
}

export function detectCline(root: string): string[] {
  const single = join(root, ".clinerules");
  if (existsSync(single) && statSync(single).isFile()) return [".clinerules"];
  if (existsSync(single) && statSync(single).isDirectory()) {
    const names = readdirSync(single).filter((e) => e.endsWith(".md") || e.endsWith(".txt"));
    return sortRuleNames(names).map((e) => posix.join(".clinerules", e));
  }
  return [];
}

export function convertCline(root: string): ParsedRule[] {
  const rules: ParsedRule[] = [];
  const single = join(root, ".clinerules");

  if (existsSync(single) && statSync(single).isFile()) {
    const body = readFileSync(single, "utf8").trim();
    if (body !== "") {
      rules.push({
        body,
        scope: { mode: "always" },
        sourceFile: ".clinerules",
        format: SourceFormat.Cline,
      });
    }
    return rules;
  }

  if (existsSync(single) && statSync(single).isDirectory()) {
    const names = sortRuleNames(
      readdirSync(single).filter((e) => e.endsWith(".md") || e.endsWith(".txt")),
    );
    let order = 0;
    for (const name of names) {
      order += 1;
      const rel = posix.join(".clinerules", name);
      const raw = readFileSync(join(single, name), "utf8");
      const { data, body } = parseFrontmatter(raw);
      const trimmed = body.trim();
      if (trimmed === "") continue;

      const prefix = numericPrefix(name);
      const orderValue = prefix === Number.MAX_SAFE_INTEGER ? order : prefix;
      const paths = normalizePaths(data.paths);
      const description = typeof data.description === "string" ? data.description : undefined;

      const scope: Scope =
        paths.length > 0
          ? { mode: "glob", globs: paths, description }
          : { mode: "always", description };

      rules.push({ body: trimmed, scope, order: orderValue, sourceFile: rel, format: SourceFormat.Cline });
    }
  }

  return rules;
}
