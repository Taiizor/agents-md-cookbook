# Linter Package (agents-md-lint) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Ship `agents-md-lint`, a tool-agnostic TypeScript/ESM CLI + programmatic API that validates, scores, and (safely) autofixes `AGENTS.md` files against verified mid-2026 best practices.

**Architecture:** A single `Document` model parses an `AGENTS.md` string (via `mdast-util-from-markdown` + GFM + frontmatter extensions, plus `yaml`) exactly once and is passed to every pure `Rule`. Rules return `Finding[]`; a weighted scorer turns the document + findings into a 0-100 score and letter grade; a CLI (`cli.ts`) and programmatic API (`index.ts`) orchestrate parsing, rules, scoring, autofix, and reporting. The package is a bun workspace member, built with `bun build`, tested with `bun:test`, and published to npm so end users run it via `bunx`/`npx`.

**Tech Stack:** TypeScript (ESM), bun (workspace + test runner + bundler), `mdast-util-from-markdown` + `mdast-util-gfm` + `micromark-extension-gfm` + `mdast-util-frontmatter` + `micromark-extension-frontmatter` for Markdown parsing, `yaml` for frontmatter, composite GitHub Action wrapping the CLI.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `package.json` (repo root) | Declare bun workspace (`workspaces: ["packages/*"]`); only modified if it does not yet exist. |
| `tsconfig.base.json` (repo root) | Shared strict TS compiler options that package tsconfigs extend. |
| `packages/linter/package.json` | Package manifest: name `agents-md-lint`, `bin`, `type: module`, `exports`, scripts, deps. |
| `packages/linter/tsconfig.json` | Extends root base; sets `outDir`/`rootDir` for the linter. |
| `packages/linter/src/types.ts` | Core types: `Severity`, `Finding`, `Rule`, `LintResult`, `LintOptions`, `Grade`. |
| `packages/linter/src/document.ts` | `parseDocument(raw, opts)` -> `Document` model (raw, lines, ast, frontmatter, headings, codeBlocks, commands). |
| `packages/linter/src/rules/valid-markdown.ts` | Rule `AGM-001`: parse must succeed, no broken constructs. |
| `packages/linter/src/rules/filename.ts` | Rule `AMC-FILENAME`: filename must be exactly `AGENTS.md`. |
| `packages/linter/src/rules/non-empty.ts` | Rule `AMC-NONEMPTY`: flag stub/near-empty (<100 chars). |
| `packages/linter/src/rules/headings.ts` | Rule `AMC-HEADINGS`: >=1 heading, no skipped heading levels. |
| `packages/linter/src/rules/recommended-sections.ts` | Rule `AGM-002`: recommended sections present; INFO suggest three-tier Boundaries. |
| `packages/linter/src/rules/byte-cap.ts` | Rule `XP-007`: Codex 32768-byte cap (ERROR, configurable). |
| `packages/linter/src/rules/windsurf-chars.ts` | Rule `AGM-003`: Windsurf 6000/file char cap (WARN). |
| `packages/linter/src/rules/line-budget.ts` | Rule `AMC-LENGTH`: soft >150 / heavy >300 line budgets (WARN). |
| `packages/linter/src/rules/vague-platitudes.ts` | Rule `AMC-PLATITUDE`: keyword-match vague platitudes (WARN). |
| `packages/linter/src/rules/executable-command.ts` | Rule `AMC-CMD`: require >=1 runnable shell command (WARN). |
| `packages/linter/src/rules/version-specifics.ts` | Rule `AMC-VERSION`: suggest version pins (INFO). |
| `packages/linter/src/rules/naked-donts.ts` | Rule `AMC-DONTS`: high don't:do ratio or >20 don'ts (WARN). |
| `packages/linter/src/rules/freshness.ts` | Rules `AMC-PATH` (ERROR), `AMC-SCRIPT` (WARN), `AMC-STALE` (INFO): repo-context-only. |
| `packages/linter/src/rules/inline-secret.ts` | Rule `AMC-SECRET`: detect inlined secrets (ERROR). |
| `packages/linter/src/rules/frontmatter.ts` | Rule `AMC-FRONTMATTER`: validate optional v1.1 frontmatter (WARN, never error on unknown keys). |
| `packages/linter/src/rules/index.ts` | Aggregate the rule registry (`allRules`, `standaloneRules`, `freshnessRules`). |
| `packages/linter/src/scoring.ts` | `scoreDocument(doc, findings)` -> `{ score, grade }` with explicit weight constants. |
| `packages/linter/src/fix.ts` | `applyFixes(raw)` -> safe HIGH-confidence autofixes (trailing whitespace, final newline, bare command wrapping). |
| `packages/linter/src/report.ts` | `formatText(results)` and `formatJson(results)` reporters. |
| `packages/linter/src/engine-agnix.ts` | Optional `--engine agnix` passthrough: shell out to `agnix` if present, map output to `Finding[]`. |
| `packages/linter/src/cli.ts` | `run(argv)` arg parsing, orchestration, exit codes; shebang entry. |
| `packages/linter/src/index.ts` | Programmatic API: `lint`, `lintAll`, re-export types. |
| `packages/linter/test/*.test.ts` | `bun:test` suites, one per unit above. |
| `packages/linter/test/fixtures/*` | Concrete `AGENTS.md` fixtures used by tests. |
| `packages/linter/README.md` | Install + usage + full rules table. |
| `action.yml` (repo root) | Composite GitHub Action wrapping the CLI. |
| `.github/workflows/ci.yml` | CI: build, test, and self-dogfood lint of `templates/**/AGENTS.md`. |

---

### Task 1: Bun workspace + package scaffold

**Files:**
- Create/Modify: `package.json` (repo root)
- Create: `tsconfig.base.json` (repo root)
- Create: `packages/linter/package.json`
- Create: `packages/linter/tsconfig.json`
- Create: `packages/linter/.gitignore`

- [ ] **Step 1: Create the root workspace manifest (only if absent).**
  Check first: if `package.json` already exists at the repo root, open it and add the `workspaces` field instead of overwriting. Otherwise create `package.json` (repo root):
  ```json
  {
    "name": "agents-md-cookbook",
    "private": true,
    "type": "module",
    "workspaces": ["packages/*"],
    "scripts": {
      "build": "bun run --filter '*' build",
      "test": "bun test",
      "lint:templates": "bunx agents-md-lint \"templates/**/AGENTS.md\""
    }
  }
  ```

- [ ] **Step 2: Create the shared TS base config.**
  Create `tsconfig.base.json` (repo root):
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "moduleResolution": "bundler",
      "lib": ["ES2022"],
      "types": ["bun-types"],
      "strict": true,
      "noUncheckedIndexedAccess": true,
      "noImplicitOverride": true,
      "declaration": true,
      "sourceMap": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "verbatimModuleSyntax": true
    }
  }
  ```

- [ ] **Step 3: Create the linter package manifest.**
  Create `packages/linter/package.json`:
  ```json
  {
    "name": "agents-md-lint",
    "version": "0.1.0",
    "description": "The tested, tool-agnostic AGENTS.md linter — validates, scores, and autofixes AGENTS.md files.",
    "license": "MIT",
    "type": "module",
    "bin": {
      "agents-md-lint": "./dist/cli.js"
    },
    "main": "./dist/index.js",
    "module": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": {
      ".": {
        "types": "./dist/index.d.ts",
        "import": "./dist/index.js"
      },
      "./package.json": "./package.json"
    },
    "files": ["dist", "README.md"],
    "engines": {
      "node": ">=18"
    },
    "scripts": {
      "build": "bun build ./src/cli.ts ./src/index.ts --outdir ./dist --target node --format esm --splitting && bunx tsc --emitDeclarationOnly --outDir dist",
      "test": "bun test",
      "prepublishOnly": "bun run build"
    },
    "keywords": ["agents.md", "agents-md", "linter", "ai", "coding-agent", "cli"],
    "dependencies": {
      "mdast-util-from-markdown": "^2.0.2",
      "mdast-util-gfm": "^3.0.0",
      "micromark-extension-gfm": "^3.0.0",
      "mdast-util-frontmatter": "^2.0.1",
      "micromark-extension-frontmatter": "^2.0.0",
      "yaml": "^2.5.1"
    },
    "devDependencies": {
      "@types/mdast": "^4.0.4",
      "bun-types": "latest",
      "typescript": "^5.6.0"
    },
    "repository": {
      "type": "git",
      "directory": "packages/linter"
    }
  }
  ```

- [ ] **Step 4: Create the linter tsconfig.**
  Create `packages/linter/tsconfig.json`:
  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "outDir": "./dist",
      "rootDir": "./src",
      "noEmit": false
    },
    "include": ["src/**/*.ts"],
    "exclude": ["dist", "node_modules", "test"]
  }
  ```

- [ ] **Step 5: Create the package gitignore.**
  Create `packages/linter/.gitignore`:
  ```
  dist/
  node_modules/
  *.tsbuildinfo
  ```

- [ ] **Step 6: Install dependencies.**
  Run: `bun install` (from repo root). Expected: lockfile written, `node_modules` populated, no errors.

