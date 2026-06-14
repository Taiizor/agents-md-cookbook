import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { frontmatter } from "micromark-extension-frontmatter";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";
import { parse as parseYaml } from "yaml";
import type {
  Document,
  DocumentHeading,
  DocumentCodeBlock,
  DocumentCommand,
} from "./types.ts";

export interface ParseOptions {
  /** Filename as supplied (used by the filename rule). Defaults to "AGENTS.md". */
  filename?: string;
  /** Repo root; presence enables freshness rules downstream. */
  root?: string;
}

/** Heuristic: does inline/fenced code look like a runnable shell command? */
const COMMAND_HINT =
  /^(\$\s*)?(sudo\s+)?(npx|bunx|bun|npm|pnpm|yarn|node|deno|python|python3|pip|pip3|uv|uvx|poetry|pytest|go|cargo|rustc|make|mvn|gradle|gradlew|docker|docker-compose|git|sh|bash|zsh|curl|wget|ruby|rake|bundle|dotnet|tsc|eslint|prettier|ruff|black|mypy|jest|vitest|playwright|rails|php|composer|terraform|kubectl|helm)\b/;

const SHELL_LANGS = new Set([
  "bash",
  "sh",
  "shell",
  "zsh",
  "console",
  "shell-session",
  "",
]);

function textOf(node: { children?: unknown[]; value?: string }): string {
  if (typeof node.value === "string") return node.value;
  if (!Array.isArray(node.children)) return "";
  return node.children
    .map((c) => textOf(c as { children?: unknown[]; value?: string }))
    .join("");
}

function lineOf(node: { position?: { start?: { line?: number } } }): number {
  return node.position?.start?.line ?? 0;
}

function extractCommandsFromBlock(value: string): string[] {
  return value
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"))
    .map((l) => l.replace(/^\$\s*/, ""))
    .filter((l) => COMMAND_HINT.test(l) || COMMAND_HINT.test(`$ ${l}`));
}

export function parseDocument(raw: string, opts: ParseOptions = {}): Document {
  const filename = opts.filename ?? "AGENTS.md";
  const lines = raw.split("\n");
  const byteLength = Buffer.byteLength(raw, "utf8");

  const ast = fromMarkdown(raw, {
    extensions: [gfm(), frontmatter(["yaml"])],
    mdastExtensions: [gfmFromMarkdown(), frontmatterFromMarkdown(["yaml"])],
  });

  let frontmatterRaw: string | null = null;
  let frontmatterObj: Record<string, unknown> | null = null;
  const headings: DocumentHeading[] = [];
  const codeBlocks: DocumentCodeBlock[] = [];
  const commands: DocumentCommand[] = [];

  const visit = (node: any): void => {
    switch (node.type) {
      case "yaml": {
        frontmatterRaw = node.value as string;
        try {
          const parsed = parseYaml(node.value as string);
          frontmatterObj =
            parsed && typeof parsed === "object" && !Array.isArray(parsed)
              ? (parsed as Record<string, unknown>)
              : null;
        } catch {
          frontmatterObj = null;
        }
        break;
      }
      case "heading": {
        headings.push({
          depth: node.depth as number,
          text: textOf(node).trim(),
          line: lineOf(node),
        });
        break;
      }
      case "code": {
        const lang = ((node.lang as string | null) ?? "").toLowerCase();
        const value = (node.value as string) ?? "";
        codeBlocks.push({ lang, value, line: lineOf(node) });
        if (SHELL_LANGS.has(lang)) {
          for (const cmd of extractCommandsFromBlock(value)) {
            commands.push({ text: cmd, fenced: true, line: lineOf(node) });
          }
        }
        break;
      }
      case "inlineCode": {
        const value = ((node.value as string) ?? "").trim();
        const normalized = value.replace(/^\$\s*/, "");
        if (COMMAND_HINT.test(normalized)) {
          commands.push({
            text: normalized,
            fenced: false,
            line: lineOf(node),
          });
        }
        break;
      }
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) visit(child);
    }
  };

  visit(ast);

  return {
    raw,
    lines,
    ast,
    frontmatter: frontmatterObj,
    frontmatterRaw,
    headings,
    codeBlocks,
    commands,
    filename,
    byteLength,
    repoRoot: opts.root ?? null,
  };
}
