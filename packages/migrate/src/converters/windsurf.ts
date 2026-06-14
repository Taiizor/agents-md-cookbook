import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, posix } from "node:path";
import { parseFrontmatter } from "../frontmatter";
import { splitCommaGlobs } from "../glob";
import { SourceFormat, type ParsedRule, type Scope } from "../types";

const RULE_DIRS = [".windsurf/rules", ".devin/rules"];

/** List *.md files in a rules dir relative to root, sorted. */
function listRuleFiles(root: string, relDir: string): string[] {
  const dir = join(root, relDir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((e) => e.endsWith(".md"))
    .sort()
    .map((e) => posix.join(relDir, e));
}

/** Normalize a windsurf `globs` value (string or YAML array) into a glob list. */
function normalizeGlobs(value: unknown): string[] {
  if (typeof value === "string") return splitCommaGlobs(value);
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return [];
}

export function detectWindsurf(root: string): string[] {
  const files: string[] = [];
  if (existsSync(join(root, ".windsurfrules"))) files.push(".windsurfrules");
  for (const d of RULE_DIRS) files.push(...listRuleFiles(root, d));
  return files;
}

export function convertWindsurf(root: string): ParsedRule[] {
  const rules: ParsedRule[] = [];

  const legacy = join(root, ".windsurfrules");
  if (existsSync(legacy)) {
    const body = readFileSync(legacy, "utf8").trim();
    if (body !== "") {
      rules.push({
        body,
        scope: { mode: "always" },
        sourceFile: ".windsurfrules",
        format: SourceFormat.Windsurf,
      });
    }
  }

  for (const d of RULE_DIRS) {
    for (const rel of listRuleFiles(root, d)) {
      const raw = readFileSync(join(root, rel), "utf8");
      const { data, body } = parseFrontmatter(raw);
      const trimmed = body.trim();
      if (trimmed === "") continue;

      const trigger = typeof data.trigger === "string" ? data.trigger : "always_on";
      const description = typeof data.description === "string" ? data.description : undefined;
      const globs = normalizeGlobs(data.globs);

      let scope: Scope;
      switch (trigger) {
        case "glob":
          scope = { mode: "glob", globs, description };
          break;
        case "model_decision":
          scope = { mode: "agent", description };
          break;
        case "manual":
          scope = { mode: "manual", description };
          break;
        case "always_on":
        default:
          scope = { mode: "always", description };
          break;
      }

      rules.push({ body: trimmed, scope, sourceFile: rel, format: SourceFormat.Windsurf });
    }
  }

  return rules;
}