- [ ] **Step 7: Commit the scaffold.**
  ```bash
  git add package.json tsconfig.base.json packages/linter/package.json packages/linter/tsconfig.json packages/linter/.gitignore bun.lock
  git commit -m "$(cat <<'EOF'
  chore(linter): scaffold agents-md-lint bun workspace package

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 2: Core types

**Files:**
- Create: `packages/linter/src/types.ts`
- Test: `packages/linter/test/types.test.ts`

- [ ] **Step 1: Write the failing types test.**
  Create `packages/linter/test/types.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import {
    SEVERITIES,
    GRADES,
    isSeverity,
    type Finding,
    type Rule,
    type LintResult,
  } from "../src/types.ts";

  describe("types", () => {
    test("SEVERITIES lists the three severities in priority order", () => {
      expect(SEVERITIES).toEqual(["error", "warn", "info"]);
    });

    test("GRADES lists letter grades from best to worst", () => {
      expect(GRADES).toEqual(["A", "B", "C", "D", "F"]);
    });

    test("isSeverity narrows valid strings", () => {
      expect(isSeverity("error")).toBe(true);
      expect(isSeverity("warn")).toBe(true);
      expect(isSeverity("info")).toBe(true);
      expect(isSeverity("fatal")).toBe(false);
    });

    test("a Finding is structurally valid", () => {
      const f: Finding = {
        ruleId: "AGM-001",
        severity: "error",
        message: "boom",
        line: 1,
        column: 2,
        fix: "do x",
      };
      expect(f.ruleId).toBe("AGM-001");
      expect(f.severity).toBe("error");
    });

    test("a Rule and LintResult are structurally valid", () => {
      const rule: Rule = {
        id: "AGM-001",
        severity: "error",
        check: () => [],
      };
      const result: LintResult = {
        file: "AGENTS.md",
        findings: [],
        score: 100,
        grade: "A",
      };
      expect(rule.check({} as never)).toEqual([]);
      expect(result.grade).toBe("A");
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  Run: `cd packages/linter && bun test test/types.test.ts`
  Expected: FAIL — `Cannot find module '../src/types.ts'`.

- [ ] **Step 3: Implement the types (COMPLETE).**
  Create `packages/linter/src/types.ts`:
  ```ts
  /** Finding severity, in descending priority order. */
  export const SEVERITIES = ["error", "warn", "info"] as const;
  export type Severity = (typeof SEVERITIES)[number];

  /** Letter grades, best to worst. */
  export const GRADES = ["A", "B", "C", "D", "F"] as const;
  export type Grade = (typeof GRADES)[number];

  export function isSeverity(value: string): value is Severity {
    return (SEVERITIES as readonly string[]).includes(value);
  }

  /** A single linter finding. */
  export interface Finding {
    /** Stable rule identifier, e.g. "AGM-001". */
    ruleId: string;
    severity: Severity;
    message: string;
    /** 1-based line, when locatable. */
    line?: number;
    /** 1-based column, when locatable. */
    column?: number;
    /** Human-readable remediation hint (advisory; not always auto-applied). */
    fix?: string;
  }

  /** Parsed AGENTS.md document model (defined in document.ts). */
  export interface Document {
    raw: string;
    lines: string[];
    ast: unknown;
    frontmatter: Record<string, unknown> | null;
    frontmatterRaw: string | null;
    headings: DocumentHeading[];
    codeBlocks: DocumentCodeBlock[];
    commands: DocumentCommand[];
    /** Absolute or relative filename as supplied (e.g. "AGENTS.md", "pkg/AGENTS.md"). */
    filename: string;
    /** Total UTF-8 byte length of raw. */
    byteLength: number;
    /** Repo root, when running in repo-context (freshness) mode. */
    repoRoot: string | null;
  }

  export interface DocumentHeading {
    /** Heading depth 1-6. */
    depth: number;
    /** Plain-text heading content. */
    text: string;
    line: number;
  }

  export interface DocumentCodeBlock {
    /** Info-string language, lowercased, or "" if none. */
    lang: string;
    value: string;
    line: number;
  }

  export interface DocumentCommand {
    /** The command text. */
    text: string;
    /** True when found in a fenced block, false when inline code. */
    fenced: boolean;
    line: number;
  }

  /** Options shared by rules, scorer, and the orchestrators. */
  export interface LintOptions {
    /** Repo root path; presence enables freshness rules. */
    root?: string;
    /** Per-rule config overrides keyed by rule id. */
    ruleConfig?: Record<string, Record<string, unknown>>;
    /** Treat warnings as errors for exit-code purposes. */
    strict?: boolean;
  }

  /** A lint rule. Rules are pure: they read the Document and return findings. */
  export interface Rule {
    id: string;
    severity: Severity;
    /** Optional doc string for the rules table / README generation. */
    description?: string;
    /** True when the rule requires repo context (freshness). */
    requiresRepo?: boolean;
    check(doc: Document, config?: Record<string, unknown>): Finding[];
  }

  /** Result of linting a single file. */
  export interface LintResult {
    file: string;
    findings: Finding[];
    score: number;
    grade: Grade;
  }
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  Run: `cd packages/linter && bun test test/types.test.ts`
  Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/linter/src/types.ts packages/linter/test/types.test.ts
  git commit -m "$(cat <<'EOF'
  feat(linter): add core Finding/Rule/LintResult types

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 3: Document model

**Files:**
- Create: `packages/linter/src/document.ts`
- Test: `packages/linter/test/document.test.ts`

- [ ] **Step 1: Write the failing document test.**
  Create `packages/linter/test/document.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { parseDocument } from "../src/document.ts";

  const SAMPLE = `---
  description: A demo file
  tags:
    - demo
    - test
  ---
  # Project

  ## Setup commands

  Run the installer:

  \`\`\`bash
  bun install --frozen-lockfile
  \`\`\`

  Then run \`bun test\` to verify.
  `;

  describe("parseDocument", () => {
    test("captures raw, lines, byteLength and filename", () => {
      const doc = parseDocument(SAMPLE, { filename: "AGENTS.md" });
      expect(doc.raw).toBe(SAMPLE);
      expect(doc.filename).toBe("AGENTS.md");
      expect(doc.byteLength).toBe(Buffer.byteLength(SAMPLE, "utf8"));
      expect(doc.lines.length).toBe(SAMPLE.split("\n").length);
    });

    test("parses optional frontmatter into an object", () => {
      const doc = parseDocument(SAMPLE, { filename: "AGENTS.md" });
      expect(doc.frontmatter).toEqual({
        description: "A demo file",
        tags: ["demo", "test"],
      });
      expect(doc.frontmatterRaw).toContain("description: A demo file");
    });

    test("returns null frontmatter when absent", () => {
      const doc = parseDocument("# No frontmatter\n", { filename: "AGENTS.md" });
      expect(doc.frontmatter).toBeNull();
      expect(doc.frontmatterRaw).toBeNull();
    });

    test("collects headings with depth/text/line", () => {
      const doc = parseDocument(SAMPLE, { filename: "AGENTS.md" });
      expect(doc.headings.map((h) => [h.depth, h.text])).toEqual([
        [1, "Project"],
        [2, "Setup commands"],
      ]);
      expect(doc.headings[0]!.line).toBeGreaterThan(0);
    });

    test("collects fenced code blocks with language", () => {
      const doc = parseDocument(SAMPLE, { filename: "AGENTS.md" });
      expect(doc.codeBlocks.length).toBe(1);
      expect(doc.codeBlocks[0]!.lang).toBe("bash");
      expect(doc.codeBlocks[0]!.value).toContain("bun install");
    });

    test("collects commands from fenced blocks and inline code", () => {
      const doc = parseDocument(SAMPLE, { filename: "AGENTS.md" });
      const texts = doc.commands.map((c) => c.text);
      expect(texts).toContain("bun install --frozen-lockfile");
      expect(texts).toContain("bun test");
      const fencedCmd = doc.commands.find((c) => c.text.startsWith("bun install"));
      expect(fencedCmd!.fenced).toBe(true);
    });

    test("malformed frontmatter yields null without throwing", () => {
      const bad = "---\ndescription: [unterminated\n---\n# Title\n";
      const doc = parseDocument(bad, { filename: "AGENTS.md" });
      expect(doc.frontmatter).toBeNull();
    });

    test("records repoRoot when supplied", () => {
      const doc = parseDocument("# x\n", { filename: "AGENTS.md", root: "/repo" });
      expect(doc.repoRoot).toBe("/repo");
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  Run: `cd packages/linter && bun test test/document.test.ts`
  Expected: FAIL — `Cannot find module '../src/document.ts'`.

- [ ] **Step 3: Implement the document model (COMPLETE).**
  Create `packages/linter/src/document.ts`:
  ```ts
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
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  Run: `cd packages/linter && bun test test/document.test.ts`
  Expected: PASS — 8 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/linter/src/document.ts packages/linter/test/document.test.ts
  git commit -m "$(cat <<'EOF'
  feat(linter): add Document model with mdast + frontmatter parsing

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 4: Rule AGM-001 valid-markdown + AMC-FILENAME

**Files:**
- Create: `packages/linter/src/rules/valid-markdown.ts`
- Create: `packages/linter/src/rules/filename.ts`
- Test: `packages/linter/test/rules/valid-markdown.test.ts`
- Test: `packages/linter/test/rules/filename.test.ts`

- [ ] **Step 1: Write the failing valid-markdown test.**
  Create `packages/linter/test/rules/valid-markdown.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { parseDocument } from "../../src/document.ts";
  import { validMarkdownRule } from "../../src/rules/valid-markdown.ts";

  describe("AGM-001 valid-markdown", () => {
    test("passes on well-formed markdown", () => {
      const doc = parseDocument("# Title\n\nText.\n", { filename: "AGENTS.md" });
      expect(validMarkdownRule.check(doc)).toEqual([]);
    });

    test("flags an unterminated code fence", () => {
      const doc = parseDocument("# Title\n\n```bash\nbun test\n", {
        filename: "AGENTS.md",
      });
      const findings = validMarkdownRule.check(doc);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0]!.ruleId).toBe("AGM-001");
      expect(findings[0]!.severity).toBe("error");
    });

    test("rule metadata is correct", () => {
      expect(validMarkdownRule.id).toBe("AGM-001");
      expect(validMarkdownRule.severity).toBe("error");
    });
  });
  ```

- [ ] **Step 2: Write the failing filename test.**
  Create `packages/linter/test/rules/filename.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { parseDocument } from "../../src/document.ts";
  import { filenameRule } from "../../src/rules/filename.ts";

  function check(filename: string) {
    const doc = parseDocument("# x\n", { filename });
    return filenameRule.check(doc);
  }

  describe("AMC-FILENAME", () => {
    test("accepts exactly AGENTS.md", () => {
      expect(check("AGENTS.md")).toEqual([]);
    });

    test("accepts AGENTS.md inside a nested path", () => {
      expect(check("packages/api/AGENTS.md")).toEqual([]);
    });

    test("rejects lowercase agents.md", () => {
      const f = check("agents.md");
      expect(f.length).toBe(1);
      expect(f[0]!.ruleId).toBe("AMC-FILENAME");
      expect(f[0]!.severity).toBe("error");
    });

    test("rejects Agents.MD and AGENT.md and AGENTS.markdown", () => {
      expect(check("Agents.MD").length).toBe(1);
      expect(check("AGENT.md").length).toBe(1);
      expect(check("AGENTS.markdown").length).toBe(1);
    });
  });
  ```

- [ ] **Step 3: Run both tests (expected FAIL).**
  Run: `cd packages/linter && bun test test/rules/valid-markdown.test.ts test/rules/filename.test.ts`
  Expected: FAIL — modules `valid-markdown.ts` and `filename.ts` not found.

- [ ] **Step 4: Implement valid-markdown (COMPLETE).**
  Create `packages/linter/src/rules/valid-markdown.ts`:
  ```ts
  import type { Rule, Finding } from "../types.ts";

  /**
   * AGM-001: the file must parse as valid Markdown. mdast is permissive, so we
   * additionally detect the highest-signal structural breakage: an unterminated
   * fenced code block (odd number of fence lines).
   */
  export const validMarkdownRule: Rule = {
    id: "AGM-001",
    severity: "error",
    description: "File must be valid CommonMark/GFM Markdown.",
    check(doc): Finding[] {
      const findings: Finding[] = [];
      const fenceLines = doc.lines.filter((l) => /^\s*(```|~~~)/.test(l));
      if (fenceLines.length % 2 !== 0) {
        const lastFenceIndex = doc.lines.findIndex((l) =>
          /^\s*(```|~~~)/.test(l),
        );
        findings.push({
          ruleId: "AGM-001",
          severity: "error",
          message:
            "Unterminated fenced code block: an opening ``` has no matching closing fence.",
          line: lastFenceIndex >= 0 ? lastFenceIndex + 1 : undefined,
          fix: "Add a closing ``` fence.",
        });
      }
      return findings;
    },
  };
  ```

- [ ] **Step 5: Implement filename (COMPLETE).**
  Create `packages/linter/src/rules/filename.ts`:
  ```ts
  import type { Rule, Finding } from "../types.ts";

  /** Extract the basename from a path using either separator. */
  function basename(p: string): string {
    const parts = p.split(/[\\/]/);
    return parts[parts.length - 1] ?? p;
  }

  /**
   * AMC-FILENAME: the file must be named exactly "AGENTS.md"
   * (uppercase AGENTS, lowercase .md). This is a hard requirement of the spec.
   */
  export const filenameRule: Rule = {
    id: "AMC-FILENAME",
    severity: "error",
    description: 'File must be named exactly "AGENTS.md".',
    check(doc): Finding[] {
      const name = basename(doc.filename);
      if (name === "AGENTS.md") return [];
      return [
        {
          ruleId: "AMC-FILENAME",
          severity: "error",
          message: `Filename must be exactly "AGENTS.md" (got "${name}"). Tools only auto-load the exact casing.`,
          line: 1,
          fix: 'Rename the file to "AGENTS.md".',
        },
      ];
    },
  };
  ```

- [ ] **Step 6: Run both tests (expected PASS).**
  Run: `cd packages/linter && bun test test/rules/valid-markdown.test.ts test/rules/filename.test.ts`
  Expected: PASS — all 7 tests pass.

- [ ] **Step 7: Commit.**
  ```bash
  git add packages/linter/src/rules/valid-markdown.ts packages/linter/src/rules/filename.ts packages/linter/test/rules/valid-markdown.test.ts packages/linter/test/rules/filename.test.ts
  git commit -m "$(cat <<'EOF'
  feat(linter): add AGM-001 valid-markdown and AMC-FILENAME rules

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 5: Rules AMC-NONEMPTY + AMC-HEADINGS

**Files:**
- Create: `packages/linter/src/rules/non-empty.ts`
- Create: `packages/linter/src/rules/headings.ts`
- Test: `packages/linter/test/rules/non-empty.test.ts`
- Test: `packages/linter/test/rules/headings.test.ts`

- [ ] **Step 1: Write the failing non-empty test.**
  Create `packages/linter/test/rules/non-empty.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { parseDocument } from "../../src/document.ts";
  import { nonEmptyRule } from "../../src/rules/non-empty.ts";

  describe("AMC-NONEMPTY", () => {
    test("passes when content is >= 100 non-whitespace chars", () => {
      const body = "# Project\n\n" + "This is a real instruction. ".repeat(6);
      const doc = parseDocument(body, { filename: "AGENTS.md" });
      expect(nonEmptyRule.check(doc)).toEqual([]);
    });

    test("warns on a near-empty stub (< 100 chars)", () => {
      const doc = parseDocument("# TODO\n", { filename: "AGENTS.md" });
      const f = nonEmptyRule.check(doc);
      expect(f.length).toBe(1);
      expect(f[0]!.ruleId).toBe("AMC-NONEMPTY");
      expect(f[0]!.severity).toBe("warn");
    });

    test("counts non-whitespace characters, not raw length", () => {
      const doc = parseDocument("#\n\n\n   \n\n\n", { filename: "AGENTS.md" });
      const f = nonEmptyRule.check(doc);
      expect(f.length).toBe(1);
    });
  });
  ```

- [ ] **Step 2: Write the failing headings test.**
  Create `packages/linter/test/rules/headings.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { parseDocument } from "../../src/document.ts";
  import { headingsRule } from "../../src/rules/headings.ts";

  describe("AMC-HEADINGS", () => {
    test("passes with a single H1 then H2s", () => {
      const doc = parseDocument("# Title\n\n## A\n\n## B\n", {
        filename: "AGENTS.md",
      });
      expect(headingsRule.check(doc)).toEqual([]);
    });

    test("warns when there are no headings", () => {
      const doc = parseDocument("Just prose, no headings.\n", {
        filename: "AGENTS.md",
      });
      const f = headingsRule.check(doc);
      expect(f.some((x) => x.message.includes("no headings"))).toBe(true);
      expect(f[0]!.ruleId).toBe("AMC-HEADINGS");
    });

    test("warns when a heading level is skipped (H1 -> H3)", () => {
      const doc = parseDocument("# Title\n\n### Deep\n", {
        filename: "AGENTS.md",
      });
      const f = headingsRule.check(doc);
      expect(f.some((x) => x.message.includes("skips"))).toBe(true);
    });

    test("does not flag descending back to a shallower level", () => {
      const doc = parseDocument("# T\n\n## A\n\n### A1\n\n## B\n", {
        filename: "AGENTS.md",
      });
      expect(headingsRule.check(doc)).toEqual([]);
    });
  });
  ```

- [ ] **Step 3: Run both tests (expected FAIL).**
  Run: `cd packages/linter && bun test test/rules/non-empty.test.ts test/rules/headings.test.ts`
  Expected: FAIL — modules not found.

- [ ] **Step 4: Implement non-empty (COMPLETE).**
  Create `packages/linter/src/rules/non-empty.ts`:
  ```ts
  import type { Rule, Finding } from "../types.ts";

  /** Minimum non-whitespace character count below which a file is a stub. */
  export const MIN_CONTENT_CHARS = 100;

  /**
   * AMC-NONEMPTY: an AGENTS.md should carry real, non-inferable instructions.
   * Files under MIN_CONTENT_CHARS of non-whitespace content are stubs.
   */
  export const nonEmptyRule: Rule = {
    id: "AMC-NONEMPTY",
    severity: "warn",
    description: `Flag stub files under ${MIN_CONTENT_CHARS} non-whitespace characters.`,
    check(doc): Finding[] {
      const contentChars = doc.raw.replace(/\s/g, "").length;
      if (contentChars >= MIN_CONTENT_CHARS) return [];
      return [
        {
          ruleId: "AMC-NONEMPTY",
          severity: "warn",
          message: `File is a near-empty stub (${contentChars} non-whitespace chars; expected >= ${MIN_CONTENT_CHARS}). Add real, non-inferable instructions.`,
          line: 1,
          fix: "Add setup/test commands, code style notes, and boundaries.",
        },
      ];
    },
  };
  ```

- [ ] **Step 5: Implement headings (COMPLETE).**
  Create `packages/linter/src/rules/headings.ts`:
  ```ts
  import type { Rule, Finding } from "../types.ts";

  /**
   * AMC-HEADINGS: require at least one heading and forbid skipped heading
   * levels (e.g. H1 directly to H3), which harms machine + human scanning.
   */
  export const headingsRule: Rule = {
    id: "AMC-HEADINGS",
    severity: "warn",
    description: "Require >= 1 heading and no skipped heading levels.",
    check(doc): Finding[] {
      const findings: Finding[] = [];
      if (doc.headings.length === 0) {
        findings.push({
          ruleId: "AMC-HEADINGS",
          severity: "warn",
          message:
            "Document has no headings. Use sections (e.g. ## Setup commands, ## Testing) so agents can navigate it.",
          line: 1,
          fix: "Add at least one ## section heading.",
        });
        return findings;
      }
      let prevDepth = doc.headings[0]!.depth;
      for (const h of doc.headings.slice(1)) {
        if (h.depth > prevDepth + 1) {
          findings.push({
            ruleId: "AMC-HEADINGS",
            severity: "warn",
            message: `Heading "${h.text}" skips from H${prevDepth} to H${h.depth}. Increase heading depth by one level at a time.`,
            line: h.line,
            fix: `Change "${h.text}" to an H${prevDepth + 1}.`,
          });
        }
        prevDepth = h.depth;
      }
      return findings;
    },
  };
  ```

- [ ] **Step 6: Run both tests (expected PASS).**
  Run: `cd packages/linter && bun test test/rules/non-empty.test.ts test/rules/headings.test.ts`
  Expected: PASS — all 7 tests pass.

- [ ] **Step 7: Commit.**
  ```bash
  git add packages/linter/src/rules/non-empty.ts packages/linter/src/rules/headings.ts packages/linter/test/rules/non-empty.test.ts packages/linter/test/rules/headings.test.ts
  git commit -m "$(cat <<'EOF'
  feat(linter): add AMC-NONEMPTY and AMC-HEADINGS structure rules

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 6: Rule AGM-002 recommended-sections

**Files:**
- Create: `packages/linter/src/rules/recommended-sections.ts`
- Test: `packages/linter/test/rules/recommended-sections.test.ts`

- [ ] **Step 1: Write the failing test.**
  Create `packages/linter/test/rules/recommended-sections.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { parseDocument } from "../../src/document.ts";
  import {
    recommendedSectionsRule,
    DEFAULT_REQUIRED_SECTIONS,
  } from "../../src/rules/recommended-sections.ts";

  const FULL = `# Project

  ## Setup commands
  \`\`\`bash
  bun install
  \`\`\`

  ## Testing instructions
  Run \`bun test\`.

  ## Project structure
  Monorepo with packages.

  ## Code style
  Use prettier.

  ## Git workflow
  Conventional commits.

  ## Boundaries
  - Always: run tests.
  - Ask first: schema changes.
  - Never: commit secrets.
  `;

  describe("AGM-002 recommended-sections", () => {
    test("passes when all default sections are present", () => {
      const doc = parseDocument(FULL, { filename: "AGENTS.md" });
      const f = recommendedSectionsRule.check(doc);
      expect(f.filter((x) => x.severity === "warn")).toEqual([]);
    });

    test("warns once per missing recommended section", () => {
      const doc = parseDocument("# Project\n\n## Setup commands\nbun install\n", {
        filename: "AGENTS.md",
      });
      const f = recommendedSectionsRule.check(doc);
      const warns = f.filter((x) => x.severity === "warn");
      expect(warns.length).toBe(DEFAULT_REQUIRED_SECTIONS.length - 1);
      expect(warns.every((x) => x.ruleId === "AGM-002")).toBe(true);
    });

    test("matches sections by synonym (Build and test commands satisfies Testing)", () => {
      const doc = parseDocument(
        "# P\n\n## Build and test commands\nbun test\n",
        { filename: "AGENTS.md" },
      );
      const f = recommendedSectionsRule.check(doc);
      const missing = f.map((x) => x.message);
      expect(missing.some((m) => m.includes("Testing"))).toBe(false);
    });

    test("honors a configurable required set", () => {
      const doc = parseDocument("# P\n\n## Code style\nprettier\n", {
        filename: "AGENTS.md",
      });
      const f = recommendedSectionsRule.check(doc, { required: ["Code Style"] });
      expect(f.filter((x) => x.severity === "warn")).toEqual([]);
    });

    test("suggests three-tier boundaries (INFO) when boundaries lack all tiers", () => {
      const doc = parseDocument(
        "# P\n\n## Boundaries\n- Never commit secrets.\n",
        { filename: "AGENTS.md" },
      );
      const f = recommendedSectionsRule.check(doc);
      expect(
        f.some((x) => x.severity === "info" && x.message.includes("three-tier")),
      ).toBe(true);
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  Run: `cd packages/linter && bun test test/rules/recommended-sections.test.ts`
  Expected: FAIL — module not found.

- [ ] **Step 3: Implement recommended-sections (COMPLETE).**
  Create `packages/linter/src/rules/recommended-sections.ts`:
  ```ts
  import type { Rule, Finding } from "../types.ts";

  /** Canonical recommended section names (conventional, not required by spec). */
  export const DEFAULT_REQUIRED_SECTIONS = [
    "Commands/Setup",
    "Testing",
    "Project Structure",
    "Code Style",
    "Git Workflow",
    "Boundaries",
  ] as const;

  /** Lowercased keyword groups; a section matches if any keyword is a substring. */
  const SECTION_SYNONYMS: Record<string, string[]> = {
    "Commands/Setup": ["setup", "commands", "dev environment", "getting started"],
    Testing: ["test", "testing"],
    "Project Structure": ["project structure", "structure", "architecture", "layout"],
    "Code Style": ["code style", "style", "formatting", "lint"],
    "Git Workflow": ["git", "commit", "pr instructions", "pull request", "branch"],
    Boundaries: ["boundaries", "do not", "never", "always", "ask first", "constraints"],
  };

  const BOUNDARY_TIERS = [
    { name: "always-do", keywords: ["always", "do:"] },
    { name: "ask-first", keywords: ["ask first", "ask-first", "ask before"] },
    { name: "never-do", keywords: ["never", "do not", "don't"] },
  ];

  function headingMatches(headingsLower: string[], keywords: string[]): boolean {
    return headingsLower.some((h) => keywords.some((k) => h.includes(k)));
  }

  /**
   * AGM-002: warn for each missing recommended section, and emit an INFO when a
   * Boundaries section exists but does not express all three tiers.
   */
  export const recommendedSectionsRule: Rule = {
    id: "AGM-002",
    severity: "warn",
    description:
      "Recommended sections (Setup, Testing, Structure, Code Style, Git, Boundaries) should be present.",
    check(doc, config): Finding[] {
      const required =
        (config?.required as string[] | undefined) ??
        [...DEFAULT_REQUIRED_SECTIONS];
      const headingsLower = doc.headings.map((h) => h.text.toLowerCase());
      const findings: Finding[] = [];

      for (const section of required) {
        const keywords = SECTION_SYNONYMS[section] ?? [section.toLowerCase()];
        if (!headingMatches(headingsLower, keywords)) {
          findings.push({
            ruleId: "AGM-002",
            severity: "warn",
            message: `Missing recommended "${section}" section.`,
            line: 1,
            fix: `Add a "## ${section}" section.`,
          });
        }
      }

      // Three-tier boundaries suggestion (INFO).
      const hasBoundaries = headingMatches(
        headingsLower,
        SECTION_SYNONYMS["Boundaries"]!,
      );
      if (hasBoundaries) {
        const bodyLower = doc.raw.toLowerCase();
        const presentTiers = BOUNDARY_TIERS.filter((t) =>
          t.keywords.some((k) => bodyLower.includes(k)),
        );
        if (presentTiers.length < 3) {
          findings.push({
            ruleId: "AGM-002",
            severity: "info",
            message:
              "Consider a three-tier Boundaries section: always-do, ask-first, and never-do. Pair each never-do with a positive do.",
            line: 1,
            fix: "Group boundaries under always-do / ask-first / never-do.",
          });
        }
      }

      return findings;
    },
  };
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  Run: `cd packages/linter && bun test test/rules/recommended-sections.test.ts`
  Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/linter/src/rules/recommended-sections.ts packages/linter/test/rules/recommended-sections.test.ts
  git commit -m "$(cat <<'EOF'
  feat(linter): add AGM-002 recommended-sections rule

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 7: Length & byte rules (XP-007, AGM-003, AMC-LENGTH)

**Files:**
- Create: `packages/linter/src/rules/byte-cap.ts`
- Create: `packages/linter/src/rules/windsurf-chars.ts`
- Create: `packages/linter/src/rules/line-budget.ts`
- Test: `packages/linter/test/rules/length.test.ts`

- [ ] **Step 1: Write the failing length test.**
  Create `packages/linter/test/rules/length.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { parseDocument } from "../../src/document.ts";
  import { byteCapRule, CODEX_BYTE_CAP } from "../../src/rules/byte-cap.ts";
  import {
    windsurfCharsRule,
    WINDSURF_FILE_CHAR_CAP,
  } from "../../src/rules/windsurf-chars.ts";
  import {
    lineBudgetRule,
    SOFT_LINE_LIMIT,
    HEAVY_LINE_LIMIT,
  } from "../../src/rules/line-budget.ts";

  describe("XP-007 byte cap", () => {
    test("passes under the Codex 32 KiB cap", () => {
      const doc = parseDocument("# small\n", { filename: "AGENTS.md" });
      expect(byteCapRule.check(doc)).toEqual([]);
    });

    test("errors over the cap", () => {
      const big = "x".repeat(CODEX_BYTE_CAP + 1);
      const doc = parseDocument(big, { filename: "AGENTS.md" });
      const f = byteCapRule.check(doc);
      expect(f[0]!.ruleId).toBe("XP-007");
      expect(f[0]!.severity).toBe("error");
    });

    test("cap is configurable", () => {
      const doc = parseDocument("x".repeat(50), { filename: "AGENTS.md" });
      const f = byteCapRule.check(doc, { maxBytes: 10 });
      expect(f.length).toBe(1);
    });
  });

  describe("AGM-003 windsurf char cap", () => {
    test("warns over 6000 chars in a single file", () => {
      const doc = parseDocument("a".repeat(WINDSURF_FILE_CHAR_CAP + 1), {
        filename: "AGENTS.md",
      });
      const f = windsurfCharsRule.check(doc);
      expect(f[0]!.ruleId).toBe("AGM-003");
      expect(f[0]!.severity).toBe("warn");
    });

    test("passes under the cap", () => {
      const doc = parseDocument("a".repeat(100), { filename: "AGENTS.md" });
      expect(windsurfCharsRule.check(doc)).toEqual([]);
    });
  });

  describe("AMC-LENGTH line budgets", () => {
    test("passes under the soft limit", () => {
      const doc = parseDocument("x\n".repeat(50), { filename: "AGENTS.md" });
      expect(lineBudgetRule.check(doc)).toEqual([]);
    });

    test("warns over the soft limit", () => {
      const doc = parseDocument("x\n".repeat(SOFT_LINE_LIMIT + 5), {
        filename: "AGENTS.md",
      });
      const f = lineBudgetRule.check(doc);
      expect(f.length).toBe(1);
      expect(f[0]!.message).toContain("150");
    });

    test("emits a heavier warning over the heavy limit", () => {
      const doc = parseDocument("x\n".repeat(HEAVY_LINE_LIMIT + 5), {
        filename: "AGENTS.md",
      });
      const f = lineBudgetRule.check(doc);
      expect(f.length).toBe(1);
      expect(f[0]!.message).toContain("300");
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  Run: `cd packages/linter && bun test test/rules/length.test.ts`
  Expected: FAIL — modules not found.

- [ ] **Step 3: Implement byte-cap (COMPLETE).**
  Create `packages/linter/src/rules/byte-cap.ts`:
  ```ts
  import type { Rule, Finding } from "../types.ts";

  /** Codex truncates AGENTS.md at 32 KiB by default. */
  export const CODEX_BYTE_CAP = 32768;

  /**
   * XP-007: error when the file exceeds the Codex byte cap (configurable via
   * { maxBytes }). Past the cap, Codex silently truncates the file.
   */
  export const byteCapRule: Rule = {
    id: "XP-007",
    severity: "error",
    description: `Stay within the Codex ${CODEX_BYTE_CAP}-byte cap (configurable).`,
    check(doc, config): Finding[] {
      const maxBytes = (config?.maxBytes as number | undefined) ?? CODEX_BYTE_CAP;
      if (doc.byteLength <= maxBytes) return [];
      return [
        {
          ruleId: "XP-007",
          severity: "error",
          message: `File is ${doc.byteLength} bytes, over the ${maxBytes}-byte cap. Codex truncates past this; trim or split into nested AGENTS.md files.`,
          line: 1,
          fix: "Move package-specific detail into nested AGENTS.md files.",
        },
      ];
    },
  };
  ```

- [ ] **Step 4: Implement windsurf-chars (COMPLETE).**
  Create `packages/linter/src/rules/windsurf-chars.ts`:
  ```ts
  import type { Rule, Finding } from "../types.ts";

  /** Windsurf reads at most 6,000 characters from a single rules file. */
  export const WINDSURF_FILE_CHAR_CAP = 6000;

  /**
   * AGM-003: warn when the file exceeds the per-file Windsurf char cap. The
   * 12,000-char total cap is enforced across files by the orchestrator.
   */
  export const windsurfCharsRule: Rule = {
    id: "AGM-003",
    severity: "warn",
    description: `Stay within the Windsurf ${WINDSURF_FILE_CHAR_CAP}-char per-file cap.`,
    check(doc, config): Finding[] {
      const cap =
        (config?.maxChars as number | undefined) ?? WINDSURF_FILE_CHAR_CAP;
      if (doc.raw.length <= cap) return [];
      return [
        {
          ruleId: "AGM-003",
          severity: "warn",
          message: `File is ${doc.raw.length} chars, over the Windsurf ${cap}-char per-file cap. Windsurf ignores content past this.`,
          line: 1,
          fix: "Trim prose or split into nested AGENTS.md files.",
        },
      ];
    },
  };
  ```

- [ ] **Step 5: Implement line-budget (COMPLETE).**
  Create `packages/linter/src/rules/line-budget.ts`:
  ```ts
  import type { Rule, Finding } from "../types.ts";

  /** Sweet spot is ~100-150 lines; warn beyond this soft limit. */
  export const SOFT_LINE_LIMIT = 150;
  /** Gains reverse hard beyond ~300 lines; emit a heavier warning. */
  export const HEAVY_LINE_LIMIT = 300;

  function countLines(raw: string): number {
    const trimmed = raw.replace(/\n+$/, "");
    return trimmed.length === 0 ? 0 : trimmed.split("\n").length;
  }

  /**
   * AMC-LENGTH: warn over the soft 150-line budget; emit a stronger warning
   * over 300 lines, where evidence shows correctness gains reverse.
   */
  export const lineBudgetRule: Rule = {
    id: "AMC-LENGTH",
    severity: "warn",
    description: `Keep files under ${SOFT_LINE_LIMIT} lines (hard warning over ${HEAVY_LINE_LIMIT}).`,
    check(doc, config): Finding[] {
      const soft = (config?.softLimit as number | undefined) ?? SOFT_LINE_LIMIT;
      const heavy = (config?.heavyLimit as number | undefined) ?? HEAVY_LINE_LIMIT;
      const lineCount = countLines(doc.raw);
      if (lineCount > heavy) {
        return [
          {
            ruleId: "AMC-LENGTH",
            severity: "warn",
            message: `File is ${lineCount} lines, well over ${heavy}. Beyond ~300 lines correctness gains reverse — split into nested files and link references.`,
            line: 1,
            fix: "Aggressively trim; move detail to nested AGENTS.md or linked docs.",
          },
        ];
      }
      if (lineCount > soft) {
        return [
          {
            ruleId: "AMC-LENGTH",
            severity: "warn",
            message: `File is ${lineCount} lines, over the ${soft}-line sweet spot. Trim toward 100-150 lines.`,
            line: 1,
            fix: "Remove inferable detail; point to linters/formatters instead of prose.",
          },
        ];
      }
      return [];
    },
  };
  ```

- [ ] **Step 6: Run the test (expected PASS).**
  Run: `cd packages/linter && bun test test/rules/length.test.ts`
  Expected: PASS — 8 tests pass.

- [ ] **Step 7: Commit.**
  ```bash
  git add packages/linter/src/rules/byte-cap.ts packages/linter/src/rules/windsurf-chars.ts packages/linter/src/rules/line-budget.ts packages/linter/test/rules/length.test.ts
  git commit -m "$(cat <<'EOF'
  feat(linter): add XP-007, AGM-003 and AMC-LENGTH length/byte rules

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 8: Content-quality rules (platitudes, executable command, versions, naked don'ts)

**Files:**
- Create: `packages/linter/src/rules/vague-platitudes.ts`
- Create: `packages/linter/src/rules/executable-command.ts`
- Create: `packages/linter/src/rules/version-specifics.ts`
- Create: `packages/linter/src/rules/naked-donts.ts`
- Test: `packages/linter/test/rules/content-quality.test.ts`

- [ ] **Step 1: Write the failing content-quality test.**
  Create `packages/linter/test/rules/content-quality.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { parseDocument } from "../../src/document.ts";
  import { vaguePlatitudesRule } from "../../src/rules/vague-platitudes.ts";
  import { executableCommandRule } from "../../src/rules/executable-command.ts";
  import { versionSpecificsRule } from "../../src/rules/version-specifics.ts";
  import { nakedDontsRule } from "../../src/rules/naked-donts.ts";

  describe("AMC-PLATITUDE", () => {
    test("warns on each distinct platitude", () => {
      const doc = parseDocument(
        "# P\n\nWrite clean code and follow best practices. Be helpful.\n",
        { filename: "AGENTS.md" },
      );
      const f = vaguePlatitudesRule.check(doc);
      expect(f.length).toBeGreaterThanOrEqual(2);
      expect(f.every((x) => x.ruleId === "AMC-PLATITUDE")).toBe(true);
      expect(f[0]!.severity).toBe("warn");
    });

    test("passes with concrete instructions", () => {
      const doc = parseDocument(
        "# P\n\nRun `bun test` before pushing. Use 2-space indent.\n",
        { filename: "AGENTS.md" },
      );
      expect(vaguePlatitudesRule.check(doc)).toEqual([]);
    });
  });

  describe("AMC-CMD", () => {
    test("passes when a runnable command exists", () => {
      const doc = parseDocument(
        "# P\n\n## Setup\n```bash\nbun install --frozen-lockfile\n```\n",
        { filename: "AGENTS.md" },
      );
      expect(executableCommandRule.check(doc)).toEqual([]);
    });

    test("warns when there are no runnable commands", () => {
      const doc = parseDocument("# P\n\nThis project is a website.\n", {
        filename: "AGENTS.md",
      });
      const f = executableCommandRule.check(doc);
      expect(f[0]!.ruleId).toBe("AMC-CMD");
      expect(f[0]!.severity).toBe("warn");
    });
  });

  describe("AMC-VERSION", () => {
    test("info when a known tool has no version pin anywhere", () => {
      const doc = parseDocument(
        "# P\n\nUse node and bun.\n```bash\nbun install\n```\n",
        { filename: "AGENTS.md" },
      );
      const f = versionSpecificsRule.check(doc);
      expect(f[0]!.ruleId).toBe("AMC-VERSION");
      expect(f[0]!.severity).toBe("info");
    });

    test("passes when a version number is present", () => {
      const doc = parseDocument(
        "# P\n\nRequires Node 20.11 and Bun 1.1.\n```bash\nbun install\n```\n",
        { filename: "AGENTS.md" },
      );
      expect(versionSpecificsRule.check(doc)).toEqual([]);
    });
  });

  describe("AMC-DONTS", () => {
    test("warns when >20 don'ts appear", () => {
      const donts = Array.from({ length: 21 }, (_, i) => `- Never do thing ${i}.`).join("\n");
      const doc = parseDocument(`# P\n\n## Boundaries\n${donts}\n`, {
        filename: "AGENTS.md",
      });
      const f = nakedDontsRule.check(doc);
      expect(f[0]!.ruleId).toBe("AMC-DONTS");
      expect(f[0]!.severity).toBe("warn");
    });

    test("warns when don't:do ratio is high", () => {
      const doc = parseDocument(
        "# P\n\n- Never commit secrets.\n- Do not push to main.\n- Don't skip tests.\n- Always run tests.\n",
        { filename: "AGENTS.md" },
      );
      const f = nakedDontsRule.check(doc);
      expect(f.length).toBe(1);
    });

    test("passes with balanced do/don't", () => {
      const doc = parseDocument(
        "# P\n\n- Always run `bun test`.\n- Do format with prettier.\n- Never commit secrets.\n",
        { filename: "AGENTS.md" },
      );
      expect(nakedDontsRule.check(doc)).toEqual([]);
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  Run: `cd packages/linter && bun test test/rules/content-quality.test.ts`
  Expected: FAIL — modules not found.

- [ ] **Step 3: Implement vague-platitudes (COMPLETE).**
  Create `packages/linter/src/rules/vague-platitudes.ts`:
  ```ts
  import type { Rule, Finding } from "../types.ts";

  /** High-signal vague platitudes that waste tokens without informing the agent. */
  export const PLATITUDES = [
    "write clean code",
    "follow best practices",
    "use good naming",
    "be helpful",
    "helpful coding assistant",
    "write maintainable code",
    "follow industry standards",
    "use proper error handling",
    "write readable code",
    "be professional",
  ];

  /**
   * AMC-PLATITUDE: warn for each vague platitude. Frontier models already do
   * these; spelling them out wastes the budget on inferable instructions.
   */
  export const vaguePlatitudesRule: Rule = {
    id: "AMC-PLATITUDE",
    severity: "warn",
    description: "Flag vague platitudes that waste budget on inferable advice.",
    check(doc): Finding[] {
      const lower = doc.raw.toLowerCase();
      const findings: Finding[] = [];
      for (const phrase of PLATITUDES) {
        const idx = lower.indexOf(phrase);
        if (idx !== -1) {
          const line = doc.raw.slice(0, idx).split("\n").length;
          findings.push({
            ruleId: "AMC-PLATITUDE",
            severity: "warn",
            message: `Vague platitude "${phrase}". Replace with a concrete, non-inferable instruction or remove it.`,
            line,
            fix: `Remove "${phrase}" or replace with a specific command/rule.`,
          });
        }
      }
      return findings;
    },
  };
  ```

- [ ] **Step 4: Implement executable-command (COMPLETE).**
  Create `packages/linter/src/rules/executable-command.ts`:
  ```ts
  import type { Rule, Finding } from "../types.ts";

  /**
   * AMC-CMD: require at least one runnable shell command. The single most
   * valuable AGENTS.md content is exact, copy-pasteable commands.
   */
  export const executableCommandRule: Rule = {
    id: "AMC-CMD",
    severity: "warn",
    description: "Require >= 1 runnable shell command (with flags where relevant).",
    check(doc): Finding[] {
      if (doc.commands.length > 0) return [];
      return [
        {
          ruleId: "AMC-CMD",
          severity: "warn",
          message:
            "No runnable shell commands found. Add exact setup/test/build commands (e.g. `bun install`, `bun test`) — agents auto-execute these.",
          line: 1,
          fix: "Add a Setup/Testing section with fenced shell commands.",
        },
      ];
    },
  };
  ```

- [ ] **Step 5: Implement version-specifics (COMPLETE).**
  Create `packages/linter/src/rules/version-specifics.ts`:
  ```ts
  import type { Rule, Finding } from "../types.ts";

  /** Tools whose version often matters for reproducible agent runs. */
  const VERSIONABLE_TOOLS = [
    "node",
    "bun",
    "deno",
    "python",
    "go",
    "rust",
    "java",
    "ruby",
    "php",
    "dotnet",
  ];

  /** Matches a version number like 20, 20.11, 1.1.0, v18, ^5.6. */
  const VERSION_PATTERN = /\b[v^~]?\d+(\.\d+){1,2}\b|\bnode\s*\d+\b|\b\d+\.x\b/i;

  /**
   * AMC-VERSION: INFO when versionable tools are named but no version pin
   * appears anywhere. Naming a tool with its version improves reproducibility.
   */
  export const versionSpecificsRule: Rule = {
    id: "AMC-VERSION",
    severity: "info",
    description: "Suggest pinning tool/runtime versions when tools are named.",
    check(doc): Finding[] {
      const lower = doc.raw.toLowerCase();
      const mentionsTool = VERSIONABLE_TOOLS.some((t) =>
        new RegExp(`\\b${t}\\b`).test(lower),
      );
      if (!mentionsTool) return [];
      if (VERSION_PATTERN.test(doc.raw)) return [];
      return [
        {
          ruleId: "AMC-VERSION",
          severity: "info",
          message:
            "Runtimes/tools are named without version pins. Add versions (e.g. Node 20.11, Bun 1.1) for reproducible agent runs.",
          line: 1,
          fix: "Add a stack-with-versions line or note in setup.",
        },
      ];
    },
  };
  ```

- [ ] **Step 6: Implement naked-donts (COMPLETE).**
  Create `packages/linter/src/rules/naked-donts.ts`:
  ```ts
  import type { Rule, Finding } from "../types.ts";

  /** Default thresholds for the don't:do ratio rule. */
  export const MAX_DONTS = 20;
  export const MAX_DONT_RATIO = 2;

  const DONT_PATTERN = /\b(never|do not|don't|do not ever|avoid|no )\b/gi;
  const DO_PATTERN = /\b(always|do |use |run |prefer |ensure |make sure)\b/gi;

  function countMatches(text: string, pattern: RegExp): number {
    const m = text.match(pattern);
    return m ? m.length : 0;
  }

  /**
   * AMC-DONTS: warn when there are more than MAX_DONTS prohibitions, or when the
   * don't:do ratio exceeds MAX_DONT_RATIO. Excessive naked don'ts slow agents.
   */
  export const nakedDontsRule: Rule = {
    id: "AMC-DONTS",
    severity: "warn",
    description: "Flag too many naked don'ts or a high don't:do ratio.",
    check(doc, config): Finding[] {
      const maxDonts = (config?.maxDonts as number | undefined) ?? MAX_DONTS;
      const maxRatio = (config?.maxRatio as number | undefined) ?? MAX_DONT_RATIO;
      const lower = doc.raw.toLowerCase();
      const donts = countMatches(lower, DONT_PATTERN);
      const dos = countMatches(lower, DO_PATTERN);

      if (donts > maxDonts) {
        return [
          {
            ruleId: "AMC-DONTS",
            severity: "warn",
            message: `${donts} prohibitions found (>${maxDonts}). Trim and pair each "never" with a positive "do".`,
            line: 1,
            fix: "Convert don'ts into do-this-instead guidance.",
          },
        ];
      }
      if (donts >= 3 && dos > 0 && donts / dos > maxRatio) {
        return [
          {
            ruleId: "AMC-DONTS",
            severity: "warn",
            message: `High don't:do ratio (${donts} don'ts vs ${dos} dos). Pair prohibitions with positive guidance.`,
            line: 1,
            fix: "Add positive do-this instructions alongside the don'ts.",
          },
        ];
      }
      if (donts >= 3 && dos === 0) {
        return [
          {
            ruleId: "AMC-DONTS",
            severity: "warn",
            message: `${donts} naked don'ts with no positive "do" guidance. Pair each don't with a do.`,
            line: 1,
            fix: "Add positive do-this instructions alongside the don'ts.",
          },
        ];
      }
      return [];
    },
  };
  ```

- [ ] **Step 7: Run the test (expected PASS).**
  Run: `cd packages/linter && bun test test/rules/content-quality.test.ts`
  Expected: PASS — 9 tests pass.

- [ ] **Step 8: Commit.**
  ```bash
  git add packages/linter/src/rules/vague-platitudes.ts packages/linter/src/rules/executable-command.ts packages/linter/src/rules/version-specifics.ts packages/linter/src/rules/naked-donts.ts packages/linter/test/rules/content-quality.test.ts
  git commit -m "$(cat <<'EOF'
  feat(linter): add content-quality rules (platitudes, cmd, version, don'ts)

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 9: Security rule AMC-SECRET (inline secret detection)

**Files:**
- Create: `packages/linter/src/rules/inline-secret.ts`
- Test: `packages/linter/test/rules/inline-secret.test.ts`

- [ ] **Step 1: Write the failing test.**
  Create `packages/linter/test/rules/inline-secret.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { parseDocument } from "../../src/document.ts";
  import { inlineSecretRule } from "../../src/rules/inline-secret.ts";

  describe("AMC-SECRET", () => {
    test("detects an AWS access key id", () => {
      const doc = parseDocument("# P\n\nKey: AKIAIOSFODNN7EXAMPLE\n", {
        filename: "AGENTS.md",
      });
      const f = inlineSecretRule.check(doc);
      expect(f[0]!.ruleId).toBe("AMC-SECRET");
      expect(f[0]!.severity).toBe("error");
    });

    test("detects a private key header", () => {
      const doc = parseDocument(
        "# P\n\n```\n-----BEGIN RSA PRIVATE KEY-----\n```\n",
        { filename: "AGENTS.md" },
      );
      expect(inlineSecretRule.check(doc).length).toBeGreaterThan(0);
    });

    test("detects a generic api key assignment", () => {
      const doc = parseDocument(
        '# P\n\napi_key = "sk_live_0123456789abcdef0123456789"\n',
        { filename: "AGENTS.md" },
      );
      const f = inlineSecretRule.check(doc);
      expect(f.length).toBeGreaterThan(0);
    });

    test("reports the line number", () => {
      const doc = parseDocument("# P\n\nline2\nAKIAIOSFODNN7EXAMPLE\n", {
        filename: "AGENTS.md",
      });
      const f = inlineSecretRule.check(doc);
      expect(f[0]!.line).toBe(4);
    });

    test("passes on a clean file with the word 'secret' but no value", () => {
      const doc = parseDocument("# P\n\nNever commit secrets to the repo.\n", {
        filename: "AGENTS.md",
      });
      expect(inlineSecretRule.check(doc)).toEqual([]);
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  Run: `cd packages/linter && bun test test/rules/inline-secret.test.ts`
  Expected: FAIL — module not found.

- [ ] **Step 3: Implement inline-secret (COMPLETE).**
  Create `packages/linter/src/rules/inline-secret.ts`:
  ```ts
  import type { Rule, Finding } from "../types.ts";

  interface SecretPattern {
    name: string;
    pattern: RegExp;
  }

  /** High-signal secret patterns; deliberately conservative to avoid noise. */
  const SECRET_PATTERNS: SecretPattern[] = [
    { name: "AWS access key id", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
    {
      name: "private key header",
      pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/,
    },
    {
      name: "Stripe/live API key",
      pattern: /\bsk_(?:live|test)_[0-9a-zA-Z]{16,}\b/,
    },
    {
      name: "GitHub token",
      pattern: /\bgh[pousr]_[0-9A-Za-z]{36,}\b/,
    },
    {
      name: "generic API key assignment",
      pattern:
        /\b(?:api[_-]?key|secret|token|password|passwd|access[_-]?token)\b\s*[:=]\s*["']?[0-9A-Za-z._\-]{16,}["']?/i,
    },
  ];

  /**
   * AMC-SECRET: error when an inlined credential is detected. Anything in
   * AGENTS.md is read (and may be echoed) by agents, so secrets must never live
   * here. Plain prose like "never commit secrets" (no value) does not match.
   */
  export const inlineSecretRule: Rule = {
    id: "AMC-SECRET",
    severity: "error",
    description: "Detect inlined secrets (AWS keys, private keys, API tokens).",
    check(doc): Finding[] {
      const findings: Finding[] = [];
      doc.lines.forEach((lineText, idx) => {
        for (const { name, pattern } of SECRET_PATTERNS) {
          if (pattern.test(lineText)) {
            findings.push({
              ruleId: "AMC-SECRET",
              severity: "error",
              message: `Possible inlined secret (${name}) on this line. Remove it; AGENTS.md is read verbatim by agents.`,
              line: idx + 1,
              fix: "Delete the secret and reference an env var or secret manager instead.",
            });
            break;
          }
        }
      });
      return findings;
    },
  };
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  Run: `cd packages/linter && bun test test/rules/inline-secret.test.ts`
  Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/linter/src/rules/inline-secret.ts packages/linter/test/rules/inline-secret.test.ts
  git commit -m "$(cat <<'EOF'
  feat(linter): add AMC-SECRET inline-secret detection rule

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 10: Frontmatter rule AMC-FRONTMATTER (forward-compat)

**Files:**
- Create: `packages/linter/src/rules/frontmatter.ts`
- Test: `packages/linter/test/rules/frontmatter.test.ts`

- [ ] **Step 1: Write the failing test.**
  Create `packages/linter/test/rules/frontmatter.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { parseDocument } from "../../src/document.ts";
  import { frontmatterRule } from "../../src/rules/frontmatter.ts";

  describe("AMC-FRONTMATTER", () => {
    test("passes when there is no frontmatter", () => {
      const doc = parseDocument("# Title\n", { filename: "AGENTS.md" });
      expect(frontmatterRule.check(doc)).toEqual([]);
    });

    test("passes on valid description + tags", () => {
      const doc = parseDocument(
        "---\ndescription: A short summary\ntags:\n  - api\n  - node\n---\n# Title\n",
        { filename: "AGENTS.md" },
      );
      expect(frontmatterRule.check(doc)).toEqual([]);
    });

    test("warns when description is not a string", () => {
      const doc = parseDocument(
        "---\ndescription:\n  - oops\n---\n# Title\n",
        { filename: "AGENTS.md" },
      );
      const f = frontmatterRule.check(doc);
      expect(f.some((x) => x.message.includes("description"))).toBe(true);
      expect(f[0]!.severity).toBe("warn");
    });

    test("warns when description exceeds 200 chars", () => {
      const long = "x".repeat(201);
      const doc = parseDocument(`---\ndescription: ${long}\n---\n# T\n`, {
        filename: "AGENTS.md",
      });
      const f = frontmatterRule.check(doc);
      expect(f.some((x) => x.message.includes("200"))).toBe(true);
    });

    test("warns when tags is not a string array", () => {
      const doc = parseDocument(
        "---\ntags: not-a-list\n---\n# T\n",
        { filename: "AGENTS.md" },
      );
      const f = frontmatterRule.check(doc);
      expect(f.some((x) => x.message.includes("tags"))).toBe(true);
    });

    test("never errors on unknown keys (forward-compat)", () => {
      const doc = parseDocument(
        "---\ndescription: ok\nfuture_key: whatever\nnested:\n  a: 1\n---\n# T\n",
        { filename: "AGENTS.md" },
      );
      const f = frontmatterRule.check(doc);
      expect(f.filter((x) => x.severity === "error")).toEqual([]);
      expect(f).toEqual([]);
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  Run: `cd packages/linter && bun test test/rules/frontmatter.test.ts`
  Expected: FAIL — module not found.

- [ ] **Step 3: Implement frontmatter (COMPLETE).**
  Create `packages/linter/src/rules/frontmatter.ts`:
  ```ts
  import type { Rule, Finding } from "../types.ts";

  /** Suggested max length for the optional v1.1 description field. */
  export const MAX_DESCRIPTION_CHARS = 200;

  /**
   * AMC-FRONTMATTER: frontmatter is OPTIONAL (draft v1.1). When present, lightly
   * validate the two known keys (description: string <200, tags: string[]).
   * Unknown keys are ignored for forward-compatibility and never error.
   */
  export const frontmatterRule: Rule = {
    id: "AMC-FRONTMATTER",
    severity: "warn",
    description:
      "Validate optional v1.1 frontmatter (description, tags); ignore unknown keys.",
    check(doc): Finding[] {
      const fm = doc.frontmatter;
      if (fm === null) return [];
      const findings: Finding[] = [];

      if ("description" in fm) {
        const d = fm["description"];
        if (typeof d !== "string") {
          findings.push({
            ruleId: "AMC-FRONTMATTER",
            severity: "warn",
            message: "Frontmatter `description` should be a string.",
            line: 1,
            fix: "Set description to a single short string.",
          });
        } else if (d.length > MAX_DESCRIPTION_CHARS) {
          findings.push({
            ruleId: "AMC-FRONTMATTER",
            severity: "warn",
            message: `Frontmatter \`description\` is ${d.length} chars; keep it under ${MAX_DESCRIPTION_CHARS}.`,
            line: 1,
            fix: "Shorten the description.",
          });
        }
      }

      if ("tags" in fm) {
        const t = fm["tags"];
        const isStringArray =
          Array.isArray(t) && t.every((x) => typeof x === "string");
        if (!isStringArray) {
          findings.push({
            ruleId: "AMC-FRONTMATTER",
            severity: "warn",
            message: "Frontmatter `tags` should be an array of strings.",
            line: 1,
            fix: "Use a YAML list of string tags.",
          });
        }
      }

      return findings;
    },
  };
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  Run: `cd packages/linter && bun test test/rules/frontmatter.test.ts`
  Expected: PASS — 6 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/linter/src/rules/frontmatter.ts packages/linter/test/rules/frontmatter.test.ts
  git commit -m "$(cat <<'EOF'
  feat(linter): add AMC-FRONTMATTER forward-compatible frontmatter rule

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 11: Freshness rules (AMC-PATH, AMC-SCRIPT, AMC-STALE) — repo-context only

**Files:**
- Create: `packages/linter/src/rules/freshness.ts`
- Test: `packages/linter/test/rules/freshness.test.ts`

- [ ] **Step 1: Write the failing test.**
  Create `packages/linter/test/rules/freshness.test.ts`:
  ```ts
  import { test, expect, describe, beforeEach, afterEach } from "bun:test";
  import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import { parseDocument } from "../../src/document.ts";
  import {
    referencedPathsRule,
    referencedScriptsRule,
    staleMarkersRule,
  } from "../../src/rules/freshness.ts";

  let repo: string;

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), "amc-fresh-"));
    mkdirSync(join(repo, "src"));
    writeFileSync(join(repo, "src", "index.ts"), "export {};\n");
    writeFileSync(
      join(repo, "package.json"),
      JSON.stringify({ scripts: { test: "bun test", build: "bun build" } }),
    );
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  describe("AMC-PATH referenced paths exist", () => {
    test("no findings without repo context (standalone)", () => {
      const doc = parseDocument("See `src/missing.ts`.\n", {
        filename: "AGENTS.md",
      });
      expect(referencedPathsRule.check(doc)).toEqual([]);
    });

    test("passes when referenced path exists", () => {
      const doc = parseDocument("Entry: `src/index.ts`.\n", {
        filename: "AGENTS.md",
        root: repo,
      });
      expect(referencedPathsRule.check(doc)).toEqual([]);
    });

    test("errors when referenced path is missing", () => {
      const doc = parseDocument("Entry: `src/missing.ts`.\n", {
        filename: "AGENTS.md",
        root: repo,
      });
      const f = referencedPathsRule.check(doc);
      expect(f[0]!.ruleId).toBe("AMC-PATH");
      expect(f[0]!.severity).toBe("error");
    });
  });

  describe("AMC-SCRIPT referenced npm scripts exist", () => {
    test("passes for an existing script", () => {
      const doc = parseDocument("Run `npm run test`.\n", {
        filename: "AGENTS.md",
        root: repo,
      });
      expect(referencedScriptsRule.check(doc)).toEqual([]);
    });

    test("warns for a missing script", () => {
      const doc = parseDocument("Run `npm run nope`.\n", {
        filename: "AGENTS.md",
        root: repo,
      });
      const f = referencedScriptsRule.check(doc);
      expect(f[0]!.ruleId).toBe("AMC-SCRIPT");
      expect(f[0]!.severity).toBe("warn");
    });
  });

  describe("AMC-STALE markers", () => {
    test("info on TODO/FIXME", () => {
      const doc = parseDocument("# P\n\nTODO: finish this.\n", {
        filename: "AGENTS.md",
        root: repo,
      });
      const f = staleMarkersRule.check(doc);
      expect(f.some((x) => x.ruleId === "AMC-STALE")).toBe(true);
      expect(f[0]!.severity).toBe("info");
    });

    test("info on a stale year", () => {
      const doc = parseDocument("# P\n\nUpdated in 2019.\n", {
        filename: "AGENTS.md",
        root: repo,
      });
      const f = staleMarkersRule.check(doc);
      expect(f.some((x) => x.message.includes("2019"))).toBe(true);
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  Run: `cd packages/linter && bun test test/rules/freshness.test.ts`
  Expected: FAIL — module not found.

- [ ] **Step 3: Implement freshness (COMPLETE).**
  Create `packages/linter/src/rules/freshness.ts`:
  ```ts
  import { existsSync, readFileSync } from "node:fs";
  import { join, isAbsolute } from "node:path";
  import type { Rule, Finding } from "../types.ts";

  /** Years older than this (relative to a fixed baseline) are flagged as stale. */
  export const STALE_YEAR_BEFORE = 2024;

  /** Matches inline-code path-like tokens (contain a slash or a dotted file). */
  const PATHLIKE = /^[\w.@\-]+(?:\/[\w.@\-]+)+\/?$|^[\w\-]+\.[a-z0-9]{1,6}$/i;

  function inlineCodeTokens(doc: { commands: { text: string }[]; raw: string }): string[] {
    const tokens = new Set<string>();
    const re = /`([^`\n]+)`/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(doc.raw)) !== null) {
      tokens.add(m[1]!.trim());
    }
    return [...tokens];
  }

  /**
   * AMC-PATH: error when a referenced repo path does not exist. Runs only in
   * repo-context mode (doc.repoRoot set); standalone mode returns nothing.
   */
  export const referencedPathsRule: Rule = {
    id: "AMC-PATH",
    severity: "error",
    requiresRepo: true,
    description: "Referenced repo paths must exist (repo-context mode only).",
    check(doc): Finding[] {
      if (!doc.repoRoot) return [];
      const findings: Finding[] = [];
      for (const token of inlineCodeTokens(doc)) {
        const candidate = token.replace(/^\.\//, "");
        if (!PATHLIKE.test(candidate)) continue;
        if (candidate.includes(" ")) continue;
        const abs = isAbsolute(candidate)
          ? candidate
          : join(doc.repoRoot, candidate);
        if (!existsSync(abs)) {
          const line = doc.raw.slice(0, doc.raw.indexOf(token)).split("\n").length;
          findings.push({
            ruleId: "AMC-PATH",
            severity: "error",
            message: `Referenced path \`${token}\` does not exist in the repo.`,
            line,
            fix: "Fix the path or remove the stale reference.",
          });
        }
      }
      return findings;
    },
  };

  /**
   * AMC-SCRIPT: warn when a referenced `npm/bun/pnpm/yarn run <script>` is not in
   * the repo's package.json. Repo-context mode only.
   */
  export const referencedScriptsRule: Rule = {
    id: "AMC-SCRIPT",
    severity: "warn",
    requiresRepo: true,
    description:
      "Referenced package.json scripts must exist (repo-context mode only).",
    check(doc): Finding[] {
      if (!doc.repoRoot) return [];
      const pkgPath = join(doc.repoRoot, "package.json");
      if (!existsSync(pkgPath)) return [];
      let scripts: Record<string, unknown> = {};
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
        scripts = (pkg.scripts as Record<string, unknown>) ?? {};
      } catch {
        return [];
      }
      const findings: Finding[] = [];
      const re = /\b(?:npm|bun|pnpm|yarn)\s+run\s+([\w:-]+)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(doc.raw)) !== null) {
        const script = m[1]!;
        if (!(script in scripts)) {
          const line = doc.raw.slice(0, m.index).split("\n").length;
          findings.push({
            ruleId: "AMC-SCRIPT",
            severity: "warn",
            message: `Referenced script "${script}" is not defined in package.json.`,
            line,
            fix: "Add the script to package.json or fix the reference.",
          });
        }
      }
      return findings;
    },
  };

  /**
   * AMC-STALE: INFO for TODO/FIXME markers and for years older than
   * STALE_YEAR_BEFORE. Repo-context mode only.
   */
  export const staleMarkersRule: Rule = {
    id: "AMC-STALE",
    severity: "info",
    requiresRepo: true,
    description:
      "Flag TODO/FIXME markers and stale years (repo-context mode only).",
    check(doc): Finding[] {
      if (!doc.repoRoot) return [];
      const findings: Finding[] = [];
      doc.lines.forEach((lineText, idx) => {
        if (/\b(TODO|FIXME)\b/.test(lineText)) {
          findings.push({
            ruleId: "AMC-STALE",
            severity: "info",
            message: "TODO/FIXME marker in AGENTS.md — resolve or remove before relying on it.",
            line: idx + 1,
          });
        }
        const yearMatch = lineText.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
          const year = Number(yearMatch[0]);
          if (year < STALE_YEAR_BEFORE) {
            findings.push({
              ruleId: "AMC-STALE",
              severity: "info",
              message: `Possibly stale year "${year}". Confirm the document is current.`,
              line: idx + 1,
            });
          }
        }
      });
      return findings;
    },
  };
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  Run: `cd packages/linter && bun test test/rules/freshness.test.ts`
  Expected: PASS — 7 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/linter/src/rules/freshness.ts packages/linter/test/rules/freshness.test.ts
  git commit -m "$(cat <<'EOF'
  feat(linter): add freshness rules AMC-PATH/AMC-SCRIPT/AMC-STALE

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 12: Rule registry

**Files:**
- Create: `packages/linter/src/rules/index.ts`
- Test: `packages/linter/test/rules/index.test.ts`

- [ ] **Step 1: Write the failing registry test.**
  Create `packages/linter/test/rules/index.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import {
    allRules,
    standaloneRules,
    freshnessRules,
  } from "../../src/rules/index.ts";

  describe("rule registry", () => {
    test("exposes every implemented rule once", () => {
      const ids = allRules.map((r) => r.id).sort();
      expect(ids).toEqual(
        [
          "AGM-001",
          "AGM-002",
          "AGM-003",
          "AMC-CMD",
          "AMC-DONTS",
          "AMC-FILENAME",
          "AMC-FRONTMATTER",
          "AMC-HEADINGS",
          "AMC-LENGTH",
          "AMC-NONEMPTY",
          "AMC-PATH",
          "AMC-PLATITUDE",
          "AMC-SCRIPT",
          "AMC-SECRET",
          "AMC-STALE",
          "AMC-VERSION",
          "XP-007",
        ].sort(),
      );
    });

    test("rule ids are unique", () => {
      const ids = allRules.map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    test("freshnessRules are exactly the requiresRepo rules", () => {
      expect(freshnessRules.every((r) => r.requiresRepo === true)).toBe(true);
      expect(freshnessRules.map((r) => r.id).sort()).toEqual([
        "AMC-PATH",
        "AMC-SCRIPT",
        "AMC-STALE",
      ]);
    });

    test("standaloneRules excludes all freshness rules", () => {
      expect(standaloneRules.some((r) => r.requiresRepo)).toBe(false);
      expect(standaloneRules.length + freshnessRules.length).toBe(
        allRules.length,
      );
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  Run: `cd packages/linter && bun test test/rules/index.test.ts`
  Expected: FAIL — module not found.

- [ ] **Step 3: Implement the registry (COMPLETE).**
  Create `packages/linter/src/rules/index.ts`:
  ```ts
  import type { Rule } from "../types.ts";
  import { validMarkdownRule } from "./valid-markdown.ts";
  import { filenameRule } from "./filename.ts";
  import { nonEmptyRule } from "./non-empty.ts";
  import { headingsRule } from "./headings.ts";
  import { recommendedSectionsRule } from "./recommended-sections.ts";
  import { byteCapRule } from "./byte-cap.ts";
  import { windsurfCharsRule } from "./windsurf-chars.ts";
  import { lineBudgetRule } from "./line-budget.ts";
  import { vaguePlatitudesRule } from "./vague-platitudes.ts";
  import { executableCommandRule } from "./executable-command.ts";
  import { versionSpecificsRule } from "./version-specifics.ts";
  import { nakedDontsRule } from "./naked-donts.ts";
  import { inlineSecretRule } from "./inline-secret.ts";
  import { frontmatterRule } from "./frontmatter.ts";
  import {
    referencedPathsRule,
    referencedScriptsRule,
    staleMarkersRule,
  } from "./freshness.ts";

  /** Every rule the linter ships. */
  export const allRules: Rule[] = [
    validMarkdownRule,
    filenameRule,
    nonEmptyRule,
    headingsRule,
    recommendedSectionsRule,
    byteCapRule,
    windsurfCharsRule,
    lineBudgetRule,
    vaguePlatitudesRule,
    executableCommandRule,
    versionSpecificsRule,
    nakedDontsRule,
    inlineSecretRule,
    frontmatterRule,
    referencedPathsRule,
    referencedScriptsRule,
    staleMarkersRule,
  ];

  /** Rules requiring repo context (freshness). */
  export const freshnessRules: Rule[] = allRules.filter(
    (r) => r.requiresRepo === true,
  );

  /** Rules that run without repo context. */
  export const standaloneRules: Rule[] = allRules.filter(
    (r) => r.requiresRepo !== true,
  );
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  Run: `cd packages/linter && bun test test/rules/index.test.ts`
  Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/linter/src/rules/index.ts packages/linter/test/rules/index.test.ts
  git commit -m "$(cat <<'EOF'
  feat(linter): add rule registry (all/standalone/freshness)

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 13: Scoring

**Files:**
- Create: `packages/linter/src/scoring.ts`
- Test: `packages/linter/test/scoring.test.ts`

- [ ] **Step 1: Write the failing scoring test.**
  Create `packages/linter/test/scoring.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { parseDocument } from "../src/document.ts";
  import { allRules } from "../src/rules/index.ts";
  import { scoreDocument, gradeFor, WEIGHTS } from "../src/scoring.ts";
  import type { Finding } from "../src/types.ts";

  function runRules(content: string): Finding[] {
    const doc = parseDocument(content, { filename: "AGENTS.md" });
    return allRules.flatMap((r) => r.check(doc));
  }

  const GOOD = `# Project Overview

  Small TS service. Node 20.11, Bun 1.1.

  ## Setup commands
  \`\`\`bash
  bun install --frozen-lockfile
  \`\`\`

  ## Build and test commands
  \`\`\`bash
  bun test
  bun run build
  \`\`\`

  ## Code style
  Formatted by prettier; run \`bun run lint\`.

  ## Git workflow
  Conventional commits; open a PR to develop.

  ## Boundaries
  - Always: run \`bun test\` before pushing.
  - Ask first: changing the DB schema.
  - Never: commit secrets — use env vars instead.

  See \`README.md\` for more.
  `;

  describe("scoring", () => {
    test("gradeFor maps score bands to letters", () => {
      expect(gradeFor(95)).toBe("A");
      expect(gradeFor(82)).toBe("B");
      expect(gradeFor(72)).toBe("C");
      expect(gradeFor(61)).toBe("D");
      expect(gradeFor(40)).toBe("F");
    });

    test("a strong file scores high (A or B)", () => {
      const doc = parseDocument(GOOD, { filename: "AGENTS.md" });
      const findings = allRules.flatMap((r) => r.check(doc));
      const { score, grade } = scoreDocument(doc, findings);
      expect(score).toBeGreaterThanOrEqual(80);
      expect(["A", "B"]).toContain(grade);
    });

    test("a stub scores low (D or F)", () => {
      const doc = parseDocument("# TODO\n", { filename: "AGENTS.md" });
      const findings = allRules.flatMap((r) => r.check(doc));
      const { score, grade } = scoreDocument(doc, findings);
      expect(score).toBeLessThan(65);
      expect(["D", "F"]).toContain(grade);
    });

    test("score is clamped to 0..100", () => {
      const doc = parseDocument("write clean code\n".repeat(40), {
        filename: "AGENTS.md",
      });
      const findings = allRules.flatMap((r) => r.check(doc));
      const { score } = scoreDocument(doc, findings);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test("WEIGHTS constants are explicit numbers", () => {
      expect(typeof WEIGHTS.errorPenalty).toBe("number");
      expect(typeof WEIGHTS.hasBuildAndTest).toBe("number");
      expect(WEIGHTS.base).toBe(100);
    });

    test("a platitude lowers the score versus a clean equivalent", () => {
      const clean = runRules(GOOD);
      const docClean = parseDocument(GOOD, { filename: "AGENTS.md" });
      const cleanScore = scoreDocument(docClean, clean).score;

      const withPlatitude = GOOD + "\nWrite clean code and be helpful.\n";
      const docBad = parseDocument(withPlatitude, { filename: "AGENTS.md" });
      const badScore = scoreDocument(docBad, allRules.flatMap((r) => r.check(docBad))).score;

      expect(badScore).toBeLessThan(cleanScore);
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  Run: `cd packages/linter && bun test test/scoring.test.ts`
  Expected: FAIL — module not found.

- [ ] **Step 3: Implement scoring (COMPLETE).**
  Create `packages/linter/src/scoring.ts`:
  ```ts
  import type { Document, Finding, Grade } from "./types.ts";

  /**
   * Explicit, tunable scoring weights. Score starts at WEIGHTS.base, gains
   * positive signal points, loses points for negative signals and findings,
   * then is clamped to 0..100.
   */
  export const WEIGHTS = {
    base: 100,

    // Finding penalties (per finding).
    errorPenalty: -12,
    warnPenalty: -4,
    infoPenalty: -1,

    // Positive signals (added once when present).
    hasBuildAndTest: 6,
    commandsEarly: 4,
    hasBoundaries: 4,
    hasSecurityNote: 3,
    neverCommitSecrets: 3,
    pairedDoDont: 3,
    hasShortExamples: 4,
    hasVersions: 2,
    linksWithinBudget: 2,
    idealLength: 6,

    // Negative signals (subtracted once when present).
    overSoftLength: -4,
    overHeavyLength: -10,
    bigArchitectureProse: -6,
    tooManyLinks: -4,
    tooManyExamples: -3,
    looksAutoGenerated: -8,
    readmeDuplication: -4,
  } as const;

  /** Score band lower bounds for each letter grade. */
  export const GRADE_BANDS: { min: number; grade: Grade }[] = [
    { min: 90, grade: "A" },
    { min: 80, grade: "B" },
    { min: 70, grade: "C" },
    { min: 60, grade: "D" },
    { min: 0, grade: "F" },
  ];

  export function gradeFor(score: number): Grade {
    for (const band of GRADE_BANDS) {
      if (score >= band.min) return band.grade;
    }
    return "F";
  }

  function clamp(n: number): number {
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  function hasCommand(doc: Document, pattern: RegExp): boolean {
    return doc.commands.some((c) => pattern.test(c.text));
  }

  function countLinks(doc: Document): number {
    const m = doc.raw.match(/\]\(([^)]+)\)/g);
    return m ? m.length : 0;
  }

  function countLines(raw: string): number {
    const trimmed = raw.replace(/\n+$/, "");
    return trimmed.length === 0 ? 0 : trimmed.split("\n").length;
  }

  /** Compute the 0-100 score and grade from the document and its findings. */
  export function scoreDocument(
    doc: Document,
    findings: Finding[],
  ): { score: number; grade: Grade } {
    let score = WEIGHTS.base;

    // Finding penalties.
    for (const f of findings) {
      if (f.severity === "error") score += WEIGHTS.errorPenalty;
      else if (f.severity === "warn") score += WEIGHTS.warnPenalty;
      else score += WEIGHTS.infoPenalty;
    }

    const lower = doc.raw.toLowerCase();
    const lineCount = countLines(doc.raw);

    // Positive signals.
    const hasBuild = hasCommand(doc, /\b(build|compile|run build)\b/) ||
      /\b(build)\b/.test(lower);
    const hasTest = hasCommand(doc, /\b(test|pytest|jest|vitest)\b/);
    if (hasBuild && hasTest) score += WEIGHTS.hasBuildAndTest;

    const firstCommandLine = doc.commands[0]?.line ?? Number.POSITIVE_INFINITY;
    if (firstCommandLine <= Math.max(20, lineCount * 0.4)) {
      score += WEIGHTS.commandsEarly;
    }

    const headingsLower = doc.headings.map((h) => h.text.toLowerCase());
    if (headingsLower.some((h) => /boundaries|never|always|ask first/.test(h))) {
      score += WEIGHTS.hasBoundaries;
    }
    if (/security|secret|credential/.test(lower)) {
      score += WEIGHTS.hasSecurityNote;
    }
    if (/never commit secrets|don'?t commit secrets/.test(lower)) {
      score += WEIGHTS.neverCommitSecrets;
    }
    if (/\bnever\b/.test(lower) && /\b(always|do |use |run )\b/.test(lower)) {
      score += WEIGHTS.pairedDoDont;
    }

    const exampleBlocks = doc.codeBlocks.filter((b) => {
      const n = b.value.split("\n").filter((l) => l.trim().length > 0).length;
      return n >= 3 && n <= 10;
    }).length;
    if (exampleBlocks >= 1 && exampleBlocks <= 3) {
      score += WEIGHTS.hasShortExamples;
    } else if (doc.codeBlocks.length > 5) {
      score += WEIGHTS.tooManyExamples;
    }

    if (/\b[v^~]?\d+(\.\d+){1,2}\b/.test(doc.raw)) {
      score += WEIGHTS.hasVersions;
    }

    const links = countLinks(doc);
    if (links > 0 && links <= 15) score += WEIGHTS.linksWithinBudget;
    else if (links > 15) score += WEIGHTS.tooManyLinks;

    if (lineCount >= 50 && lineCount <= 150) {
      score += WEIGHTS.idealLength;
    } else if (lineCount > 300) {
      score += WEIGHTS.overHeavyLength;
    } else if (lineCount > 150) {
      score += WEIGHTS.overSoftLength;
    }

    // Negative signals.
    if (/## (architecture|file tour|directory structure)/i.test(doc.raw) &&
        lineCount > 150) {
      score += WEIGHTS.bigArchitectureProse;
    }
    if (/generated by|do not edit|auto-?generated|\/init\b/i.test(lower)) {
      score += WEIGHTS.looksAutoGenerated;
    }
    if (/this (project|repo) is a |## installation\n/i.test(lower) &&
        /see readme|as in the readme/i.test(lower)) {
      score += WEIGHTS.readmeDuplication;
    }

    const finalScore = clamp(score);
    return { score: finalScore, grade: gradeFor(finalScore) };
  }
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  Run: `cd packages/linter && bun test test/scoring.test.ts`
  Expected: PASS — 6 tests pass. If the GOOD fixture lands below 80, adjust only the positive-signal weights upward (constants are the single tuning surface); do not change rule logic.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/linter/src/scoring.ts packages/linter/test/scoring.test.ts
  git commit -m "$(cat <<'EOF'
  feat(linter): add weighted scoring with explicit constants and grades

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 14: Autofix engine

**Files:**
- Create: `packages/linter/src/fix.ts`
- Test: `packages/linter/test/fix.test.ts`

- [ ] **Step 1: Write the failing fix test.**
  Create `packages/linter/test/fix.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { applyFixes } from "../src/fix.ts";

  describe("applyFixes", () => {
    test("strips trailing whitespace from each line", () => {
      const out = applyFixes("# Title   \n\nText\t\n");
      expect(out.content).toBe("# Title\n\nText\n");
      expect(out.changed).toBe(true);
      expect(out.applied).toContain("trailing-whitespace");
    });

    test("ensures a single trailing newline", () => {
      expect(applyFixes("# Title").content).toBe("# Title\n");
      expect(applyFixes("# Title\n\n\n").content).toBe("# Title\n");
    });

    test("wraps a bare command line in a fenced block", () => {
      const input = "## Setup\n\nbun install --frozen-lockfile\n\nDone.\n";
      const out = applyFixes(input);
      expect(out.content).toContain("```bash\nbun install --frozen-lockfile\n```");
      expect(out.applied).toContain("wrap-bare-command");
    });

    test("does not wrap commands already inside a fence", () => {
      const input = "## Setup\n\n```bash\nbun install\n```\n";
      const out = applyFixes(input);
      expect(out.content).toBe(input);
      expect(out.changed).toBe(false);
    });

    test("does not touch prose lines that merely mention a tool", () => {
      const input = "We use bun for everything in this repo.\n";
      const out = applyFixes(input);
      expect(out.content).toBe(input);
      expect(out.changed).toBe(false);
    });

    test("reports changed=false when nothing to fix", () => {
      const input = "# Title\n\nClean.\n";
      const out = applyFixes(input);
      expect(out.changed).toBe(false);
      expect(out.applied).toEqual([]);
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  Run: `cd packages/linter && bun test test/fix.test.ts`
  Expected: FAIL — module not found.

- [ ] **Step 3: Implement fix (COMPLETE).**
  Create `packages/linter/src/fix.ts`:
  ```ts
  export interface FixResult {
    content: string;
    changed: boolean;
    /** Names of the fixes that were applied. */
    applied: string[];
  }

  /** A line is a bare command if it alone looks like a runnable shell command. */
  const BARE_COMMAND =
    /^(npx|bunx|bun|npm|pnpm|yarn|node|deno|python|python3|pip|pip3|uv|uvx|poetry|pytest|go|cargo|make|mvn|gradle|docker|git|tsc|eslint|prettier|ruff|black|mypy|jest|vitest)\b.*$/;

  function stripTrailingWhitespace(content: string): { out: string; changed: boolean } {
    const lines = content.split("\n");
    const fixed = lines.map((l) => l.replace(/[ \t]+$/, ""));
    const changed = fixed.some((l, i) => l !== lines[i]);
    return { out: fixed.join("\n"), changed };
  }

  function normalizeFinalNewline(content: string): { out: string; changed: boolean } {
    const out = content.replace(/\n*$/, "\n");
    return { out, changed: out !== content };
  }

  /**
   * Wrap standalone bare command lines (surrounded by blank lines / boundaries
   * and not already inside a fence) in a ```bash fence. Conservative: only acts
   * on a line that is, by itself, an obvious command.
   */
  function wrapBareCommands(content: string): { out: string; changed: boolean } {
    const lines = content.split("\n");
    const result: string[] = [];
    let inFence = false;
    let changed = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        result.push(line);
        continue;
      }
      const prev = lines[i - 1];
      const next = lines[i + 1];
      const isolated =
        (prev === undefined || prev.trim() === "") &&
        (next === undefined || next.trim() === "");
      if (!inFence && isolated && BARE_COMMAND.test(line.trim())) {
        result.push("```bash");
        result.push(line.trim());
        result.push("```");
        changed = true;
      } else {
        result.push(line);
      }
    }
    return { out: result.join("\n"), changed };
  }

  /**
   * Apply only HIGH-confidence, safe autofixes. Filename casing and content
   * rewrites are intentionally NOT autofixed (advisory only).
   */
  export function applyFixes(raw: string): FixResult {
    const applied: string[] = [];
    let content = raw;

    const ws = stripTrailingWhitespace(content);
    if (ws.changed) {
      content = ws.out;
      applied.push("trailing-whitespace");
    }

    const wrap = wrapBareCommands(content);
    if (wrap.changed) {
      content = wrap.out;
      applied.push("wrap-bare-command");
    }

    const nl = normalizeFinalNewline(content);
    if (nl.changed) {
      content = nl.out;
      applied.push("final-newline");
    }

    return { content, changed: applied.length > 0, applied };
  }
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  Run: `cd packages/linter && bun test test/fix.test.ts`
  Expected: PASS — 6 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/linter/src/fix.ts packages/linter/test/fix.test.ts
  git commit -m "$(cat <<'EOF'
  feat(linter): add safe autofix engine (whitespace, newline, bare commands)

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 15: Programmatic API (lint, lintAll)

**Files:**
- Create: `packages/linter/src/index.ts`
- Test: `packages/linter/test/index.test.ts`

- [ ] **Step 1: Write the failing API test.**
  Create `packages/linter/test/index.test.ts`:
  ```ts
  import { test, expect, describe, beforeEach, afterEach } from "bun:test";
  import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import { lint, lintAll } from "../src/index.ts";

  describe("lint", () => {
    test("returns a LintResult with findings, score, grade", () => {
      const res = lint("# TODO\n", { filename: "AGENTS.md" });
      expect(res.file).toBe("AGENTS.md");
      expect(Array.isArray(res.findings)).toBe(true);
      expect(typeof res.score).toBe("number");
      expect(["A", "B", "C", "D", "F"]).toContain(res.grade);
    });

    test("skips freshness rules in standalone mode", () => {
      const res = lint("See `src/missing.ts`.\n", { filename: "AGENTS.md" });
      expect(res.findings.some((f) => f.ruleId === "AMC-PATH")).toBe(false);
    });

    test("runs freshness rules when root is provided", () => {
      const repo = mkdtempSync(join(tmpdir(), "amc-api-"));
      try {
        const res = lint("See `src/missing.ts`.\n", {
          filename: "AGENTS.md",
          root: repo,
        });
        expect(res.findings.some((f) => f.ruleId === "AMC-PATH")).toBe(true);
      } finally {
        rmSync(repo, { recursive: true, force: true });
      }
    });

    test("honors ruleConfig overrides", () => {
      const res = lint("x".repeat(50), {
        filename: "AGENTS.md",
        ruleConfig: { "XP-007": { maxBytes: 10 } },
      });
      expect(res.findings.some((f) => f.ruleId === "XP-007")).toBe(true);
    });
  });

  describe("lintAll", () => {
    let dir: string;
    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), "amc-all-"));
      writeFileSync(join(dir, "AGENTS.md"), "# A\n\n## Setup\n```bash\nbun install\n```\n");
      writeFileSync(join(dir, "AGENTS2.md"), "# B\n");
    });
    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    test("lints multiple files and preserves the supplied filename", () => {
      const a = join(dir, "AGENTS.md");
      const b = join(dir, "AGENTS2.md");
      const results = lintAll([a, b]);
      expect(results.length).toBe(2);
      expect(results[0]!.file).toBe(a);
      expect(results[1]!.findings.some((f) => f.ruleId === "AMC-FILENAME")).toBe(
        true,
      );
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  Run: `cd packages/linter && bun test test/index.test.ts`
  Expected: FAIL — module not found.

- [ ] **Step 3: Implement the API (COMPLETE).**
  Create `packages/linter/src/index.ts`:
  ```ts
  import { readFileSync } from "node:fs";
  import { parseDocument } from "./document.ts";
  import { allRules } from "./rules/index.ts";
  import { scoreDocument } from "./scoring.ts";
  import type { Finding, LintResult, LintOptions } from "./types.ts";

  export type {
    Severity,
    Grade,
    Finding,
    Rule,
    LintResult,
    LintOptions,
    Document,
    DocumentHeading,
    DocumentCodeBlock,
    DocumentCommand,
  } from "./types.ts";
  export { allRules, standaloneRules, freshnessRules } from "./rules/index.ts";
  export { scoreDocument, gradeFor, WEIGHTS } from "./scoring.ts";
  export { applyFixes } from "./fix.ts";
  export { parseDocument } from "./document.ts";

  /** Options for the single-string lint entry point. */
  export interface LintContentOptions extends LintOptions {
    /** Filename to attribute to the content. Defaults to "AGENTS.md". */
    filename?: string;
  }

  /** Lint a single AGENTS.md content string. */
  export function lint(content: string, options: LintContentOptions = {}): LintResult {
    const filename = options.filename ?? "AGENTS.md";
    const doc = parseDocument(content, { filename, root: options.root });
    const findings: Finding[] = [];
    for (const rule of allRules) {
      if (rule.requiresRepo && !doc.repoRoot) continue;
      const config = options.ruleConfig?.[rule.id];
      findings.push(...rule.check(doc, config));
    }
    findings.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
    const { score, grade } = scoreDocument(doc, findings);
    return { file: filename, findings, score, grade };
  }

  /** Lint a list of file paths from disk. */
  export function lintAll(paths: string[], options: LintOptions = {}): LintResult[] {
    return paths.map((path) => {
      const content = readFileSync(path, "utf8");
      const result = lint(content, { ...options, filename: path });
      return result;
    });
  }
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  Run: `cd packages/linter && bun test test/index.test.ts`
  Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/linter/src/index.ts packages/linter/test/index.test.ts
  git commit -m "$(cat <<'EOF'
  feat(linter): add programmatic API (lint, lintAll) and public re-exports

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 16: Reporters (text + json)

**Files:**
- Create: `packages/linter/src/report.ts`
- Test: `packages/linter/test/report.test.ts`

- [ ] **Step 1: Write the failing reporter test.**
  Create `packages/linter/test/report.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { formatText, formatJson } from "../src/report.ts";
  import type { LintResult } from "../src/types.ts";

  const RESULTS: LintResult[] = [
    {
      file: "AGENTS.md",
      score: 72,
      grade: "C",
      findings: [
        { ruleId: "XP-007", severity: "error", message: "too big", line: 1 },
        { ruleId: "AMC-CMD", severity: "warn", message: "no commands" },
      ],
    },
  ];

  describe("formatText", () => {
    test("includes file, findings, severities, and score line", () => {
      const out = formatText(RESULTS);
      expect(out).toContain("AGENTS.md");
      expect(out).toContain("error");
      expect(out).toContain("XP-007");
      expect(out).toContain("too big");
      expect(out).toContain("warn");
      expect(out).toContain("AMC-CMD");
      expect(out).toContain("72");
      expect(out).toContain("C");
    });

    test("shows a clean message when there are no findings", () => {
      const clean = formatText([
        { file: "AGENTS.md", score: 100, grade: "A", findings: [] },
      ]);
      expect(clean).toContain("0 problems");
    });

    test("renders line:column when present", () => {
      const out = formatText([
        {
          file: "AGENTS.md",
          score: 90,
          grade: "A",
          findings: [
            { ruleId: "AMC-SECRET", severity: "error", message: "x", line: 4, column: 2 },
          ],
        },
      ]);
      expect(out).toContain("4:2");
    });
  });

  describe("formatJson", () => {
    test("emits valid parseable JSON with summary", () => {
      const out = formatJson(RESULTS);
      const parsed = JSON.parse(out);
      expect(parsed.results[0].file).toBe("AGENTS.md");
      expect(parsed.summary.errors).toBe(1);
      expect(parsed.summary.warnings).toBe(1);
      expect(parsed.summary.files).toBe(1);
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  Run: `cd packages/linter && bun test test/report.test.ts`
  Expected: FAIL — module not found.

- [ ] **Step 3: Implement report (COMPLETE).**
  Create `packages/linter/src/report.ts`:
  ```ts
  import type { LintResult, Finding } from "./types.ts";

  function severityTag(s: Finding["severity"]): string {
    return s.padEnd(5, " ");
  }

  function location(f: Finding): string {
    if (f.line && f.column) return `${f.line}:${f.column}`;
    if (f.line) return `${f.line}`;
    return "-";
  }

  export interface ReportSummary {
    files: number;
    errors: number;
    warnings: number;
    infos: number;
  }

  export function summarize(results: LintResult[]): ReportSummary {
    let errors = 0;
    let warnings = 0;
    let infos = 0;
    for (const r of results) {
      for (const f of r.findings) {
        if (f.severity === "error") errors++;
        else if (f.severity === "warn") warnings++;
        else infos++;
      }
    }
    return { files: results.length, errors, warnings, infos };
  }

  /** Human-readable text report. */
  export function formatText(results: LintResult[]): string {
    const out: string[] = [];
    for (const r of results) {
      out.push(`\n${r.file}  [score ${r.score}/100, grade ${r.grade}]`);
      if (r.findings.length === 0) {
        out.push("  0 problems");
        continue;
      }
      for (const f of r.findings) {
        out.push(
          `  ${location(f).padStart(6, " ")}  ${severityTag(f.severity)}  ${f.ruleId.padEnd(15, " ")}  ${f.message}`,
        );
      }
    }
    const s = summarize(results);
    out.push(
      `\n${s.files} file(s): ${s.errors} error(s), ${s.warnings} warning(s), ${s.infos} info.`,
    );
    return out.join("\n");
  }

  /** Machine-readable JSON report. */
  export function formatJson(results: LintResult[]): string {
    return JSON.stringify(
      { results, summary: summarize(results) },
      null,
      2,
    );
  }
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  Run: `cd packages/linter && bun test test/report.test.ts`
  Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/linter/src/report.ts packages/linter/test/report.test.ts
  git commit -m "$(cat <<'EOF'
  feat(linter): add text and json reporters with summary

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 17: CLI (run, flags, exit codes)

**Files:**
- Create: `packages/linter/src/cli.ts`
- Test: `packages/linter/test/cli.test.ts`
- Create: `packages/linter/test/fixtures/good/AGENTS.md`
- Create: `packages/linter/test/fixtures/stub/AGENTS.md`

- [ ] **Step 1: Create the good fixture.**
  Create `packages/linter/test/fixtures/good/AGENTS.md`:
  ```markdown
  # Project Overview

  Small TypeScript service. Node 20.11, Bun 1.1.

  ## Setup commands
  ```bash
  bun install --frozen-lockfile
  ```

  ## Build and test commands
  ```bash
  bun test
  bun run build
  ```

  ## Code style
  Formatted by prettier; run `bun run lint` before committing.

  ## Git workflow
  Conventional commits; open a PR against develop.

  ## Boundaries
  - Always: run `bun test` before pushing.
  - Ask first: changing the database schema.
  - Never: commit secrets — use environment variables instead.
  ```

- [ ] **Step 2: Create the stub fixture.**
  Create `packages/linter/test/fixtures/stub/AGENTS.md`:
  ```markdown
  # TODO
  ```

- [ ] **Step 3: Write the failing CLI test.**
  Create `packages/linter/test/cli.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { join } from "node:path";
  import { run } from "../src/cli.ts";

  const FIX = join(import.meta.dir, "fixtures");
  const GOOD = join(FIX, "good", "AGENTS.md");
  const STUB = join(FIX, "stub", "AGENTS.md");

  function capture() {
    const lines: string[] = [];
    const write = (s: string) => lines.push(s);
    return { lines, write };
  }

  describe("cli run()", () => {
    test("exits 0 on a clean file (text default)", async () => {
      const cap = capture();
      const code = await run([GOOD], { write: cap.write });
      expect(code).toBe(0);
      expect(cap.lines.join("\n")).toContain("grade");
    });

    test("exits 1 when errors are present", async () => {
      const cap = capture();
      // Force a byte-cap error via a tiny configured cap is not available on CLI;
      // instead use a filename error by linting a wrong-named file path.
      const wrong = join(FIX, "stub", "AGENTS.md");
      const code = await run([wrong, "--max-warnings", "0"], { write: cap.write });
      expect(code).toBe(1);
    });

    test("--format json prints valid JSON", async () => {
      const cap = capture();
      const code = await run([GOOD, "--format", "json"], { write: cap.write });
      const parsed = JSON.parse(cap.lines.join("\n"));
      expect(parsed.summary.files).toBe(1);
      expect(code).toBe(0);
    });

    test("--strict turns warnings into a failing exit code", async () => {
      const cap = capture();
      const code = await run([STUB, "--strict"], { write: cap.write });
      expect(code).toBe(1);
    });

    test("--max-warnings N fails when warnings exceed N", async () => {
      const cap = capture();
      const code = await run([STUB, "--max-warnings", "0"], { write: cap.write });
      expect(code).toBe(1);
    });

    test("--quiet suppresses info-only output but keeps errors", async () => {
      const cap = capture();
      await run([GOOD, "--quiet"], { write: cap.write });
      const text = cap.lines.join("\n");
      expect(text).not.toContain("info ");
    });

    test("--fix rewrites the file and reports applied fixes", async () => {
      const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import(
        "node:fs"
      );
      const { tmpdir } = await import("node:os");
      const dir = mkdtempSync(join(tmpdir(), "amc-cli-fix-"));
      try {
        const file = join(dir, "AGENTS.md");
        writeFileSync(file, "# Title   \n\nbun install\n");
        const cap = capture();
        await run([file, "--fix"], { write: cap.write });
        const after = readFileSync(file, "utf8");
        expect(after).toContain("```bash");
        expect(after).not.toContain("Title   ");
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    test("--help prints usage and exits 0", async () => {
      const cap = capture();
      const code = await run(["--help"], { write: cap.write });
      expect(code).toBe(0);
      expect(cap.lines.join("\n")).toContain("agents-md-lint");
    });

    test("missing default file is a clean no-op error (exit 1)", async () => {
      const cap = capture();
      const code = await run(["./definitely-missing-AGENTS.md"], {
        write: cap.write,
      });
      expect(code).toBe(1);
      expect(cap.lines.join("\n")).toContain("No files matched");
    });
  });
  ```

- [ ] **Step 4: Run the test (expected FAIL).**
  Run: `cd packages/linter && bun test test/cli.test.ts`
  Expected: FAIL — module `../src/cli.ts` not found.

- [ ] **Step 5: Implement the CLI (COMPLETE).**
  Create `packages/linter/src/cli.ts`:
  ```ts
  #!/usr/bin/env node
  import { readFileSync, writeFileSync, existsSync } from "node:fs";
  import { Glob } from "bun";
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

  function expandGlobs(patterns: string[]): string[] {
    const out = new Set<string>();
    for (const pattern of patterns) {
      if (!/[*?{}[\]]/.test(pattern)) {
        if (existsSync(pattern)) out.add(pattern);
        continue;
      }
      const glob = new Glob(pattern);
      for (const match of glob.scanSync(".")) out.add(match);
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
        root: args.root ?? undefined,
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
  if (import.meta.main) {
    run(process.argv.slice(2))
      .then((code) => process.exit(code))
      .catch((err) => {
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      });
  }
  ```

- [ ] **Step 6: Run the test (expected PASS).**
  Run: `cd packages/linter && bun test test/cli.test.ts`
  Expected: PASS — 9 tests pass.

- [ ] **Step 7: Commit.**
  ```bash
  git add packages/linter/src/cli.ts packages/linter/test/cli.test.ts packages/linter/test/fixtures
  git commit -m "$(cat <<'EOF'
  feat(linter): add CLI with flags, globbing, autofix and exit codes

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 18: Build verification + full suite green

**Files:**
- Test: (no new test file) run the whole suite + build

- [ ] **Step 1: Run the entire test suite.**
  Run: `cd packages/linter && bun test`
  Expected: PASS — every suite from Tasks 2-17 passes, zero failures.

- [ ] **Step 2: Build the package.**
  Run: `cd packages/linter && bun run build`
  Expected: `dist/cli.js`, `dist/index.js`, and `.d.ts` files are emitted with no errors.

- [ ] **Step 3: Smoke-test the built CLI via node (npx-equivalence check).**
  Run: `cd packages/linter && node dist/cli.js test/fixtures/good/AGENTS.md`
  Expected: prints a score/grade line and exits 0 (verifies end-user `npx` path works on plain node).

- [ ] **Step 4: Smoke-test the built CLI via bun.**
  Run: `cd packages/linter && bun dist/cli.js test/fixtures/stub/AGENTS.md --strict; echo "exit=$?"`
  Expected: prints findings and `exit=1`.

- [ ] **Step 5: Commit (build config tweaks only if any were needed).**
  ```bash
  git add -A packages/linter
  git commit -m "$(cat <<'EOF'
  chore(linter): verify full suite green and dist build/runtime

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )" --allow-empty
  ```

---

### Task 19: GitHub Action (action.yml at repo root)

**Files:**
- Create: `action.yml` (repo root)
- Test: `packages/linter/test/action-yml.test.ts`

- [ ] **Step 1: Write the failing action.yml test.**
  Create `packages/linter/test/action-yml.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { readFileSync } from "node:fs";
  import { join } from "node:path";
  import { parse } from "yaml";

  const ACTION = join(import.meta.dir, "..", "..", "..", "action.yml");

  describe("action.yml", () => {
    test("declares a composite action with the documented inputs", () => {
      const doc = parse(readFileSync(ACTION, "utf8"));
      expect(doc.name).toBe("agents-md-lint");
      expect(doc.runs.using).toBe("composite");
      expect(Object.keys(doc.inputs).sort()).toEqual(
        ["format", "max-warnings", "path", "strict"].sort(),
      );
    });

    test("invokes the published CLI via npx/bunx in a run step", () => {
      const raw = readFileSync(ACTION, "utf8");
      expect(raw).toContain("agents-md-lint");
      expect(raw).toMatch(/npx|bunx/);
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  Run: `cd packages/linter && bun test test/action-yml.test.ts`
  Expected: FAIL — `action.yml` not found.

- [ ] **Step 3: Implement action.yml (COMPLETE).**
  Create `action.yml` (repo root):
  ```yaml
  name: agents-md-lint
  description: Lint your AGENTS.md against tool-agnostic best practices and fail CI on regressions.
  author: agents-md-cookbook
  branding:
    icon: check-circle
    color: green
  inputs:
    path:
      description: File or glob to lint.
      required: false
      default: "AGENTS.md"
    strict:
      description: Treat warnings as errors (true/false).
      required: false
      default: "false"
    max-warnings:
      description: Fail if warnings exceed this count. Empty disables the check.
      required: false
      default: ""
    format:
      description: Output format (text or json).
      required: false
      default: "text"
  runs:
    using: composite
    steps:
      - name: Run agents-md-lint
        shell: bash
        run: |
          set -euo pipefail
          ARGS=("${{ inputs.path }}")
          if [ "${{ inputs.strict }}" = "true" ]; then
            ARGS+=("--strict")
          fi
          if [ -n "${{ inputs.max-warnings }}" ]; then
            ARGS+=("--max-warnings" "${{ inputs.max-warnings }}")
          fi
          ARGS+=("--format" "${{ inputs.format }}")
          npx --yes agents-md-lint "${ARGS[@]}"
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  Run: `cd packages/linter && bun test test/action-yml.test.ts`
  Expected: PASS — 2 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add action.yml packages/linter/test/action-yml.test.ts
  git commit -m "$(cat <<'EOF'
  feat(action): add composite GitHub Action wrapping agents-md-lint

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 20: CI self-dogfood (lint our own templates)

**Files:**
- Modify: `.github/workflows/ci.yml` (created by the content plan — add the dogfood job, replacing the commented seam)
- Test: `packages/linter/test/dogfood.test.ts`

> **Precondition:** the content plan (`2026-06-14-01-scaffold-and-content.md`) runs first and has already created `.github/workflows/ci.yml` (with the `markdown` job plus a commented dogfood seam) and all 15 `templates/**/AGENTS.md` files, including `templates/minimal/AGENTS.md`. This task EXTENDS that workflow and lints those templates; it does not recreate either.

- [ ] **Step 1: Verify the dogfood target templates exist (created by the content plan).**
  Run: `ls templates/*/AGENTS.md | wc -l`
  Expected: prints `15` (the content plan's templates, including `templates/minimal/AGENTS.md`). If this prints `0`, the content plan has not been executed yet — run it first; the self-dogfood step has nothing to lint without it.

- [ ] **Step 2: Write the failing dogfood test.**
  Create `packages/linter/test/dogfood.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { readFileSync, existsSync } from "node:fs";
  import { join } from "node:path";
  import { Glob } from "bun";
  import { lint } from "../src/index.ts";

  const REPO_ROOT = join(import.meta.dir, "..", "..", "..");

  describe("self-dogfood: templates pass the linter", () => {
    test("every templates/**/AGENTS.md lints with zero errors", () => {
      const glob = new Glob("templates/**/AGENTS.md");
      const files = [...glob.scanSync(REPO_ROOT)];
      expect(files.length).toBeGreaterThan(0);
      for (const rel of files) {
        const abs = join(REPO_ROOT, rel);
        const content = readFileSync(abs, "utf8");
        const result = lint(content, { filename: "AGENTS.md" });
        const errors = result.findings.filter((f) => f.severity === "error");
        expect(errors, `${rel} should have no errors`).toEqual([]);
      }
    });

    test("ci.yml contains an ACTIVE dogfood lint job", () => {
      const ci = join(REPO_ROOT, ".github", "workflows", "ci.yml");
      expect(existsSync(ci)).toBe(true);
      const raw = readFileSync(ci, "utf8");
      // The content plan ships ci.yml with a COMMENTED dogfood seam (which
      // mentions agents-md-lint inside a comment). Assert on tokens unique to
      // the ACTIVE job so the test stays red until Step 4 wires it in for real.
      expect(raw).toContain("test-and-dogfood");
      expect(raw).toContain("packages/linter/dist/cli.js");
      expect(raw).toContain("templates/**/AGENTS.md");
    });
  });
  ```

- [ ] **Step 3: Run the test (expected FAIL).**
  Run: `cd packages/linter && bun test test/dogfood.test.ts`
  Expected: FAIL — the second test fails because `.github/workflows/ci.yml` (created by the content plan) still has only the COMMENTED dogfood seam, not the active `test-and-dogfood` job. The first test should already pass against the content plan's templates.

- [ ] **Step 4: Modify the CI workflow to add the dogfood job (COMPLETE merged file).**
  The content plan already created `.github/workflows/ci.yml` with a `markdown` job and a commented dogfood seam. Replace that whole file with the version below, which KEEPS the `markdown` job and ADDS the `test-and-dogfood` job in place of the seam. The dogfood step is named so the workflow file literally contains `agents-md-lint` (asserted by Step 2's test) and the glob `templates/**/AGENTS.md`.
  Overwrite `.github/workflows/ci.yml` with:
  ```yaml
  name: CI

  on:
    push:
      branches: [develop, main]
    pull_request:
      branches: [develop, main]

  permissions:
    contents: read

  jobs:
    markdown:
      name: Markdown lint + link check
      runs-on: ubuntu-latest
      steps:
        - name: Checkout
          uses: actions/checkout@v4

        - name: Setup Bun
          uses: oven-sh/setup-bun@v2
          with:
            bun-version: latest

        - name: Install dependencies
          run: bun install --frozen-lockfile

        - name: Content lint (markdownlint-cli2)
          run: bun run lint:md

        - name: Link check (lychee)
          uses: lycheeverse/lychee-action@v2
          with:
            args: >-
              --no-progress
              --exclude-mail
              "**/*.md"
            fail: true

    test-and-dogfood:
      name: Build, test + self-dogfood templates
      runs-on: ubuntu-latest
      steps:
        - name: Checkout
          uses: actions/checkout@v4

        - name: Setup Bun
          uses: oven-sh/setup-bun@v2
          with:
            bun-version: latest

        - name: Install dependencies
          run: bun install --frozen-lockfile

        - name: Run linter unit tests
          run: bun test
          working-directory: packages/linter

        - name: Build linter
          run: bun run build
          working-directory: packages/linter

        - name: Self-dogfood — lint all templates with agents-md-lint
          run: bun packages/linter/dist/cli.js "templates/**/AGENTS.md" --strict --format text
  ```

- [ ] **Step 5: Run the test (expected PASS).**
  Run: `cd packages/linter && bun test test/dogfood.test.ts`
  Expected: PASS — 2 tests pass.

- [ ] **Step 6: Verify the dogfood command locally end-to-end.**
  Run (from repo root): `cd packages/linter && bun run build && cd ../.. && bun packages/linter/dist/cli.js "templates/**/AGENTS.md" --strict; echo "exit=$?"`
  Expected: lints `templates/minimal/AGENTS.md`, prints a score/grade, and `exit=0`.

- [ ] **Step 7: Commit.**
  ```bash
  git add .github/workflows/ci.yml packages/linter/test/dogfood.test.ts
  git commit -m "$(cat <<'EOF'
  ci(linter): self-dogfood lint of templates/**/AGENTS.md in CI

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 21: Optional `--engine agnix` passthrough

**Files:**
- Create: `packages/linter/src/engine-agnix.ts`
- Modify: `packages/linter/src/cli.ts`
- Test: `packages/linter/test/engine-agnix.test.ts`

- [ ] **Step 1: Write the failing engine test.**
  Create `packages/linter/test/engine-agnix.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import {
    isAgnixAvailable,
    mapAgnixOutput,
    runAgnix,
  } from "../src/engine-agnix.ts";

  describe("engine-agnix", () => {
    test("mapAgnixOutput converts agnix JSON findings to Finding[]", () => {
      const sample = JSON.stringify({
        findings: [
          { rule: "AGM-001", level: "error", message: "bad md", line: 3 },
          { rule: "AGM-002", level: "warning", message: "missing section" },
        ],
      });
      const findings = mapAgnixOutput(sample);
      expect(findings).toEqual([
        {
          ruleId: "AGM-001",
          severity: "error",
          message: "bad md",
          line: 3,
        },
        {
          ruleId: "AGM-002",
          severity: "warn",
          message: "missing section",
        },
      ]);
    });

    test("mapAgnixOutput returns [] on unparseable output", () => {
      expect(mapAgnixOutput("not json")).toEqual([]);
    });

    test("isAgnixAvailable returns a boolean and does not throw", () => {
      expect(typeof isAgnixAvailable()).toBe("boolean");
    });

    test("runAgnix returns [] when the binary is absent", () => {
      if (isAgnixAvailable()) {
        // If agnix happens to be installed, just assert it returns an array.
        expect(Array.isArray(runAgnix("AGENTS.md"))).toBe(true);
      } else {
        expect(runAgnix("AGENTS.md")).toEqual([]);
      }
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  Run: `cd packages/linter && bun test test/engine-agnix.test.ts`
  Expected: FAIL — module not found.

- [ ] **Step 3: Implement engine-agnix (COMPLETE).**
  Create `packages/linter/src/engine-agnix.ts`:
  ```ts
  import { spawnSync } from "node:child_process";
  import type { Finding, Severity } from "./types.ts";

  /** Map agnix severity strings onto our Severity union. */
  function mapSeverity(level: string): Severity {
    const l = level.toLowerCase();
    if (l === "error" || l === "err") return "error";
    if (l === "warning" || l === "warn") return "warn";
    return "info";
  }

  /** Is the `agnix` binary on PATH? */
  export function isAgnixAvailable(): boolean {
    try {
      const probe = spawnSync("agnix", ["--version"], { stdio: "ignore" });
      return probe.status === 0 || probe.status === null ? probe.error == null : false;
    } catch {
      return false;
    }
  }

  /** Convert agnix JSON stdout into our Finding[] shape. */
  export function mapAgnixOutput(stdout: string): Finding[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      return [];
    }
    const raw = (parsed as { findings?: unknown }).findings;
    if (!Array.isArray(raw)) return [];
    const findings: Finding[] = [];
    for (const item of raw) {
      const obj = item as Record<string, unknown>;
      const ruleId = typeof obj.rule === "string" ? obj.rule : "AGNIX";
      const message = typeof obj.message === "string" ? obj.message : "";
      const level = typeof obj.level === "string" ? obj.level : "info";
      const finding: Finding = {
        ruleId,
        severity: mapSeverity(level),
        message,
      };
      if (typeof obj.line === "number") finding.line = obj.line;
      if (typeof obj.column === "number") finding.column = obj.column;
      findings.push(finding);
    }
    return findings;
  }

  /** Run agnix on a file and return mapped findings; [] if unavailable/errored. */
  export function runAgnix(file: string): Finding[] {
    if (!isAgnixAvailable()) return [];
    try {
      const proc = spawnSync("agnix", ["--format", "json", file], {
        encoding: "utf8",
      });
      if (proc.error || typeof proc.stdout !== "string") return [];
      return mapAgnixOutput(proc.stdout);
    } catch {
      return [];
    }
  }
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  Run: `cd packages/linter && bun test test/engine-agnix.test.ts`
  Expected: PASS — 4 tests pass.

- [ ] **Step 5: Wire `--engine agnix` into the CLI parser.**
  In `packages/linter/src/cli.ts`, add an `engine` field to the `ParsedArgs` interface (after `help: boolean;`):
  ```ts
    help: boolean;
    engine: "builtin" | "agnix";
  ```

- [ ] **Step 6: Initialize the engine default in the parser.**
  In `packages/linter/src/cli.ts`, in the `parsed` object literal in `parseArgs`, add after `help: false,`:
  ```ts
      help: false,
      engine: "builtin",
  ```

- [ ] **Step 7: Parse the `--engine` flag.**
  In `packages/linter/src/cli.ts`, add a case to the `switch (arg)` block, just before `default:`:
  ```ts
        case "--engine":
          parsed.engine = argv[++i] === "agnix" ? "agnix" : "builtin";
          break;
  ```

- [ ] **Step 8: Merge agnix findings in `run()`.**
  In `packages/linter/src/cli.ts`, add the import at the top (after the `applyFixes` import):
  ```ts
  import { runAgnix } from "./engine-agnix.ts";
  ```
  Then, in `run()`, immediately after `const result = lint(content, { ... });` and before the `if (args.quiet)` block, insert:
  ```ts
      if (args.engine === "agnix") {
        const agnixFindings = runAgnix(file);
        const seen = new Set(
          result.findings.map((f) => `${f.ruleId}:${f.line ?? 0}:${f.message}`),
        );
        for (const f of agnixFindings) {
          const key = `${f.ruleId}:${f.line ?? 0}:${f.message}`;
          if (!seen.has(key)) result.findings.push(f);
        }
        result.findings.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
      }
  ```

- [ ] **Step 9: Document `--engine` in the HELP string.**
  In `packages/linter/src/cli.ts`, in the `HELP` template literal, add this line after the `--root` line:
  ```
    --engine <builtin|agnix>  Also merge findings from the agnix binary if installed.
  ```

- [ ] **Step 10: Re-run the CLI suite and engine suite (expected PASS).**
  Run: `cd packages/linter && bun test test/cli.test.ts test/engine-agnix.test.ts`
  Expected: PASS — all CLI and engine tests still pass (agnix path is a no-op when the binary is absent).

- [ ] **Step 11: Commit.**
  ```bash
  git add packages/linter/src/engine-agnix.ts packages/linter/src/cli.ts packages/linter/test/engine-agnix.test.ts
  git commit -m "$(cat <<'EOF'
  feat(linter): add optional --engine agnix passthrough (graceful when absent)

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 22: Package README with full rules table

**Files:**
- Create: `packages/linter/README.md`
- Test: `packages/linter/test/readme.test.ts`

- [ ] **Step 1: Write the failing README test.**
  Create `packages/linter/test/readme.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { readFileSync } from "node:fs";
  import { join } from "node:path";
  import { allRules } from "../src/rules/index.ts";

  const README = join(import.meta.dir, "..", "README.md");

  describe("package README", () => {
    test("documents every shipped rule id", () => {
      const raw = readFileSync(README, "utf8");
      for (const rule of allRules) {
        expect(raw, `README must mention ${rule.id}`).toContain(rule.id);
      }
    });

    test("shows bunx and npx install/usage", () => {
      const raw = readFileSync(README, "utf8");
      expect(raw).toContain("bunx agents-md-lint");
      expect(raw).toContain("npx agents-md-lint");
    });

    test("documents the key CLI flags", () => {
      const raw = readFileSync(README, "utf8");
      for (const flag of ["--fix", "--format", "--max-warnings", "--strict", "--root"]) {
        expect(raw).toContain(flag);
      }
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  Run: `cd packages/linter && bun test test/readme.test.ts`
  Expected: FAIL — README not found.

- [ ] **Step 3: Implement the README (COMPLETE).**
  Create `packages/linter/README.md`:
  ```markdown
  # agents-md-lint

  The tested, tool-agnostic **AGENTS.md** linter. It validates, scores (0-100 + letter grade), and safely autofixes `AGENTS.md` files against verified mid-2026 best practices, and runs anywhere via `bunx`/`npx` or as a GitHub Action.

  ## Install / Run

  No install needed:

  ```bash
  bunx agents-md-lint            # lints ./AGENTS.md
  npx agents-md-lint             # same, via npm
  ```

  Or add it as a dev dependency:

  ```bash
  bun add -d agents-md-lint
  ```

  ## Usage

  ```bash
  agents-md-lint                                  # lint ./AGENTS.md
  agents-md-lint "templates/**/AGENTS.md"         # lint a glob
  agents-md-lint AGENTS.md --format json          # machine-readable output
  agents-md-lint AGENTS.md --fix                  # apply safe autofixes in place
  agents-md-lint AGENTS.md --strict               # warnings fail the build
  agents-md-lint AGENTS.md --max-warnings 5       # cap allowed warnings
  agents-md-lint AGENTS.md --root .               # enable freshness rules
  agents-md-lint AGENTS.md --engine agnix         # also merge agnix findings if installed
  ```

  ### Flags

  | Flag | Description |
  |------|-------------|
  | `--fix` | Apply safe, high-confidence autofixes in place (trailing whitespace, final newline, wrap bare commands). |
  | `--format <text\|json>` | Output format. Default `text`. |
  | `--max-warnings <n>` | Fail if warnings exceed `n`. |
  | `--strict` | Treat warnings as errors for the exit code. |
  | `--quiet` | Hide info-level findings. |
  | `--root <path>` | Repo root; enables freshness rules (referenced paths/scripts, stale markers). |
  | `--engine <builtin\|agnix>` | Also merge findings from the `agnix` binary if it is on PATH. |
  | `--help` | Show usage. |

  Exit codes: `0` clean; `1` on errors, on warnings under `--strict`, or when warnings exceed `--max-warnings`.

  ## Programmatic API

  ```ts
  import { lint, lintAll } from "agents-md-lint";

  const result = lint(content, { filename: "AGENTS.md", root: process.cwd() });
  console.log(result.score, result.grade, result.findings);

  const results = lintAll(["AGENTS.md", "packages/api/AGENTS.md"]);
  ```

  ## GitHub Action

  ```yaml
  - uses: agents-md-cookbook/agents-md-cookbook@v1
    with:
      path: "AGENTS.md"
      strict: "true"
      max-warnings: "0"
      format: "text"
  ```

  ## Rules

  Standalone rules run everywhere. **Freshness** rules run only with `--root` (repo-context mode).

  | Rule ID | Severity | Description |
  |---------|----------|-------------|
  | `AGM-001` | error | File must be valid CommonMark/GFM Markdown (detects unterminated code fences). |
  | `AMC-FILENAME` | error | File must be named exactly `AGENTS.md`. |
  | `AMC-NONEMPTY` | warn | Flags near-empty stubs (under 100 non-whitespace chars). |
  | `AMC-HEADINGS` | warn | Requires >= 1 heading and forbids skipped heading levels. |
  | `AGM-002` | warn / info | Recommended sections (Setup, Testing, Project Structure, Code Style, Git Workflow, Boundaries); INFO suggests three-tier Boundaries. |
  | `XP-007` | error | Codex 32768-byte cap (configurable). |
  | `AGM-003` | warn | Windsurf 6000-char per-file cap. |
  | `AMC-LENGTH` | warn | Soft >150-line and heavy >300-line budgets. |
  | `AMC-PLATITUDE` | warn | Flags vague platitudes ("write clean code", "be helpful", ...). |
  | `AMC-CMD` | warn | Requires >= 1 runnable shell command. |
  | `AMC-VERSION` | info | Suggests pinning tool/runtime versions when tools are named. |
  | `AMC-DONTS` | warn | Flags >20 don'ts or a high don't:do ratio. |
  | `AMC-SECRET` | error | Detects inlined secrets (AWS keys, private keys, API tokens). |
  | `AMC-FRONTMATTER` | warn | Validates optional v1.1 frontmatter (`description`, `tags`); ignores unknown keys. |
  | `AMC-PATH` | error (freshness) | Referenced repo paths must exist. |
  | `AMC-SCRIPT` | warn (freshness) | Referenced `package.json` scripts must exist. |
  | `AMC-STALE` | info (freshness) | Flags TODO/FIXME markers and stale years. |

  Rule IDs in the `AGM-`/`XP-` namespaces are reused from the prior-art [agnix](https://github.com/) taxonomy for interoperability; `AMC-` IDs are specific to this kit.

  ## Scoring

  Each file gets a 0-100 score and a letter grade (A >= 90, B >= 80, C >= 70, D >= 60, else F). The score starts at 100, subtracts per-finding penalties, adds points for positive signals (build+test commands, commands early, boundaries + security, "never commit secrets", paired do/don't, 1-3 short examples, version pins, links within budget, ideal 50-150 line length), and subtracts for negative signals (over-length, platitudes, large architecture prose, too many links/examples, auto-generated markers, README duplication).

  ## License

  MIT — part of [agents-md-cookbook](https://github.com/).
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  Run: `cd packages/linter && bun test test/readme.test.ts`
  Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/linter/README.md packages/linter/test/readme.test.ts
  git commit -m "$(cat <<'EOF'
  docs(linter): add package README with full rules table and usage

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 23: Final full-suite + build gate

**Files:**
- Test: (no new files) whole-repo verification

- [ ] **Step 1: Run the entire linter test suite.**
  Run: `cd packages/linter && bun test`
  Expected: PASS — all suites from Tasks 2-22 pass, zero failures.

- [ ] **Step 2: Rebuild and confirm dist is current.**
  Run: `cd packages/linter && bun run build`
  Expected: no errors; `dist/cli.js`, `dist/index.js`, and declaration files present.

- [ ] **Step 3: Final dogfood run from repo root.**
  Run (from repo root): `bun packages/linter/dist/cli.js "templates/**/AGENTS.md" --strict; echo "exit=$?"`
  Expected: all templates pass, `exit=0`.

- [ ] **Step 4: Final commit.**
  ```bash
  git add -A
  git commit -m "$(cat <<'EOF'
  chore(linter): final verification — full suite green, dist built, dogfood passing

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )" --allow-empty
  ```
