import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { parse as parseYaml } from "yaml";
import { SourceFormat, type ParsedRule } from "../types";

/** Normalize a `read:` value (string or array) into a list of relative paths. */
function normalizeRead(value: unknown): string[] {
  if (typeof value === "string" && value.trim() !== "") return [value.trim()];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return [];
}

export function detectAider(root: string): string[] {
  const files: string[] = [];
  if (existsSync(join(root, "CONVENTIONS.md"))) files.push("CONVENTIONS.md");
  if (existsSync(join(root, ".aider.conf.yml"))) files.push(".aider.conf.yml");
  return files;
}

export function convertAider(root: string): ParsedRule[] {
  const rules: ParsedRule[] = [];

  const conv = join(root, "CONVENTIONS.md");
  if (existsSync(conv)) {
    const body = readFileSync(conv, "utf8").trim();
    if (body !== "") {
      rules.push({
        body,
        scope: { mode: "always" },
        sourceFile: "CONVENTIONS.md",
        format: SourceFormat.Aider,
      });
    }
  }

  const confPath = join(root, ".aider.conf.yml");
  if (!existsSync(confPath)) return rules;

  let conf: Record<string, unknown> = {};
  try {
    const parsed = parseYaml(readFileSync(confPath, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      conf = parsed as Record<string, unknown>;
    }
  } catch {
    conf = {};
  }

  // Inline referenced read: files.
  for (const rel of normalizeRead(conf.read)) {
    const target = join(root, rel);
    if (existsSync(target)) {
      const body = readFileSync(target, "utf8").trim();
      if (body !== "") {
        rules.push({
          body,
          scope: { mode: "always" },
          sourceFile: posix.normalize(rel.split("\\").join("/")),
          format: SourceFormat.Aider,
        });
      }
    }
  }

  // Map lint/test/auto-test into a Build and test commands section.
  const lines: string[] = [];
  if (typeof conf["lint-cmd"] === "string" && conf["lint-cmd"].trim() !== "") {
    lines.push("Lint:\n\n```bash\n" + conf["lint-cmd"].trim() + "\n```");
  }
  if (typeof conf["test-cmd"] === "string" && conf["test-cmd"].trim() !== "") {
    lines.push("Test:\n\n```bash\n" + conf["test-cmd"].trim() + "\n```");
  }
  if (conf["auto-test"] === true) {
    lines.push("Tests run automatically after edits.");
  }
  if (lines.length > 0) {
    rules.push({
      body: lines.join("\n\n"),
      scope: { mode: "always" },
      heading: "## Build and test commands",
      sourceFile: ".aider.conf.yml",
      format: SourceFormat.Aider,
    });
  }

  return rules;
}
