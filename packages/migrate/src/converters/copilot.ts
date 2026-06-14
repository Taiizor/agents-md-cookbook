import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, posix } from "node:path";
import { parseFrontmatter } from "../frontmatter";
import { splitCommaGlobs } from "../glob";
import { SourceFormat, type ParsedRule, type Scope } from "../types";

/** List *.instructions.md files relative to root, sorted. */
function listInstructions(root: string): string[] {
  const dir = join(root, ".github", "instructions");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((e) => e.endsWith(".instructions.md"))
    .sort()
    .map((e) => posix.join(".github/instructions", e));
}

/** Normalize excludeAgent (string or array) into a string array. */
function normalizeExclude(value: unknown): string[] | undefined {
  if (typeof value === "string" && value.trim() !== "") return [value.trim()];
  if (Array.isArray(value)) {
    const arr = value.filter((v): v is string => typeof v === "string");
    return arr.length > 0 ? arr : undefined;
  }
  return undefined;
}

export function detectCopilot(root: string): string[] {
  const files: string[] = [];
  if (existsSync(join(root, ".github", "copilot-instructions.md"))) {
    files.push(".github/copilot-instructions.md");
  }
  files.push(...listInstructions(root));
  return files;
}

export function convertCopilot(root: string): ParsedRule[] {
  const rules: ParsedRule[] = [];

  const main = join(root, ".github", "copilot-instructions.md");
  if (existsSync(main)) {
    const body = readFileSync(main, "utf8").trim();
    if (body !== "") {
      rules.push({
        body,
        scope: { mode: "always" },
        sourceFile: ".github/copilot-instructions.md",
        format: SourceFormat.Copilot,
      });
    }
  }

  for (const rel of listInstructions(root)) {
    const raw = readFileSync(join(root, rel), "utf8");
    const { data, body } = parseFrontmatter(raw);
    const trimmed = body.trim();
    if (trimmed === "") continue;

    const description = typeof data.description === "string" ? data.description : undefined;
    const excludeAgent = normalizeExclude(data.excludeAgent);
    const applyTo = typeof data.applyTo === "string" ? data.applyTo.trim() : "**";

    let scope: Scope;
    if (applyTo === "" || applyTo === "**") {
      scope = { mode: "always", description, excludeAgent };
    } else {
      scope = { mode: "glob", globs: splitCommaGlobs(applyTo), description, excludeAgent };
    }

    rules.push({ body: trimmed, scope, sourceFile: rel, format: SourceFormat.Copilot });
  }

  return rules;
}
