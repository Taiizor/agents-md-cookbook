# Migrate (Converter) Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build `agents-md-migrate`, a tool-agnostic CLI + library that auto-detects legacy AI-rule files (Cursor, Claude Code, Windsurf, GitHub Copilot, Cline, Aider) in a directory and converts/merges them into a single idempotent root `AGENTS.md` plus optional nested `AGENTS.md` files.

**Architecture:** Pure, side-effect-free converters (`converters/<format>.ts`) each turn one source format into a list of `ParsedRule` objects. An orchestrator detects sources, runs matching converters, merges always-on rules first then conditional rules into a root body (degrading scoping metadata to prose prefixes or nested `AGENTS.md` for clean directory-prefix globs), and emits a `ConversionResult`. Idempotency is enforced by a merge layer that skips sections already present (by heading + content hash). The CLI (`cli.ts`) and programmatic API (`index.ts`) are thin wrappers over the orchestrator.

**Tech Stack:** Bun workspace member, TypeScript (ESM), `bun:test` for tests, `yaml` for frontmatter parsing. Published to npm so end users run via `bunx agents-md-migrate` / `npx agents-md-migrate`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `packages/migrate/package.json` | Package manifest: name `agents-md-migrate`, `bin` -> `dist/cli.js`, `type: module`, `exports`, scripts, `yaml` dependency. |
| `packages/migrate/tsconfig.json` | TypeScript config (ESM, strict, bundler resolution, outDir `dist`). |
| `packages/migrate/src/types.ts` | Core types: `SourceFormat` enum, `ScopeMode`, `Scope`, `ParsedRule`, `NestedFile`, `ConversionResult`, `ConvertOptions`, `DetectedSource`. |
| `packages/migrate/src/frontmatter.ts` | `parseFrontmatter(text)`: split leading `--- ... ---` fence and parse the YAML block, return `{ data, body }`. |
| `packages/migrate/src/glob.ts` | `globToDirPrefix(glob)`: returns clean directory prefix (e.g. `src`) or `null`; `splitCommaGlobs(str)`: split bare comma-separated glob strings. |
| `packages/migrate/src/merge.ts` | `mergeSections(existing, additions)`: concatenate rule bodies under headings without duplicating (heading + content-hash dedupe); `hashBody(text)`; `extractHeadings(md)`. |
| `packages/migrate/src/rules.ts` | `rulesToMarkdown(rules, options)`: turn ordered `ParsedRule[]` into a markdown body, emitting `Applies to`/`> Rule:`/Optional sections and nested-file partitioning. |
| `packages/migrate/src/converters/cursor.ts` | Detect + convert `.cursorrules` and `.cursor/rules/**/*.mdc`. |
| `packages/migrate/src/converters/claude.ts` | Detect + convert `CLAUDE.md` (root + subdir), `.claude/rules/*`, resolve `@path` imports; exclude personal files. |
| `packages/migrate/src/converters/windsurf.ts` | Detect + convert `.windsurfrules`, `.windsurf/rules/*.md`, `.devin/rules/*.md`; exclude `global_rules.md`. |
| `packages/migrate/src/converters/copilot.ts` | Detect + convert `.github/copilot-instructions.md` and `.github/instructions/*.instructions.md`. |
| `packages/migrate/src/converters/cline.ts` | Detect + convert `.clinerules` (file or dir, numeric-prefix sort); exclude global Cline rules dir. |
| `packages/migrate/src/converters/aider.ts` | Detect + convert `CONVENTIONS.md` and mine `.aider.conf.yml` (resolve `read:`, map lint/test cmds). |
| `packages/migrate/src/orchestrator.ts` | `detect(dir)` and `convert(options)`: run converters, order rules, build root + nested files, collect warnings, idempotent merge with existing `AGENTS.md`. |
| `packages/migrate/src/cli.ts` | CLI entry: parse argv flags, call `convert`, print summary/warnings, write or dry-run. |
| `packages/migrate/src/index.ts` | Programmatic API: re-export `detect`, `convert`, per-format converters, and types. |
| `packages/migrate/README.md` | Package docs: hook, supported-formats table, usage, lossy-mapping caveats. |
| `packages/migrate/test/*.test.ts` | One test file per task using `bun:test` + temp-dir fixtures. |

---

### Task 1: Package scaffold

**Files:**
- Create: `packages/migrate/package.json`
- Create: `packages/migrate/tsconfig.json`
- Test: `packages/migrate/test/scaffold.test.ts`

- [ ] **Step 1: Write failing scaffold test.** Create `packages/migrate/test/scaffold.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import pkg from "../package.json";

  describe("package scaffold", () => {
    test("declares the published name and bin", () => {
      expect(pkg.name).toBe("agents-md-migrate");
      expect(pkg.type).toBe("module");
      expect(pkg.bin["agents-md-migrate"]).toBe("dist/cli.js");
    });

    test("depends on yaml", () => {
      expect(pkg.dependencies.yaml).toBeDefined();
    });

    test("exports the library entry", () => {
      expect(pkg.exports["."].import).toBe("./dist/index.js");
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).** From `packages/migrate`:
  ```bash
  cd packages/migrate && bun test test/scaffold.test.ts
  ```
  Expected: FAIL — `Cannot find module '../package.json'` (the file does not exist yet).

- [ ] **Step 3: Create `packages/migrate/package.json`** with COMPLETE content:
  ```json
  {
    "name": "agents-md-migrate",
    "version": "0.1.0",
    "description": "Convert legacy AI-assistant rule files (.cursorrules, CLAUDE.md, .windsurfrules, Copilot, Cline, Aider) into a single tested AGENTS.md.",
    "type": "module",
    "license": "MIT",
    "bin": {
      "agents-md-migrate": "dist/cli.js"
    },
    "main": "dist/index.js",
    "module": "dist/index.js",
    "types": "dist/index.d.ts",
    "exports": {
      ".": {
        "import": "./dist/index.js",
        "types": "./dist/index.d.ts"
      }
    },
    "files": [
      "dist",
      "README.md"
    ],
    "scripts": {
      "build": "bun build ./src/cli.ts ./src/index.ts --outdir dist --target node --format esm && tsc --emitDeclarationOnly --outDir dist",
      "test": "bun test",
      "typecheck": "tsc --noEmit"
    },
    "dependencies": {
      "yaml": "^2.5.0"
    },
    "devDependencies": {
      "@types/node": "^20.0.0",
      "typescript": "^5.5.0"
    },
    "engines": {
      "node": ">=18"
    },
    "keywords": [
      "agents.md",
      "agents-md",
      "cursorrules",
      "claude",
      "copilot",
      "cline",
      "aider",
      "windsurf",
      "migrate",
      "converter"
    ]
  }
  ```

- [ ] **Step 4: Create `packages/migrate/tsconfig.json`** with COMPLETE content:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "moduleResolution": "bundler",
      "lib": ["ES2022"],
      "types": ["node", "bun-types"],
      "declaration": true,
      "emitDeclarationOnly": false,
      "outDir": "dist",
      "rootDir": "src",
      "strict": true,
      "noUncheckedIndexedAccess": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "resolveJsonModule": true,
      "forceConsistentCasingInFileNames": true,
      "verbatimModuleSyntax": false
    },
    "include": ["src"],
    "exclude": ["dist", "node_modules", "test"]
  }
  ```

- [ ] **Step 5: Install dependencies.** From the repo root (so the workspace resolves the new member):
  ```bash
  bun install
  ```
  Expected: `yaml`, `@types/node`, `typescript` resolved for the workspace.

- [ ] **Step 6: Run the test (expected PASS).**
  ```bash
  cd packages/migrate && bun test test/scaffold.test.ts
  ```
  Expected: PASS — 3 tests pass.

- [ ] **Step 7: Commit.**
  ```bash
  git add packages/migrate/package.json packages/migrate/tsconfig.json packages/migrate/test/scaffold.test.ts
  git commit -m "$(cat <<'EOF'
  feat(migrate): scaffold agents-md-migrate package

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 2: Core types

**Files:**
- Create: `packages/migrate/src/types.ts`
- Test: `packages/migrate/test/types.test.ts`

- [ ] **Step 1: Write failing types test.** Create `packages/migrate/test/types.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { SourceFormat, type ParsedRule, type ConversionResult } from "../src/types";

  describe("core types", () => {
    test("SourceFormat enum lists all six formats", () => {
      expect(SourceFormat.Cursor).toBe("cursor");
      expect(SourceFormat.Claude).toBe("claude");
      expect(SourceFormat.Windsurf).toBe("windsurf");
      expect(SourceFormat.Copilot).toBe("copilot");
      expect(SourceFormat.Cline).toBe("cline");
      expect(SourceFormat.Aider).toBe("aider");
    });

    test("a ParsedRule and ConversionResult are structurally usable", () => {
      const rule: ParsedRule = {
        body: "Use tabs.",
        scope: { mode: "always" },
        order: 0,
        sourceFile: ".cursorrules",
        format: SourceFormat.Cursor,
      };
      const result: ConversionResult = {
        rootAgentsMd: "# AGENTS.md\n",
        nestedFiles: [],
        warnings: [],
      };
      expect(rule.scope?.mode).toBe("always");
      expect(result.nestedFiles).toHaveLength(0);
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  ```bash
  cd packages/migrate && bun test test/types.test.ts
  ```
  Expected: FAIL — `Cannot find module '../src/types'`.

- [ ] **Step 3: Create `packages/migrate/src/types.ts`** with COMPLETE content:
  ```ts
  /** Known legacy AI-assistant rule formats this tool can convert. */
  export enum SourceFormat {
    Cursor = "cursor",
    Claude = "claude",
    Windsurf = "windsurf",
    Copilot = "copilot",
    Cline = "cline",
    Aider = "aider",
  }

  /**
   * Activation/scoping mode normalized across formats.
   * - always: always-on, inline directly into the root body.
   * - glob:   conditionally active for matching files; degrade to prose or nested AGENTS.md.
   * - manual: on-demand / user-invoked; goes under "Optional / on-demand rules" or dropped.
   * - agent:  model/agent-requested ("when relevant"); rendered as a lead-in note.
   */
  export type ScopeMode = "always" | "glob" | "manual" | "agent";

  export interface Scope {
    mode: ScopeMode;
    /** Glob patterns the rule applies to (for mode "glob"). */
    globs?: string[];
    /** Human description, used for "> Rule:" / "> When relevant:" lead-ins. */
    description?: string;
    /** Agents this rule is explicitly excluded for (Copilot excludeAgent). */
    excludeAgent?: string[];
  }

  export interface ParsedRule {
    /** Markdown body of the rule (already import-resolved, no frontmatter). */
    body: string;
    /** Normalized scoping/activation metadata. Absent => treat as always-on. */
    scope?: Scope;
    /** Stable ordering hint within a source (e.g. numeric filename prefix). */
    order?: number;
    /** Path of the file this rule came from, relative to the scanned root. */
    sourceFile: string;
    /** Format this rule was parsed from. */
    format: SourceFormat;
    /** Optional heading to group this rule under in the output. */
    heading?: string;
  }

  export interface NestedFile {
    /** Path relative to root, e.g. "src/AGENTS.md". */
    path: string;
    content: string;
  }

  export interface ConversionResult {
    rootAgentsMd: string;
    nestedFiles: NestedFile[];
    /** Human-readable warnings for every lossy degradation. */
    warnings: string[];
  }

  export interface DetectedSource {
    format: SourceFormat;
    /** Source files (relative to root) that matched this format. */
    files: string[];
  }

  export interface ConvertOptions {
    /** Directory to scan. */
    root: string;
    /** Output filename for the root file (default "AGENTS.md"). */
    out?: string;
    /** Emit nested AGENTS.md for clean directory-prefix globs (default true). */
    nested?: boolean;
    /** Drop manual/on-demand rules entirely instead of an Optional section. */
    dropManual?: boolean;
    /** Restrict to a subset of formats. Empty/undefined => all. */
    only?: SourceFormat[];
  }
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  ```bash
  cd packages/migrate && bun test test/types.test.ts
  ```
  Expected: PASS — 2 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/migrate/src/types.ts packages/migrate/test/types.test.ts
  git commit -m "$(cat <<'EOF'
  feat(migrate): add core conversion types

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 3: Frontmatter parser

**Files:**
- Create: `packages/migrate/src/frontmatter.ts`
- Test: `packages/migrate/test/frontmatter.test.ts`

- [ ] **Step 1: Write failing frontmatter test.** Create `packages/migrate/test/frontmatter.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { parseFrontmatter } from "../src/frontmatter";

  describe("parseFrontmatter", () => {
    test("splits a leading --- fence and parses YAML", () => {
      const input = "---\ndescription: My rule\nalwaysApply: true\n---\nBody line one.\nBody line two.\n";
      const { data, body } = parseFrontmatter(input);
      expect(data.description).toBe("My rule");
      expect(data.alwaysApply).toBe(true);
      expect(body).toBe("Body line one.\nBody line two.\n");
    });

    test("returns empty data when there is no frontmatter", () => {
      const input = "Just a body, no fence.\n";
      const { data, body } = parseFrontmatter(input);
      expect(data).toEqual({});
      expect(body).toBe("Just a body, no fence.\n");
    });

    test("does not treat a horizontal rule mid-document as frontmatter", () => {
      const input = "Intro paragraph.\n\n---\n\nMore text.\n";
      const { data, body } = parseFrontmatter(input);
      expect(data).toEqual({});
      expect(body).toBe(input);
    });

    test("tolerates a leading BOM and CRLF newlines", () => {
      const input = "﻿---\r\ndescription: X\r\n---\r\nBody.\r\n";
      const { data, body } = parseFrontmatter(input);
      expect(data.description).toBe("X");
      expect(body).toBe("Body.\r\n");
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  ```bash
  cd packages/migrate && bun test test/frontmatter.test.ts
  ```
  Expected: FAIL — `Cannot find module '../src/frontmatter'`.

- [ ] **Step 3: Create `packages/migrate/src/frontmatter.ts`** with COMPLETE content:
  ```ts
  import { parse as parseYaml } from "yaml";

  export interface Frontmatter {
    data: Record<string, unknown>;
    body: string;
  }

  /**
   * Split a leading `--- ... ---` YAML frontmatter fence from a markdown document.
   * Returns parsed `data` (empty object when absent or unparseable) and the remaining `body`.
   * Only a fence at the very start of the document (after an optional BOM) is treated as
   * frontmatter; a `---` later in the file is a horizontal rule and left in the body.
   */
  export function parseFrontmatter(text: string): Frontmatter {
    // Strip a UTF-8 BOM if present so the fence can be matched at index 0.
    const stripped = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

    // Match an opening fence on its own line, the YAML block, then a closing fence.
    // Allow CRLF or LF. The body is everything after the closing fence's line break.
    const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(stripped);
    if (!match) {
      return { data: {}, body: text };
    }

    const yamlSource = match[1] ?? "";
    const body = stripped.slice(match[0].length);

    let data: Record<string, unknown> = {};
    try {
      const parsed = parseYaml(yamlSource);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        data = parsed as Record<string, unknown>;
      }
    } catch {
      // Malformed YAML => treat as no usable metadata, but keep the body intact.
      data = {};
    }

    return { data, body };
  }
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  ```bash
  cd packages/migrate && bun test test/frontmatter.test.ts
  ```
  Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/migrate/src/frontmatter.ts packages/migrate/test/frontmatter.test.ts
  git commit -m "$(cat <<'EOF'
  feat(migrate): add YAML frontmatter parser

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 4: Glob utilities

**Files:**
- Create: `packages/migrate/src/glob.ts`
- Test: `packages/migrate/test/glob.test.ts`

- [ ] **Step 1: Write failing glob test.** Create `packages/migrate/test/glob.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { globToDirPrefix, splitCommaGlobs } from "../src/glob";

  describe("globToDirPrefix", () => {
    test("maps a clean directory-prefix glob to its directory", () => {
      expect(globToDirPrefix("src/**")).toBe("src");
      expect(globToDirPrefix("src/**/*")).toBe("src");
      expect(globToDirPrefix("packages/api/**")).toBe("packages/api");
      expect(globToDirPrefix("src/")).toBe("src");
    });

    test("returns null when there is no clean directory prefix", () => {
      expect(globToDirPrefix("**/*.test.ts")).toBeNull();
      expect(globToDirPrefix("src/**/*.ts")).toBeNull();
      expect(globToDirPrefix("*.md")).toBeNull();
      expect(globToDirPrefix("**")).toBeNull();
      expect(globToDirPrefix("src/{a,b}/**")).toBeNull();
    });

    test("rejects absolute, parent-escaping, or empty globs", () => {
      expect(globToDirPrefix("")).toBeNull();
      expect(globToDirPrefix("/etc/**")).toBeNull();
      expect(globToDirPrefix("../shared/**")).toBeNull();
    });

    test("normalizes a leading ./", () => {
      expect(globToDirPrefix("./src/**")).toBe("src");
    });
  });

  describe("splitCommaGlobs", () => {
    test("splits bare comma-separated globs and trims", () => {
      expect(splitCommaGlobs("src/**, *.ts ,docs/**")).toEqual(["src/**", "*.ts", "docs/**"]);
    });

    test("returns an empty array for empty/whitespace input", () => {
      expect(splitCommaGlobs("")).toEqual([]);
      expect(splitCommaGlobs("   ")).toEqual([]);
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  ```bash
  cd packages/migrate && bun test test/glob.test.ts
  ```
  Expected: FAIL — `Cannot find module '../src/glob'`.

- [ ] **Step 3: Create `packages/migrate/src/glob.ts`** with COMPLETE content:
  ```ts
  /**
   * Detect whether a glob is a clean directory prefix (everything under one directory)
   * and, if so, return that directory path. Otherwise return null.
   *
   * Clean prefixes:  "src/**", "src/**/*", "packages/api/**", "src/", "./src/**"
   * Not clean:       "**/*.test.ts", "src/**/*.ts", "*.md", "**", "src/{a,b}/**"
   */
  export function globToDirPrefix(glob: string): string | null {
    let g = glob.trim();
    if (g === "") return null;

    // Reject absolute paths and parent traversal — nested AGENTS.md must live under root.
    if (g.startsWith("/") || g.startsWith("../") || g.includes("/../")) return null;

    // Normalize a leading "./" and a trailing slash.
    if (g.startsWith("./")) g = g.slice(2);
    if (g.endsWith("/")) g = g.slice(0, -1);
    if (g === "") return null;

    // Strip a single trailing recursive segment: "/**" or "/**/*".
    if (g.endsWith("/**/*")) g = g.slice(0, -"/**/*".length);
    else if (g.endsWith("/**")) g = g.slice(0, -"/**".length);
    else return null; // No recursive directory suffix => not a clean directory prefix.

    if (g === "") return null;

    // The remaining prefix must contain no glob metacharacters at all.
    if (/[*?{}\[\]!]/.test(g)) return null;

    return g;
  }

  /**
   * Split a bare comma-separated glob string (Cursor `globs`, Copilot `applyTo`)
   * into trimmed, non-empty patterns.
   */
  export function splitCommaGlobs(value: string): string[] {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  ```bash
  cd packages/migrate && bun test test/glob.test.ts
  ```
  Expected: PASS — 6 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/migrate/src/glob.ts packages/migrate/test/glob.test.ts
  git commit -m "$(cat <<'EOF'
  feat(migrate): add glob-to-dir-prefix and comma-split helpers

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 5: Section-merge helper

**Files:**
- Create: `packages/migrate/src/merge.ts`
- Test: `packages/migrate/test/merge.test.ts`

- [ ] **Step 1: Write failing merge test.** Create `packages/migrate/test/merge.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { mergeSections, hashBody, extractHeadings } from "../src/merge";

  describe("extractHeadings", () => {
    test("collects ATX headings ignoring those inside fenced code blocks", () => {
      const md = "# Title\n\n```\n# not a heading\n```\n\n## Real Section\n";
      expect(extractHeadings(md)).toEqual(["# Title", "## Real Section"]);
    });
  });

  describe("hashBody", () => {
    test("is stable and ignores leading/trailing whitespace", () => {
      expect(hashBody("  hello\n")).toBe(hashBody("hello"));
      expect(hashBody("a")).not.toBe(hashBody("b"));
    });
  });

  describe("mergeSections", () => {
    test("appends a new section to existing content", () => {
      const existing = "# AGENTS.md\n\n## Setup\n\nRun bun install.\n";
      const additions = "## Testing\n\nRun bun test.\n";
      const merged = mergeSections(existing, additions);
      expect(merged).toContain("## Setup");
      expect(merged).toContain("## Testing");
      expect(merged.trimEnd().endsWith("Run bun test.")).toBe(true);
    });

    test("does not duplicate a section already present by heading + content", () => {
      const existing = "# AGENTS.md\n\n## Testing\n\nRun bun test.\n";
      const additions = "## Testing\n\nRun bun test.\n";
      const merged = mergeSections(existing, additions);
      const occurrences = merged.split("## Testing").length - 1;
      expect(occurrences).toBe(1);
    });

    test("keeps a same-named heading whose body differs", () => {
      const existing = "## Testing\n\nRun bun test.\n";
      const additions = "## Testing\n\nRun the e2e suite too.\n";
      const merged = mergeSections(existing, additions);
      expect(merged).toContain("Run bun test.");
      expect(merged).toContain("Run the e2e suite too.");
    });

    test("merging into empty existing returns the additions", () => {
      expect(mergeSections("", "## A\n\nbody\n").trim()).toBe("## A\n\nbody");
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  ```bash
  cd packages/migrate && bun test test/merge.test.ts
  ```
  Expected: FAIL — `Cannot find module '../src/merge'`.

- [ ] **Step 3: Create `packages/migrate/src/merge.ts`** with COMPLETE content:
  ```ts
  import { createHash } from "node:crypto";

  /** Stable content hash, whitespace-insensitive at the edges. */
  export function hashBody(text: string): string {
    return createHash("sha256").update(text.trim()).digest("hex").slice(0, 16);
  }

  /** Collect ATX headings ("# ...", "## ...") not inside fenced code blocks. */
  export function extractHeadings(markdown: string): string[] {
    const headings: string[] = [];
    let inFence = false;
    for (const line of markdown.split("\n")) {
      const fence = /^(```|~~~)/.test(line.trim());
      if (fence) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;
      if (/^#{1,6}\s+\S/.test(line)) {
        headings.push(line.trim());
      }
    }
    return headings;
  }

  interface Section {
    heading: string | null; // null = preamble before the first heading
    body: string; // includes the heading line; full block text
  }

  /** Split markdown into sections keyed by their (top-level-or-any) ATX heading. */
  function splitSections(markdown: string): Section[] {
    const lines = markdown.split("\n");
    const sections: Section[] = [];
    let current: Section = { heading: null, body: "" };
    let inFence = false;

    const push = () => {
      if (current.body.trim() !== "" || current.heading !== null) {
        sections.push(current);
      }
    };

    for (const line of lines) {
      const fence = /^(```|~~~)/.test(line.trim());
      if (fence) inFence = !inFence;
      const isHeading = !inFence && /^#{1,6}\s+\S/.test(line);
      if (isHeading) {
        push();
        current = { heading: line.trim(), body: line + "\n" };
      } else {
        current.body += line + "\n";
      }
    }
    push();
    return sections;
  }

  /**
   * Merge `additions` into `existing` markdown, appending only sections that are
   * not already present. A section is considered a duplicate when an existing
   * section shares the same heading AND the same content hash.
   */
  export function mergeSections(existing: string, additions: string): string {
    if (existing.trim() === "") return additions;
    if (additions.trim() === "") return existing;

    const existingSections = splitSections(existing);
    const existingKeys = new Set(
      existingSections
        .filter((s) => s.heading !== null)
        .map((s) => `${s.heading}::${hashBody(s.body)}`),
    );

    const newBlocks: string[] = [];
    for (const section of splitSections(additions)) {
      if (section.heading === null) {
        // Preamble in additions is uncommon; append only if non-empty and unseen.
        if (section.body.trim() !== "") newBlocks.push(section.body.trimEnd());
        continue;
      }
      const key = `${section.heading}::${hashBody(section.body)}`;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      newBlocks.push(section.body.trimEnd());
    }

    if (newBlocks.length === 0) return existing;

    const base = existing.trimEnd();
    return base + "\n\n" + newBlocks.join("\n\n") + "\n";
  }
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  ```bash
  cd packages/migrate && bun test test/merge.test.ts
  ```
  Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/migrate/src/merge.ts packages/migrate/test/merge.test.ts
  git commit -m "$(cat <<'EOF'
  feat(migrate): add idempotent section-merge helper

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 6: Rules-to-markdown renderer

**Files:**
- Create: `packages/migrate/src/rules.ts`
- Test: `packages/migrate/test/rules.test.ts`

This module turns ordered `ParsedRule[]` into a root markdown body plus nested files, applying the scoping-degradation policy (always inline, glob -> prose or nested, agent -> "> When relevant:", manual -> Optional section or dropped) and collecting warnings.

- [ ] **Step 1: Write failing rules test.** Create `packages/migrate/test/rules.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { rulesToMarkdown } from "../src/rules";
  import { SourceFormat, type ParsedRule } from "../src/types";

  function rule(p: Partial<ParsedRule>): ParsedRule {
    return { body: "Body.", sourceFile: "x", format: SourceFormat.Cursor, ...p };
  }

  describe("rulesToMarkdown", () => {
    test("inlines always-on rules in order", () => {
      const { rootBody, nestedFiles, warnings } = rulesToMarkdown(
        [
          rule({ body: "First rule.", scope: { mode: "always" }, order: 0 }),
          rule({ body: "Second rule.", scope: { mode: "always" }, order: 1 }),
        ],
        { nested: true, dropManual: false },
      );
      expect(rootBody.indexOf("First rule.")).toBeLessThan(rootBody.indexOf("Second rule."));
      expect(nestedFiles).toHaveLength(0);
      expect(warnings).toHaveLength(0);
    });

    test("degrades a non-prefix glob to an 'Applies to' prose prefix and warns", () => {
      const { rootBody, nestedFiles, warnings } = rulesToMarkdown(
        [rule({ body: "Type tests carefully.", scope: { mode: "glob", globs: ["**/*.test.ts"] } })],
        { nested: true, dropManual: false },
      );
      expect(rootBody).toContain("Applies to `**/*.test.ts`:");
      expect(rootBody).toContain("Type tests carefully.");
      expect(nestedFiles).toHaveLength(0);
      expect(warnings.some((w) => w.includes("scoping"))).toBe(true);
    });

    test("routes a clean directory-prefix glob into a nested AGENTS.md", () => {
      const { rootBody, nestedFiles } = rulesToMarkdown(
        [rule({ body: "Frontend rule.", scope: { mode: "glob", globs: ["src/**"] } })],
        { nested: true, dropManual: false },
      );
      expect(nestedFiles).toHaveLength(1);
      expect(nestedFiles[0]!.path).toBe("src/AGENTS.md");
      expect(nestedFiles[0]!.content).toContain("Frontend rule.");
      expect(rootBody).not.toContain("Frontend rule.");
    });

    test("falls back to prose for dir-prefix globs when nested is disabled", () => {
      const { rootBody, nestedFiles } = rulesToMarkdown(
        [rule({ body: "Frontend rule.", scope: { mode: "glob", globs: ["src/**"] } })],
        { nested: false, dropManual: false },
      );
      expect(nestedFiles).toHaveLength(0);
      expect(rootBody).toContain("Applies to `src/**`:");
    });

    test("renders an agent-requested rule with a 'When relevant' lead-in", () => {
      const { rootBody } = rulesToMarkdown(
        [rule({ body: "Use the cache.", scope: { mode: "agent", description: "Performance tuning" } })],
        { nested: true, dropManual: false },
      );
      expect(rootBody).toContain("> When relevant: Performance tuning");
      expect(rootBody).toContain("Use the cache.");
    });

    test("puts manual rules under an Optional section and warns", () => {
      const { rootBody, warnings } = rulesToMarkdown(
        [rule({ body: "Release steps.", scope: { mode: "manual" } })],
        { nested: true, dropManual: false },
      );
      expect(rootBody).toContain("## Optional / on-demand rules");
      expect(rootBody).toContain("Release steps.");
      expect(warnings.some((w) => w.includes("manual"))).toBe(true);
    });

    test("drops manual rules entirely when dropManual is set, with a warning", () => {
      const { rootBody, warnings } = rulesToMarkdown(
        [rule({ body: "Release steps.", scope: { mode: "manual" } })],
        { nested: true, dropManual: true },
      );
      expect(rootBody).not.toContain("Release steps.");
      expect(rootBody).not.toContain("## Optional / on-demand rules");
      expect(warnings.some((w) => w.includes("dropped"))).toBe(true);
    });

    test("emits a '> Rule:' lead-in for glob rules that carry a description", () => {
      const { rootBody } = rulesToMarkdown(
        [rule({ body: "Validate input.", scope: { mode: "glob", globs: ["**/*.test.ts"], description: "API tests" } })],
        { nested: true, dropManual: false },
      );
      expect(rootBody).toContain("> Rule: API tests");
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  ```bash
  cd packages/migrate && bun test test/rules.test.ts
  ```
  Expected: FAIL — `Cannot find module '../src/rules'`.

- [ ] **Step 3: Create `packages/migrate/src/rules.ts`** with COMPLETE content:
  ```ts
  import type { ParsedRule, NestedFile } from "./types";
  import { globToDirPrefix } from "./glob";

  export interface RenderOptions {
    nested: boolean;
    dropManual: boolean;
  }

  export interface RenderResult {
    rootBody: string;
    nestedFiles: NestedFile[];
    warnings: string[];
  }

  /** Stable sort by (order ?? 0) then sourceFile, preserving input order on ties. */
  function sortRules(rules: ParsedRule[]): ParsedRule[] {
    return rules
      .map((r, i) => ({ r, i }))
      .sort((a, b) => {
        const oa = a.r.order ?? 0;
        const ob = b.r.order ?? 0;
        if (oa !== ob) return oa - ob;
        if (a.r.sourceFile !== b.r.sourceFile) return a.r.sourceFile < b.r.sourceFile ? -1 : 1;
        return a.i - b.i;
      })
      .map((x) => x.r);
  }

  /** Render a single rule's body, with any description lead-in, as a markdown block. */
  function renderRuleBlock(rule: ParsedRule, leadIn?: string): string {
    const parts: string[] = [];
    if (rule.heading) parts.push(rule.heading);
    if (leadIn) parts.push(leadIn);
    parts.push(rule.body.trim());
    return parts.join("\n\n");
  }

  /** Note any excluded agents inline (Copilot excludeAgent). */
  function excludeNote(rule: ParsedRule): string | null {
    const ex = rule.scope?.excludeAgent;
    if (!ex || ex.length === 0) return null;
    return `> (excluded for: ${ex.join(", ")})`;
  }

  /**
   * Render ordered rules into a root markdown body and nested AGENTS.md files,
   * degrading scoping metadata to prose / nested files and collecting warnings.
   */
  export function rulesToMarkdown(rules: ParsedRule[], options: RenderOptions): RenderResult {
    const warnings: string[] = [];
    const inlineBlocks: string[] = [];
    const optionalBlocks: string[] = [];
    // dir prefix -> accumulated nested-file blocks
    const nestedByDir = new Map<string, string[]>();

    const ordered = sortRules(rules);
    // Always-on first, then everything else; preserve relative order within each group.
    const always = ordered.filter((r) => (r.scope?.mode ?? "always") === "always");
    const rest = ordered.filter((r) => (r.scope?.mode ?? "always") !== "always");

    for (const rule of always) {
      const block = renderRuleBlock(rule);
      const ex = excludeNote(rule);
      inlineBlocks.push(ex ? `${block}\n\n${ex}` : block);
    }

    for (const rule of rest) {
      const mode = rule.scope?.mode ?? "always";
      const ex = excludeNote(rule);

      if (mode === "glob") {
        const globs = rule.scope?.globs ?? [];
        const dir = options.nested && globs.length === 1 ? globToDirPrefix(globs[0]!) : null;
        if (dir) {
          // Route into a nested AGENTS.md under the directory prefix.
          const desc = rule.scope?.description ? `> Rule: ${rule.scope.description}` : undefined;
          const block = renderRuleBlock(rule, desc);
          const arr = nestedByDir.get(dir) ?? [];
          arr.push(ex ? `${block}\n\n${ex}` : block);
          nestedByDir.set(dir, arr);
          warnings.push(
            `Rule from ${rule.sourceFile} scoped to "${globs[0]}" moved to nested ${dir}/AGENTS.md.`,
          );
        } else {
          // Degrade to an "Applies to" prose prefix in the root body.
          const globText = globs.length > 0 ? globs.join(", ") : "(unspecified)";
          const lead = rule.scope?.description ? `> Rule: ${rule.scope.description}` : undefined;
          const applies = `Applies to \`${globText}\`:`;
          const block = renderRuleBlock(rule, lead ? `${lead}\n\n${applies}` : applies);
          inlineBlocks.push(ex ? `${block}\n\n${ex}` : block);
          warnings.push(
            `Lossy: glob scoping for ${rule.sourceFile} ("${globText}") degraded to prose; AGENTS.md has no scoping field.`,
          );
        }
        continue;
      }

      if (mode === "agent") {
        const desc = rule.scope?.description ?? "see below";
        const block = renderRuleBlock(rule, `> When relevant: ${desc}`);
        inlineBlocks.push(ex ? `${block}\n\n${ex}` : block);
        warnings.push(
          `Lossy: agent-requested activation for ${rule.sourceFile} rendered as a "When relevant" note (no equivalent in AGENTS.md).`,
        );
        continue;
      }

      // mode === "manual"
      if (options.dropManual) {
        warnings.push(`Manual/on-demand rule from ${rule.sourceFile} dropped (--drop-manual).`);
        continue;
      }
      const block = renderRuleBlock(rule);
      optionalBlocks.push(ex ? `${block}\n\n${ex}` : block);
      warnings.push(
        `Lossy: manual/on-demand rule from ${rule.sourceFile} moved under "Optional / on-demand rules".`,
      );
    }

    const sections: string[] = [];
    if (inlineBlocks.length > 0) sections.push(inlineBlocks.join("\n\n"));
    if (optionalBlocks.length > 0) {
      sections.push(`## Optional / on-demand rules\n\n${optionalBlocks.join("\n\n")}`);
    }

    const nestedFiles: NestedFile[] = [];
    for (const [dir, blocks] of [...nestedByDir.entries()].sort()) {
      nestedFiles.push({
        path: `${dir}/AGENTS.md`,
        content: `# AGENTS.md\n\n${blocks.join("\n\n")}\n`,
      });
    }

    return { rootBody: sections.join("\n\n"), nestedFiles, warnings };
  }
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  ```bash
  cd packages/migrate && bun test test/rules.test.ts
  ```
  Expected: PASS — 8 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/migrate/src/rules.ts packages/migrate/test/rules.test.ts
  git commit -m "$(cat <<'EOF'
  feat(migrate): add rules-to-markdown renderer with scope degradation

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 7: Cursor converter

**Files:**
- Create: `packages/migrate/src/converters/cursor.ts`
- Test: `packages/migrate/test/cursor.test.ts`

Mapping (verified): legacy `.cursorrules` (plain) -> always-on inline. New `.cursor/rules/**/*.mdc`: frontmatter `description` (string), `globs` (COMMA-SEPARATED bare string — split on comma, NOT YAML array), `alwaysApply` (bool). `alwaysApply:true` -> `always`; `globs` set -> `glob`; neither -> `manual`. `description` -> lead-in.

- [ ] **Step 1: Write failing cursor test.** Create `packages/migrate/test/cursor.test.ts`:
  ```ts
  import { test, expect, describe, beforeEach, afterEach } from "bun:test";
  import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
  import { join } from "node:path";
  import { tmpdir } from "node:os";
  import { detectCursor, convertCursor } from "../src/converters/cursor";
  import { SourceFormat } from "../src/types";

  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "cursor-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe("cursor converter", () => {
    test("legacy .cursorrules becomes a single always-on rule", () => {
      writeFileSync(join(dir, ".cursorrules"), "Always use 2-space indentation.\n");
      expect(detectCursor(dir)).toEqual([".cursorrules"]);
      const rules = convertCursor(dir);
      expect(rules).toHaveLength(1);
      expect(rules[0]!.body).toBe("Always use 2-space indentation.");
      expect(rules[0]!.scope?.mode).toBe("always");
      expect(rules[0]!.format).toBe(SourceFormat.Cursor);
    });

    test(".mdc with alwaysApply true maps to always-on", () => {
      mkdirSync(join(dir, ".cursor", "rules"), { recursive: true });
      writeFileSync(
        join(dir, ".cursor", "rules", "style.mdc"),
        "---\ndescription: Style guide\nalwaysApply: true\n---\nUse named exports.\n",
      );
      const rules = convertCursor(dir);
      expect(rules).toHaveLength(1);
      expect(rules[0]!.scope?.mode).toBe("always");
      expect(rules[0]!.body).toBe("Use named exports.");
    });

    test(".mdc with comma-separated globs maps to glob mode (split on comma, not YAML)", () => {
      mkdirSync(join(dir, ".cursor", "rules"), { recursive: true });
      writeFileSync(
        join(dir, ".cursor", "rules", "api.mdc"),
        "---\ndescription: API rules\nglobs: src/api/**, **/*.controller.ts\nalwaysApply: false\n---\nValidate all inputs.\n",
      );
      const rules = convertCursor(dir);
      expect(rules).toHaveLength(1);
      expect(rules[0]!.scope?.mode).toBe("glob");
      expect(rules[0]!.scope?.globs).toEqual(["src/api/**", "**/*.controller.ts"]);
      expect(rules[0]!.scope?.description).toBe("API rules");
    });

    test(".mdc with no globs and no alwaysApply maps to manual", () => {
      mkdirSync(join(dir, ".cursor", "rules"), { recursive: true });
      writeFileSync(
        join(dir, ".cursor", "rules", "release.mdc"),
        "---\ndescription: Release steps\n---\nTag and publish.\n",
      );
      const rules = convertCursor(dir);
      expect(rules[0]!.scope?.mode).toBe("manual");
    });

    test("returns no rules when no cursor files exist", () => {
      expect(detectCursor(dir)).toEqual([]);
      expect(convertCursor(dir)).toEqual([]);
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  ```bash
  cd packages/migrate && bun test test/cursor.test.ts
  ```
  Expected: FAIL — `Cannot find module '../src/converters/cursor'`.

- [ ] **Step 3: Create `packages/migrate/src/converters/cursor.ts`** with COMPLETE content:
  ```ts
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
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  ```bash
  cd packages/migrate && bun test test/cursor.test.ts
  ```
  Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/migrate/src/converters/cursor.ts packages/migrate/test/cursor.test.ts
  git commit -m "$(cat <<'EOF'
  feat(migrate): add Cursor (.cursorrules + .mdc) converter

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 8: Claude Code converter

**Files:**
- Create: `packages/migrate/src/converters/claude.ts`
- Test: `packages/migrate/test/claude.test.ts`

Mapping (verified): root `CLAUDE.md` -> root always-on; subdir `CLAUDE.md` -> nested AGENTS.md (carried via `scope.globs = ["<dir>/**"]` so the renderer routes it). Resolve `@path` imports relative to the importer, depth <= 5, skipping `@` references inside fenced code blocks. Concatenate `.claude/rules/*`. EXCLUDE `~/.claude/CLAUDE.md` (never scanned — outside root) and `CLAUDE.local.md`.

- [ ] **Step 1: Write failing claude test.** Create `packages/migrate/test/claude.test.ts`:
  ```ts
  import { test, expect, describe, beforeEach, afterEach } from "bun:test";
  import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
  import { join } from "node:path";
  import { tmpdir } from "node:os";
  import { detectClaude, convertClaude } from "../src/converters/claude";

  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "claude-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe("claude converter", () => {
    test("root CLAUDE.md becomes an always-on rule", () => {
      writeFileSync(join(dir, "CLAUDE.md"), "# Project\n\nRun bun test before commits.\n");
      expect(detectClaude(dir)).toContain("CLAUDE.md");
      const rules = convertClaude(dir);
      const root = rules.find((r) => r.sourceFile === "CLAUDE.md")!;
      expect(root.scope?.mode).toBe("always");
      expect(root.body).toContain("Run bun test before commits.");
    });

    test("resolves @path imports by inlining the referenced file", () => {
      writeFileSync(join(dir, "CLAUDE.md"), "Style rules:\n\n@docs/style.md\n");
      mkdirSync(join(dir, "docs"), { recursive: true });
      writeFileSync(join(dir, "docs", "style.md"), "Use tabs, not spaces.\n");
      const rules = convertClaude(dir);
      const root = rules.find((r) => r.sourceFile === "CLAUDE.md")!;
      expect(root.body).toContain("Use tabs, not spaces.");
      expect(root.body).not.toContain("@docs/style.md");
    });

    test("does not resolve @path references inside fenced code blocks", () => {
      writeFileSync(
        join(dir, "CLAUDE.md"),
        "Example:\n\n```\n@docs/style.md\n```\n",
      );
      mkdirSync(join(dir, "docs"), { recursive: true });
      writeFileSync(join(dir, "docs", "style.md"), "SHOULD NOT APPEAR.\n");
      const rules = convertClaude(dir);
      const root = rules.find((r) => r.sourceFile === "CLAUDE.md")!;
      expect(root.body).toContain("@docs/style.md");
      expect(root.body).not.toContain("SHOULD NOT APPEAR.");
    });

    test("subdir CLAUDE.md becomes a glob-scoped rule for nesting", () => {
      mkdirSync(join(dir, "frontend"), { recursive: true });
      writeFileSync(join(dir, "frontend", "CLAUDE.md"), "Use React function components.\n");
      const rules = convertClaude(dir);
      const sub = rules.find((r) => r.sourceFile === "frontend/CLAUDE.md")!;
      expect(sub.scope?.mode).toBe("glob");
      expect(sub.scope?.globs).toEqual(["frontend/**"]);
    });

    test("concatenates .claude/rules/* files", () => {
      mkdirSync(join(dir, ".claude", "rules"), { recursive: true });
      writeFileSync(join(dir, ".claude", "rules", "a.md"), "Rule A.\n");
      writeFileSync(join(dir, ".claude", "rules", "b.md"), "Rule B.\n");
      const rules = convertClaude(dir);
      const bodies = rules.map((r) => r.body).join("\n");
      expect(bodies).toContain("Rule A.");
      expect(bodies).toContain("Rule B.");
    });

    test("excludes CLAUDE.local.md (personal file)", () => {
      writeFileSync(join(dir, "CLAUDE.md"), "Shared rules.\n");
      writeFileSync(join(dir, "CLAUDE.local.md"), "MY SECRET LOCAL RULE.\n");
      expect(detectClaude(dir)).not.toContain("CLAUDE.local.md");
      const rules = convertClaude(dir);
      expect(rules.map((r) => r.body).join("\n")).not.toContain("MY SECRET LOCAL RULE.");
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  ```bash
  cd packages/migrate && bun test test/claude.test.ts
  ```
  Expected: FAIL — `Cannot find module '../src/converters/claude'`.

- [ ] **Step 3: Create `packages/migrate/src/converters/claude.ts`** with COMPLETE content:
  ```ts
  import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
  import { join, dirname, relative, sep, posix } from "node:path";
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
        const key = target.toLowerCase();
        if (existsSync(target) && statSync(target).isFile() && !seen.has(key)) {
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
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  ```bash
  cd packages/migrate && bun test test/claude.test.ts
  ```
  Expected: PASS — 6 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/migrate/src/converters/claude.ts packages/migrate/test/claude.test.ts
  git commit -m "$(cat <<'EOF'
  feat(migrate): add Claude Code converter with @import resolution

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 9: Windsurf converter

**Files:**
- Create: `packages/migrate/src/converters/windsurf.ts`
- Test: `packages/migrate/test/windsurf.test.ts`

Mapping (verified): legacy `.windsurfrules` -> always-on inline. New `.windsurf/rules/*.md` and `.devin/rules/*.md`: frontmatter `trigger` (`always_on`|`manual`|`model_decision`|`glob`), `globs`, `description`. `always_on` -> `always`; `glob` + `globs` -> `glob`; `model_decision` -> `agent` (rendered "> When relevant: <description>"); `manual` -> `manual`. EXCLUDE `global_rules.md`.

- [ ] **Step 1: Write failing windsurf test.** Create `packages/migrate/test/windsurf.test.ts`:
  ```ts
  import { test, expect, describe, beforeEach, afterEach } from "bun:test";
  import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
  import { join } from "node:path";
  import { tmpdir } from "node:os";
  import { detectWindsurf, convertWindsurf } from "../src/converters/windsurf";

  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "windsurf-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe("windsurf converter", () => {
    test("legacy .windsurfrules becomes an always-on rule", () => {
      writeFileSync(join(dir, ".windsurfrules"), "Prefer composition over inheritance.\n");
      expect(detectWindsurf(dir)).toEqual([".windsurfrules"]);
      const rules = convertWindsurf(dir);
      expect(rules[0]!.scope?.mode).toBe("always");
      expect(rules[0]!.body).toBe("Prefer composition over inheritance.");
    });

    test("trigger always_on maps to always", () => {
      mkdirSync(join(dir, ".windsurf", "rules"), { recursive: true });
      writeFileSync(
        join(dir, ".windsurf", "rules", "core.md"),
        "---\ntrigger: always_on\n---\nNever log secrets.\n",
      );
      expect(convertWindsurf(dir)[0]!.scope?.mode).toBe("always");
    });

    test("trigger glob with globs maps to glob mode", () => {
      mkdirSync(join(dir, ".windsurf", "rules"), { recursive: true });
      writeFileSync(
        join(dir, ".windsurf", "rules", "api.md"),
        "---\ntrigger: glob\nglobs: src/api/**\ndescription: API rules\n---\nValidate inputs.\n",
      );
      const r = convertWindsurf(dir)[0]!;
      expect(r.scope?.mode).toBe("glob");
      expect(r.scope?.globs).toEqual(["src/api/**"]);
    });

    test("trigger model_decision maps to agent mode with description", () => {
      mkdirSync(join(dir, ".windsurf", "rules"), { recursive: true });
      writeFileSync(
        join(dir, ".windsurf", "rules", "perf.md"),
        "---\ntrigger: model_decision\ndescription: Performance tuning\n---\nUse memoization.\n",
      );
      const r = convertWindsurf(dir)[0]!;
      expect(r.scope?.mode).toBe("agent");
      expect(r.scope?.description).toBe("Performance tuning");
    });

    test("trigger manual maps to manual mode", () => {
      mkdirSync(join(dir, ".windsurf", "rules"), { recursive: true });
      writeFileSync(
        join(dir, ".windsurf", "rules", "rel.md"),
        "---\ntrigger: manual\n---\nRelease checklist.\n",
      );
      expect(convertWindsurf(dir)[0]!.scope?.mode).toBe("manual");
    });

    test("also reads .devin/rules/*.md", () => {
      mkdirSync(join(dir, ".devin", "rules"), { recursive: true });
      writeFileSync(
        join(dir, ".devin", "rules", "d.md"),
        "---\ntrigger: always_on\n---\nDevin rule.\n",
      );
      expect(convertWindsurf(dir).some((r) => r.body === "Devin rule.")).toBe(true);
    });

    test("excludes global_rules.md", () => {
      writeFileSync(join(dir, "global_rules.md"), "GLOBAL PERSONAL RULE.\n");
      expect(detectWindsurf(dir)).not.toContain("global_rules.md");
      expect(convertWindsurf(dir).map((r) => r.body).join("\n")).not.toContain("GLOBAL PERSONAL RULE.");
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  ```bash
  cd packages/migrate && bun test test/windsurf.test.ts
  ```
  Expected: FAIL — `Cannot find module '../src/converters/windsurf'`.

- [ ] **Step 3: Create `packages/migrate/src/converters/windsurf.ts`** with COMPLETE content:
  ```ts
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
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  ```bash
  cd packages/migrate && bun test test/windsurf.test.ts
  ```
  Expected: PASS — 7 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/migrate/src/converters/windsurf.ts packages/migrate/test/windsurf.test.ts
  git commit -m "$(cat <<'EOF'
  feat(migrate): add Windsurf/.devin converter

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 10: GitHub Copilot converter

**Files:**
- Create: `packages/migrate/src/converters/copilot.ts`
- Test: `packages/migrate/test/copilot.test.ts`

Mapping (verified): `.github/copilot-instructions.md` -> root always-on. `.github/instructions/*.instructions.md`: frontmatter `applyTo` (comma-separated glob string; `"**"` = all), `description`, `excludeAgent` (`code-review`|`cloud-agent`). `applyTo:"**"` -> `always`; `applyTo` glob -> `glob`; `excludeAgent` -> recorded on scope and noted "(excluded for: ...)".

- [ ] **Step 1: Write failing copilot test.** Create `packages/migrate/test/copilot.test.ts`:
  ```ts
  import { test, expect, describe, beforeEach, afterEach } from "bun:test";
  import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
  import { join } from "node:path";
  import { tmpdir } from "node:os";
  import { detectCopilot, convertCopilot } from "../src/converters/copilot";

  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "copilot-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe("copilot converter", () => {
    test("copilot-instructions.md becomes an always-on rule", () => {
      mkdirSync(join(dir, ".github"), { recursive: true });
      writeFileSync(join(dir, ".github", "copilot-instructions.md"), "Use conventional commits.\n");
      expect(detectCopilot(dir)).toContain(".github/copilot-instructions.md");
      const r = convertCopilot(dir).find((x) => x.sourceFile === ".github/copilot-instructions.md")!;
      expect(r.scope?.mode).toBe("always");
      expect(r.body).toBe("Use conventional commits.");
    });

    test("instructions file with applyTo ** maps to always", () => {
      mkdirSync(join(dir, ".github", "instructions"), { recursive: true });
      writeFileSync(
        join(dir, ".github", "instructions", "all.instructions.md"),
        "---\napplyTo: \"**\"\n---\nAlways add JSDoc.\n",
      );
      expect(convertCopilot(dir)[0]!.scope?.mode).toBe("always");
    });

    test("instructions file with a real glob maps to glob mode", () => {
      mkdirSync(join(dir, ".github", "instructions"), { recursive: true });
      writeFileSync(
        join(dir, ".github", "instructions", "ts.instructions.md"),
        "---\napplyTo: \"src/**, **/*.ts\"\ndescription: TS rules\n---\nNo any.\n",
      );
      const r = convertCopilot(dir)[0]!;
      expect(r.scope?.mode).toBe("glob");
      expect(r.scope?.globs).toEqual(["src/**", "**/*.ts"]);
      expect(r.scope?.description).toBe("TS rules");
    });

    test("excludeAgent is recorded on the scope", () => {
      mkdirSync(join(dir, ".github", "instructions"), { recursive: true });
      writeFileSync(
        join(dir, ".github", "instructions", "x.instructions.md"),
        "---\napplyTo: \"**\"\nexcludeAgent: code-review\n---\nNote.\n",
      );
      expect(convertCopilot(dir)[0]!.scope?.excludeAgent).toEqual(["code-review"]);
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  ```bash
  cd packages/migrate && bun test test/copilot.test.ts
  ```
  Expected: FAIL — `Cannot find module '../src/converters/copilot'`.

- [ ] **Step 3: Create `packages/migrate/src/converters/copilot.ts`** with COMPLETE content:
  ```ts
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
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  ```bash
  cd packages/migrate && bun test test/copilot.test.ts
  ```
  Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/migrate/src/converters/copilot.ts packages/migrate/test/copilot.test.ts
  git commit -m "$(cat <<'EOF'
  feat(migrate): add GitHub Copilot instructions converter

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 11: Cline converter

**Files:**
- Create: `packages/migrate/src/converters/cline.ts`
- Test: `packages/migrate/test/cline.test.ts`

Mapping (verified): `.clinerules` single file OR `.clinerules/` dir (`*.md`/`*.txt`, preserve numeric-prefix sort like `01-*.md`). Frontmatter `paths` is a YAML ARRAY (parse with the yaml lib via the frontmatter parser, then join for prose). No frontmatter -> always-on inline. EXCLUDE global `~/Documents/Cline/Rules` (outside root — never scanned).

- [ ] **Step 1: Write failing cline test.** Create `packages/migrate/test/cline.test.ts`:
  ```ts
  import { test, expect, describe, beforeEach, afterEach } from "bun:test";
  import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
  import { join } from "node:path";
  import { tmpdir } from "node:os";
  import { detectCline, convertCline } from "../src/converters/cline";

  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "cline-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe("cline converter", () => {
    test("single .clinerules file becomes an always-on rule", () => {
      writeFileSync(join(dir, ".clinerules"), "Write small functions.\n");
      expect(detectCline(dir)).toEqual([".clinerules"]);
      const r = convertCline(dir)[0]!;
      expect(r.scope?.mode).toBe("always");
      expect(r.body).toBe("Write small functions.");
    });

    test(".clinerules/ dir preserves numeric-prefix sort", () => {
      mkdirSync(join(dir, ".clinerules"), { recursive: true });
      writeFileSync(join(dir, ".clinerules", "02-style.md"), "Second.\n");
      writeFileSync(join(dir, ".clinerules", "01-setup.md"), "First.\n");
      const rules = convertCline(dir);
      expect(rules.map((r) => r.body)).toEqual(["First.", "Second."]);
      expect(rules[0]!.order).toBe(1);
      expect(rules[1]!.order).toBe(2);
    });

    test("frontmatter paths (YAML array) maps to glob mode joined for prose", () => {
      mkdirSync(join(dir, ".clinerules"), { recursive: true });
      writeFileSync(
        join(dir, ".clinerules", "10-api.md"),
        "---\npaths:\n  - src/api/**\n  - lib/**\n---\nValidate inputs.\n",
      );
      const r = convertCline(dir)[0]!;
      expect(r.scope?.mode).toBe("glob");
      expect(r.scope?.globs).toEqual(["src/api/**", "lib/**"]);
    });

    test("file in dir without frontmatter is always-on", () => {
      mkdirSync(join(dir, ".clinerules"), { recursive: true });
      writeFileSync(join(dir, ".clinerules", "00-core.txt"), "Core rule.\n");
      expect(convertCline(dir)[0]!.scope?.mode).toBe("always");
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  ```bash
  cd packages/migrate && bun test test/cline.test.ts
  ```
  Expected: FAIL — `Cannot find module '../src/converters/cline'`.

- [ ] **Step 3: Create `packages/migrate/src/converters/cline.ts`** with COMPLETE content:
  ```ts
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
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  ```bash
  cd packages/migrate && bun test test/cline.test.ts
  ```
  Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/migrate/src/converters/cline.ts packages/migrate/test/cline.test.ts
  git commit -m "$(cat <<'EOF'
  feat(migrate): add Cline converter with numeric-prefix ordering

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 12: Aider converter

**Files:**
- Create: `packages/migrate/src/converters/aider.ts`
- Test: `packages/migrate/test/aider.test.ts`

Mapping (verified): `CONVENTIONS.md` -> root always-on. Mine `.aider.conf.yml`: resolve the `read:` list (inline referenced files as always-on), map `lint-cmd`/`test-cmd`/`auto-test` into a "## Build and test commands" section (a rule with `heading`), drop model/api/UI keys. `read:` may be a string or array.

- [ ] **Step 1: Write failing aider test.** Create `packages/migrate/test/aider.test.ts`:
  ```ts
  import { test, expect, describe, beforeEach, afterEach } from "bun:test";
  import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
  import { join } from "node:path";
  import { tmpdir } from "node:os";
  import { detectAider, convertAider } from "../src/converters/aider";

  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "aider-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe("aider converter", () => {
    test("CONVENTIONS.md becomes an always-on rule", () => {
      writeFileSync(join(dir, "CONVENTIONS.md"), "Use type hints everywhere.\n");
      expect(detectAider(dir)).toContain("CONVENTIONS.md");
      const r = convertAider(dir).find((x) => x.sourceFile === "CONVENTIONS.md")!;
      expect(r.scope?.mode).toBe("always");
      expect(r.body).toBe("Use type hints everywhere.");
    });

    test("resolves the read: list and inlines referenced files", () => {
      writeFileSync(join(dir, ".aider.conf.yml"), "read:\n  - guidelines.md\n");
      writeFileSync(join(dir, "guidelines.md"), "Keep PRs under 400 lines.\n");
      const bodies = convertAider(dir).map((r) => r.body).join("\n");
      expect(bodies).toContain("Keep PRs under 400 lines.");
    });

    test("maps lint/test/auto-test into a Build and test commands section", () => {
      writeFileSync(
        join(dir, ".aider.conf.yml"),
        "lint-cmd: ruff check .\ntest-cmd: pytest -q\nauto-test: true\nmodel: gpt-4o\n",
      );
      const cmdRule = convertAider(dir).find((r) => r.heading === "## Build and test commands")!;
      expect(cmdRule).toBeDefined();
      expect(cmdRule.body).toContain("ruff check .");
      expect(cmdRule.body).toContain("pytest -q");
      expect(cmdRule.body).toContain("Tests run automatically");
      expect(cmdRule.body).not.toContain("gpt-4o");
    });

    test("read: can be a single string", () => {
      writeFileSync(join(dir, ".aider.conf.yml"), "read: shared.md\n");
      writeFileSync(join(dir, "shared.md"), "Shared convention.\n");
      expect(convertAider(dir).map((r) => r.body).join("\n")).toContain("Shared convention.");
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  ```bash
  cd packages/migrate && bun test test/aider.test.ts
  ```
  Expected: FAIL — `Cannot find module '../src/converters/aider'`.

- [ ] **Step 3: Create `packages/migrate/src/converters/aider.ts`** with COMPLETE content:
  ```ts
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
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  ```bash
  cd packages/migrate && bun test test/aider.test.ts
  ```
  Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/migrate/src/converters/aider.ts packages/migrate/test/aider.test.ts
  git commit -m "$(cat <<'EOF'
  feat(migrate): add Aider CONVENTIONS.md + .aider.conf.yml converter

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 13: Orchestrator — detect + convert (multi-format)

**Files:**
- Create: `packages/migrate/src/orchestrator.ts`
- Test: `packages/migrate/test/orchestrator.test.ts`

`detect(dir)` returns `DetectedSource[]`; `convert(options)` runs all matching converters, renders via `rulesToMarkdown` (always-on first), wraps in a root document, and returns `ConversionResult` with warnings. Idempotency (existing `AGENTS.md`) is added in Task 14.

- [ ] **Step 1: Write failing orchestrator test.** Create `packages/migrate/test/orchestrator.test.ts`:
  ```ts
  import { test, expect, describe, beforeEach, afterEach } from "bun:test";
  import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
  import { join } from "node:path";
  import { tmpdir } from "node:os";
  import { detect, convert } from "../src/orchestrator";
  import { SourceFormat } from "../src/types";

  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "orch-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe("orchestrator", () => {
    test("detect finds multiple formats", () => {
      writeFileSync(join(dir, ".cursorrules"), "Cursor rule.\n");
      writeFileSync(join(dir, "CLAUDE.md"), "Claude rule.\n");
      const detected = detect(dir);
      const formats = detected.map((d) => d.format).sort();
      expect(formats).toContain(SourceFormat.Cursor);
      expect(formats).toContain(SourceFormat.Claude);
    });

    test("convert merges always-on rules from multiple formats into one root", () => {
      writeFileSync(join(dir, ".cursorrules"), "Cursor always rule.\n");
      writeFileSync(join(dir, "CONVENTIONS.md"), "Aider convention.\n");
      const result = convert({ root: dir, nested: true, dropManual: false });
      expect(result.rootAgentsMd).toContain("# AGENTS.md");
      expect(result.rootAgentsMd).toContain("Cursor always rule.");
      expect(result.rootAgentsMd).toContain("Aider convention.");
    });

    test("convert emits nested AGENTS.md for clean dir-prefix globs", () => {
      mkdirSync(join(dir, ".cursor", "rules"), { recursive: true });
      writeFileSync(
        join(dir, ".cursor", "rules", "fe.mdc"),
        "---\nglobs: frontend/**\n---\nFrontend only.\n",
      );
      const result = convert({ root: dir, nested: true, dropManual: false });
      expect(result.nestedFiles.some((f) => f.path === "frontend/AGENTS.md")).toBe(true);
    });

    test("convert collects warnings for lossy degradations", () => {
      mkdirSync(join(dir, ".cursor", "rules"), { recursive: true });
      writeFileSync(
        join(dir, ".cursor", "rules", "t.mdc"),
        "---\nglobs: '**/*.test.ts'\n---\nTest rule.\n",
      );
      const result = convert({ root: dir, nested: true, dropManual: false });
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test("only option restricts to listed formats", () => {
      writeFileSync(join(dir, ".cursorrules"), "Cursor rule.\n");
      writeFileSync(join(dir, "CLAUDE.md"), "Claude rule.\n");
      const result = convert({ root: dir, only: [SourceFormat.Cursor], nested: true, dropManual: false });
      expect(result.rootAgentsMd).toContain("Cursor rule.");
      expect(result.rootAgentsMd).not.toContain("Claude rule.");
    });

    test("always-on rules render before conditional ones", () => {
      mkdirSync(join(dir, ".cursor", "rules"), { recursive: true });
      writeFileSync(join(dir, ".cursorrules"), "ALWAYS RULE.\n");
      writeFileSync(
        join(dir, ".cursor", "rules", "c.mdc"),
        "---\nglobs: '**/*.test.ts'\n---\nCONDITIONAL RULE.\n",
      );
      const result = convert({ root: dir, nested: true, dropManual: false });
      expect(result.rootAgentsMd.indexOf("ALWAYS RULE.")).toBeLessThan(
        result.rootAgentsMd.indexOf("CONDITIONAL RULE."),
      );
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  ```bash
  cd packages/migrate && bun test test/orchestrator.test.ts
  ```
  Expected: FAIL — `Cannot find module '../src/orchestrator'`.

- [ ] **Step 3: Create `packages/migrate/src/orchestrator.ts`** with COMPLETE content:
  ```ts
  import { existsSync } from "node:fs";
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

    const rootAgentsMd =
      rootBody.trim() === "" ? "# AGENTS.md\n" : `# AGENTS.md\n\n${rootBody.trim()}\n`;

    return { rootAgentsMd, nestedFiles, warnings };
  }
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  ```bash
  cd packages/migrate && bun test test/orchestrator.test.ts
  ```
  Expected: PASS — 6 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/migrate/src/orchestrator.ts packages/migrate/test/orchestrator.test.ts
  git commit -m "$(cat <<'EOF'
  feat(migrate): add detect+convert orchestrator

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 14: Idempotency — merge into an existing AGENTS.md

**Files:**
- Modify: `packages/migrate/src/orchestrator.ts`
- Test: `packages/migrate/test/idempotency.test.ts`

When an `AGENTS.md` already exists in `root`, `convert` must merge additively (via `mergeSections`) so a re-run produces no duplicate sections.

- [ ] **Step 1: Write failing idempotency test.** Create `packages/migrate/test/idempotency.test.ts`:
  ```ts
  import { test, expect, describe, beforeEach, afterEach } from "bun:test";
  import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
  import { join } from "node:path";
  import { tmpdir } from "node:os";
  import { convert } from "../src/orchestrator";

  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "idem-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe("idempotency", () => {
    test("re-running over a written AGENTS.md produces no duplicate content", () => {
      writeFileSync(join(dir, "CONVENTIONS.md"), "## Code style\n\nUse type hints.\n");

      const first = convert({ root: dir, nested: true, dropManual: false });
      writeFileSync(join(dir, "AGENTS.md"), first.rootAgentsMd);

      const second = convert({ root: dir, nested: true, dropManual: false });
      const occurrences = second.rootAgentsMd.split("## Code style").length - 1;
      expect(occurrences).toBe(1);
      expect(second.rootAgentsMd.split("Use type hints.").length - 1).toBe(1);
    });

    test("preserves hand-written sections in an existing AGENTS.md", () => {
      writeFileSync(
        join(dir, "AGENTS.md"),
        "# AGENTS.md\n\n## Hand written\n\nDo not delete me.\n",
      );
      writeFileSync(join(dir, ".cursorrules"), "Cursor rule.\n");
      const result = convert({ root: dir, nested: true, dropManual: false });
      expect(result.rootAgentsMd).toContain("Do not delete me.");
      expect(result.rootAgentsMd).toContain("Cursor rule.");
    });

    test("respects a custom out filename when checking for an existing file", () => {
      writeFileSync(join(dir, "CONVENTIONS.md"), "## Code style\n\nUse type hints.\n");
      const first = convert({ root: dir, out: "GUIDE.md", nested: true, dropManual: false });
      writeFileSync(join(dir, "GUIDE.md"), first.rootAgentsMd);
      const second = convert({ root: dir, out: "GUIDE.md", nested: true, dropManual: false });
      expect(second.rootAgentsMd.split("## Code style").length - 1).toBe(1);
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  ```bash
  cd packages/migrate && bun test test/idempotency.test.ts
  ```
  Expected: FAIL — duplicates appear because `convert` does not yet merge into an existing file (the first assertion `toBe(1)` fails with `2`).

- [ ] **Step 3: Update `packages/migrate/src/orchestrator.ts`** to merge into an existing root file. Add imports at the top of the file (just below the existing `import { existsSync } ...` line), changing it to:
  ```ts
  import { existsSync, readFileSync } from "node:fs";
  import { join } from "node:path";
  ```
  Add this import alongside the other local imports (after the `rulesToMarkdown` import line):
  ```ts
  import { mergeSections } from "./merge";
  ```
  Then replace the final `rootAgentsMd` construction and `return` in `convert` with:
  ```ts
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
  ```
  (Remove the previous two lines that built `rootAgentsMd` directly and the previous `return { rootAgentsMd, nestedFiles, warnings };`.)

- [ ] **Step 4: Run the test (expected PASS).**
  ```bash
  cd packages/migrate && bun test test/idempotency.test.ts
  ```
  Expected: PASS — 3 tests pass.

- [ ] **Step 5: Re-run the full suite to confirm no regressions.**
  ```bash
  cd packages/migrate && bun test
  ```
  Expected: PASS — all tests across all files pass.

- [ ] **Step 6: Commit.**
  ```bash
  git add packages/migrate/src/orchestrator.ts packages/migrate/test/idempotency.test.ts
  git commit -m "$(cat <<'EOF'
  feat(migrate): merge idempotently into an existing AGENTS.md

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 15: CLI

**Files:**
- Create: `packages/migrate/src/cli.ts`
- Test: `packages/migrate/test/cli.test.ts`

The CLI exposes `run(argv): Promise<number>` (the exit code) so it is testable; the module also self-invokes when run directly. Flags: `--root <dir>` (default `.`), `--dry-run`, `--out <file>` (default `AGENTS.md`), `--nested`/`--no-nested` (default on), `--drop-manual`, `--format text|json`, `--only <a,b>`.

- [ ] **Step 1: Write failing CLI test.** Create `packages/migrate/test/cli.test.ts`:
  ```ts
  import { test, expect, describe, beforeEach, afterEach } from "bun:test";
  import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
  import { join } from "node:path";
  import { tmpdir } from "node:os";
  import { run } from "../src/cli";

  let dir: string;
  let logs: string[];
  let origLog: typeof console.log;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "cli-"));
    logs = [];
    origLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
  });
  afterEach(() => {
    console.log = origLog;
    rmSync(dir, { recursive: true, force: true });
  });

  describe("cli run", () => {
    test("writes AGENTS.md and reports a summary", async () => {
      writeFileSync(join(dir, ".cursorrules"), "Cursor rule.\n");
      const code = await run(["--root", dir]);
      expect(code).toBe(0);
      const out = join(dir, "AGENTS.md");
      expect(existsSync(out)).toBe(true);
      expect(readFileSync(out, "utf8")).toContain("Cursor rule.");
      expect(logs.join("\n")).toContain("AGENTS.md");
    });

    test("--dry-run prints output but does not write a file", async () => {
      writeFileSync(join(dir, ".cursorrules"), "Cursor rule.\n");
      const code = await run(["--root", dir, "--dry-run"]);
      expect(code).toBe(0);
      expect(existsSync(join(dir, "AGENTS.md"))).toBe(false);
      expect(logs.join("\n")).toContain("Cursor rule.");
    });

    test("--format json emits parseable JSON with warnings", async () => {
      writeFileSync(join(dir, ".cursor", "rules") + "/x.mdc", "");
      // create the nested file properly
      const { mkdirSync } = await import("node:fs");
      mkdirSync(join(dir, ".cursor", "rules"), { recursive: true });
      writeFileSync(
        join(dir, ".cursor", "rules", "x.mdc"),
        "---\nglobs: '**/*.test.ts'\n---\nTest rule.\n",
      );
      const code = await run(["--root", dir, "--dry-run", "--format", "json"]);
      expect(code).toBe(0);
      const printed = logs.join("\n");
      const parsed = JSON.parse(printed);
      expect(parsed.rootAgentsMd).toContain("Test rule.");
      expect(Array.isArray(parsed.warnings)).toBe(true);
    });

    test("--out writes to a custom filename", async () => {
      writeFileSync(join(dir, ".cursorrules"), "Cursor rule.\n");
      const code = await run(["--root", dir, "--out", "GUIDE.md"]);
      expect(code).toBe(0);
      expect(existsSync(join(dir, "GUIDE.md"))).toBe(true);
    });

    test("--only restricts formats", async () => {
      writeFileSync(join(dir, ".cursorrules"), "Cursor rule.\n");
      writeFileSync(join(dir, "CLAUDE.md"), "Claude rule.\n");
      await run(["--root", dir, "--only", "cursor", "--dry-run"]);
      const printed = logs.join("\n");
      expect(printed).toContain("Cursor rule.");
      expect(printed).not.toContain("Claude rule.");
    });

    test("reports exit code 0 and a 'no sources' note when nothing is found", async () => {
      const code = await run(["--root", dir]);
      expect(code).toBe(0);
      expect(logs.join("\n").toLowerCase()).toContain("no ");
    });

    test("writes nested AGENTS.md files unless --no-nested", async () => {
      const { mkdirSync } = await import("node:fs");
      mkdirSync(join(dir, ".cursor", "rules"), { recursive: true });
      writeFileSync(
        join(dir, ".cursor", "rules", "fe.mdc"),
        "---\nglobs: frontend/**\n---\nFrontend rule.\n",
      );
      await run(["--root", dir]);
      expect(existsSync(join(dir, "frontend", "AGENTS.md"))).toBe(true);
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  ```bash
  cd packages/migrate && bun test test/cli.test.ts
  ```
  Expected: FAIL — `Cannot find module '../src/cli'`.

- [ ] **Step 3: Create `packages/migrate/src/cli.ts`** with COMPLETE content:
  ```ts
  import { writeFileSync, mkdirSync } from "node:fs";
  import { join, dirname } from "node:path";
  import { detect, convert } from "./orchestrator";
  import { SourceFormat, type ConvertOptions } from "./types";

  interface CliFlags {
    root: string;
    out: string;
    dryRun: boolean;
    nested: boolean;
    dropManual: boolean;
    format: "text" | "json";
    only: SourceFormat[];
  }

  const KNOWN_FORMATS = new Set<string>(Object.values(SourceFormat));

  function parseArgs(argv: string[]): CliFlags {
    const flags: CliFlags = {
      root: ".",
      out: "AGENTS.md",
      dryRun: false,
      nested: true,
      dropManual: false,
      format: "text",
      only: [],
    };
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i];
      switch (arg) {
        case "--root":
          flags.root = argv[++i] ?? ".";
          break;
        case "--out":
          flags.out = argv[++i] ?? "AGENTS.md";
          break;
        case "--dry-run":
          flags.dryRun = true;
          break;
        case "--nested":
          flags.nested = true;
          break;
        case "--no-nested":
          flags.nested = false;
          break;
        case "--drop-manual":
          flags.dropManual = true;
          break;
        case "--format":
          flags.format = argv[++i] === "json" ? "json" : "text";
          break;
        case "--only": {
          const value = argv[++i] ?? "";
          flags.only = value
            .split(",")
            .map((s) => s.trim())
            .filter((s) => KNOWN_FORMATS.has(s)) as SourceFormat[];
          break;
        }
        default:
          // Ignore unknown flags for forward-compat.
          break;
      }
    }
    return flags;
  }

  /** Run the migrate CLI. Returns a process exit code. */
  export async function run(argv: string[]): Promise<number> {
    const flags = parseArgs(argv);

    const detected = detect(flags.root);
    if (detected.length === 0) {
      console.log("No known legacy rule files found. Nothing to convert.");
      return 0;
    }

    const options: ConvertOptions = {
      root: flags.root,
      out: flags.out,
      nested: flags.nested,
      dropManual: flags.dropManual,
      only: flags.only,
    };
    const result = convert(options);

    if (flags.format === "json") {
      console.log(JSON.stringify(result, null, 2));
      if (!flags.dryRun) writeOutputs(flags, result.rootAgentsMd, result.nestedFiles);
      return 0;
    }

    if (flags.dryRun) {
      console.log(`# Dry run — would write ${flags.out}:`);
      console.log(result.rootAgentsMd);
      for (const f of result.nestedFiles) {
        console.log(`\n# Dry run — would write ${f.path}:`);
        console.log(f.content);
      }
    } else {
      writeOutputs(flags, result.rootAgentsMd, result.nestedFiles);
    }

    // Summary.
    const formatList = detected.map((d) => `${d.format} (${d.files.length})`).join(", ");
    console.log(`\nConverted formats: ${formatList}`);
    console.log(`Wrote: ${flags.out}${flags.dryRun ? " (dry run)" : ""}`);
    if (result.nestedFiles.length > 0) {
      console.log(`Nested files: ${result.nestedFiles.map((f) => f.path).join(", ")}`);
    }
    if (result.warnings.length > 0) {
      console.log(`\nWarnings (${result.warnings.length}):`);
      for (const w of result.warnings) console.log(`  - ${w}`);
    }
    return 0;
  }

  function writeOutputs(
    flags: CliFlags,
    rootContent: string,
    nestedFiles: { path: string; content: string }[],
  ): void {
    writeFileSync(join(flags.root, flags.out), rootContent, "utf8");
    if (!flags.nested) return;
    for (const f of nestedFiles) {
      const abs = join(flags.root, f.path);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, f.content, "utf8");
    }
  }

  // Self-invoke when run as a binary (not when imported by tests).
  if (import.meta.main) {
    run(process.argv.slice(2)).then((code) => process.exit(code));
  }
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  ```bash
  cd packages/migrate && bun test test/cli.test.ts
  ```
  Expected: PASS — 7 tests pass.

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/migrate/src/cli.ts packages/migrate/test/cli.test.ts
  git commit -m "$(cat <<'EOF'
  feat(migrate): add CLI with dry-run, json, nested, and only flags

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 16: Programmatic API (index.ts)

**Files:**
- Create: `packages/migrate/src/index.ts`
- Test: `packages/migrate/test/index.test.ts`

- [ ] **Step 1: Write failing index test.** Create `packages/migrate/test/index.test.ts`:
  ```ts
  import { test, expect, describe, beforeEach, afterEach } from "bun:test";
  import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
  import { join } from "node:path";
  import { tmpdir } from "node:os";
  import {
    detect,
    convert,
    convertCursor,
    convertClaude,
    convertWindsurf,
    convertCopilot,
    convertCline,
    convertAider,
    SourceFormat,
  } from "../src/index";

  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "api-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe("public API", () => {
    test("re-exports detect, convert, the enum, and all per-format converters", () => {
      expect(typeof detect).toBe("function");
      expect(typeof convert).toBe("function");
      expect(typeof convertCursor).toBe("function");
      expect(typeof convertClaude).toBe("function");
      expect(typeof convertWindsurf).toBe("function");
      expect(typeof convertCopilot).toBe("function");
      expect(typeof convertCline).toBe("function");
      expect(typeof convertAider).toBe("function");
      expect(SourceFormat.Cursor).toBe("cursor");
    });

    test("convert works end-to-end via the public entry", () => {
      writeFileSync(join(dir, ".cursorrules"), "Public API rule.\n");
      const result = convert({ root: dir, nested: true, dropManual: false });
      expect(result.rootAgentsMd).toContain("Public API rule.");
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  ```bash
  cd packages/migrate && bun test test/index.test.ts
  ```
  Expected: FAIL — `Cannot find module '../src/index'`.

- [ ] **Step 3: Create `packages/migrate/src/index.ts`** with COMPLETE content:
  ```ts
  export {
    SourceFormat,
    type ScopeMode,
    type Scope,
    type ParsedRule,
    type NestedFile,
    type ConversionResult,
    type DetectedSource,
    type ConvertOptions,
  } from "./types";

  export { detect, convert } from "./orchestrator";

  export { detectCursor, convertCursor } from "./converters/cursor";
  export { detectClaude, convertClaude } from "./converters/claude";
  export { detectWindsurf, convertWindsurf } from "./converters/windsurf";
  export { detectCopilot, convertCopilot } from "./converters/copilot";
  export { detectCline, convertCline } from "./converters/cline";
  export { detectAider, convertAider } from "./converters/aider";

  export { parseFrontmatter } from "./frontmatter";
  export { globToDirPrefix, splitCommaGlobs } from "./glob";
  export { mergeSections, hashBody, extractHeadings } from "./merge";
  export { rulesToMarkdown } from "./rules";
  ```

- [ ] **Step 4: Run the test (expected PASS).**
  ```bash
  cd packages/migrate && bun test test/index.test.ts
  ```
  Expected: PASS — 2 tests pass.

- [ ] **Step 5: Run the full suite + typecheck.**
  ```bash
  cd packages/migrate && bun test && bunx tsc --noEmit
  ```
  Expected: PASS — all tests pass and typecheck reports no errors.

- [ ] **Step 6: Commit.**
  ```bash
  git add packages/migrate/src/index.ts packages/migrate/test/index.test.ts
  git commit -m "$(cat <<'EOF'
  feat(migrate): expose programmatic API via index.ts

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 17: Package README

**Files:**
- Create: `packages/migrate/README.md`
- Test: `packages/migrate/test/readme.test.ts`

- [ ] **Step 1: Write failing README test.** Create `packages/migrate/test/readme.test.ts`:
  ```ts
  import { test, expect, describe } from "bun:test";
  import { readFileSync } from "node:fs";
  import { join } from "node:path";

  const readme = readFileSync(join(import.meta.dir, "..", "README.md"), "utf8");

  describe("package README", () => {
    test("documents the install/usage hook and command", () => {
      expect(readme).toContain("agents-md-migrate");
      expect(readme).toContain("bunx agents-md-migrate");
      expect(readme).toContain("npx agents-md-migrate");
    });

    test("includes a supported-formats table covering all six sources", () => {
      for (const f of [".cursorrules", "CLAUDE.md", ".windsurfrules", "copilot-instructions.md", ".clinerules", "CONVENTIONS.md"]) {
        expect(readme).toContain(f);
      }
    });

    test("explains the lossy-mapping caveats", () => {
      expect(readme.toLowerCase()).toContain("lossy");
      expect(readme).toContain("Applies to");
      expect(readme).toContain("Optional / on-demand rules");
    });
  });
  ```

- [ ] **Step 2: Run the test (expected FAIL).**
  ```bash
  cd packages/migrate && bun test test/readme.test.ts
  ```
  Expected: FAIL — `ENOENT` / `no such file` for `README.md`.

- [ ] **Step 3: Create `packages/migrate/README.md`** with COMPLETE content:
  ````markdown
  # agents-md-migrate

  > Paste your `.cursorrules`, get an `AGENTS.md`.

  `agents-md-migrate` auto-detects legacy AI-assistant rule files in a directory
  (Cursor, Claude Code, Windsurf, GitHub Copilot, Cline, Aider) and converts them
  into a single, tool-agnostic [`AGENTS.md`](https://agents.md) — plus optional
  nested `AGENTS.md` files for directory-scoped rules. It is **idempotent**: run it
  as often as you like and it will not duplicate content that is already present.

  Part of [agents-md-cookbook](../../README.md) — the tested, tool-agnostic AGENTS.md kit.

  ## Quick start

  ```bash
  # Convert the current directory in place.
  bunx agents-md-migrate

  # Or with npm/npx:
  npx agents-md-migrate

  # Preview without writing anything.
  bunx agents-md-migrate --dry-run

  # Convert another directory.
  bunx agents-md-migrate --root ./my-repo
  ```

  ## Supported formats

  | Tool | Source files it reads | Scoping field it understands |
  | --- | --- | --- |
  | Cursor | `.cursorrules`, `.cursor/rules/**/*.mdc` | `alwaysApply`, comma-separated `globs`, `description` |
  | Claude Code | `CLAUDE.md` (root + subdirs), `.claude/rules/*` | nesting by directory; resolves `@path` imports |
  | Windsurf / Devin | `.windsurfrules`, `.windsurf/rules/*.md`, `.devin/rules/*.md` | `trigger` (`always_on`/`glob`/`model_decision`/`manual`), `globs`, `description` |
  | GitHub Copilot | `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md` | `applyTo` (`**` = all), `description`, `excludeAgent` |
  | Cline | `.clinerules` (file or dir), numeric-prefixed `*.md`/`*.txt` | `paths` (YAML array) |
  | Aider | `CONVENTIONS.md`, `.aider.conf.yml` (`read:`, `lint-cmd`, `test-cmd`, `auto-test`) | always-on; build/test commands |

  Personal/global files are **never** read: `~/.claude/CLAUDE.md`, `CLAUDE.local.md`,
  Windsurf `global_rules.md`, and Cline's global `~/Documents/Cline/Rules` are excluded.

  ## Options

  | Flag | Default | Meaning |
  | --- | --- | --- |
  | `--root <dir>` | `.` | Directory to scan and write into. |
  | `--out <file>` | `AGENTS.md` | Root output filename. |
  | `--dry-run` | off | Print the result; write nothing. |
  | `--nested` / `--no-nested` | on | Emit nested `AGENTS.md` for clean directory-prefix globs (e.g. `src/**`). |
  | `--drop-manual` | off | Drop manual/on-demand rules instead of an "Optional" section. |
  | `--format text\|json` | `text` | Output format for the summary/result. |
  | `--only <a,b>` | all | Restrict to formats: `cursor,claude,windsurf,copilot,cline,aider`. |

  ## Lossy-mapping caveats

  `AGENTS.md` is plain Markdown, so rule **bodies** transfer losslessly. The only
  thing `AGENTS.md` lacks is **activation/scoping metadata**, so this tool degrades
  it predictably and records a warning for every degradation:

  - **Always-on rules** are inlined directly into the root `AGENTS.md`.
  - **Glob-scoped rules** with a clean directory prefix (e.g. `src/**`) become a
    nested `src/AGENTS.md`. Other globs (e.g. `**/*.test.ts`) become a prose prefix:
    ``Applies to `**/*.test.ts`:`` before the rule block.
  - **Agent/model-requested rules** ("apply when relevant") become a
    `> When relevant: <description>` lead-in.
  - **Manual / on-demand rules** move under an `## Optional / on-demand rules`
    section, or are removed entirely with `--drop-manual`.
  - **Copilot `excludeAgent`** is preserved as an inline `> (excluded for: ...)` note.

  Review the printed warnings after each run — they tell you exactly which scoping
  decisions were approximated.

  ## Programmatic API

  ```ts
  import { detect, convert, convertCursor } from "agents-md-migrate";

  const sources = detect("./my-repo");
  const result = convert({ root: "./my-repo", nested: true });
  console.log(result.rootAgentsMd);
  console.log(result.warnings);
  ```

  ## License

  MIT
  ````

- [ ] **Step 4: Run the test (expected PASS).**
  ```bash
  cd packages/migrate && bun test test/readme.test.ts
  ```
  Expected: PASS — 3 tests pass.

- [ ] **Step 5: Run the full suite one final time.**
  ```bash
  cd packages/migrate && bun test
  ```
  Expected: PASS — every test file passes.

- [ ] **Step 6: Commit.**
  ```bash
  git add packages/migrate/README.md packages/migrate/test/readme.test.ts
  git commit -m "$(cat <<'EOF'
  docs(migrate): add package README with formats table and lossy caveats

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 18: Build verification + dogfood smoke test

**Files:**
- Test: `packages/migrate/test/build.test.ts`

Confirm the package builds to `dist/` and the built CLI runs end-to-end (this is what end users get via `bunx`/`npx`).

- [ ] **Step 1: Build the package.**
  ```bash
  cd packages/migrate && bun run build
  ```
  Expected: `dist/cli.js`, `dist/index.js`, and `dist/index.d.ts` are produced with no errors.

- [ ] **Step 2: Write the built-CLI smoke test.** Create `packages/migrate/test/build.test.ts`:
  ```ts
  import { test, expect, describe, beforeEach, afterEach } from "bun:test";
  import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
  import { join } from "node:path";
  import { tmpdir } from "node:os";
  import { spawnSync } from "node:child_process";

  const cliPath = join(import.meta.dir, "..", "dist", "cli.js");

  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "build-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe("built CLI", () => {
    test("dist/cli.js exists after build", () => {
      expect(existsSync(cliPath)).toBe(true);
    });

    test("runs end-to-end and writes AGENTS.md", () => {
      writeFileSync(join(dir, ".cursorrules"), "Built CLI rule.\n");
      const res = spawnSync("node", [cliPath, "--root", dir], { encoding: "utf8" });
      expect(res.status).toBe(0);
      expect(existsSync(join(dir, "AGENTS.md"))).toBe(true);
    });
  });
  ```

- [ ] **Step 3: Run the smoke test (expected PASS, since dist exists).**
  ```bash
  cd packages/migrate && bun test test/build.test.ts
  ```
  Expected: PASS — 2 tests pass. (If it fails because `dist` is missing, re-run Step 1 first.)

- [ ] **Step 4: Ensure `dist/` is git-ignored at the repo root.** Confirm the repo root `.gitignore` ignores build output; if it does not contain a `dist/` entry, append one. Run from the repo root:
  ```bash
  grep -qxF "dist/" .gitignore 2>/dev/null || printf "dist/\n" >> .gitignore
  ```
  Expected: `.gitignore` contains a `dist/` line (so built artifacts are not committed).

- [ ] **Step 5: Commit.**
  ```bash
  git add packages/migrate/test/build.test.ts .gitignore
  git commit -m "$(cat <<'EOF'
  test(migrate): verify built CLI runs end-to-end via node

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

## Done criteria

- `cd packages/migrate && bun test` passes for every test file (Tasks 1–18).
- `cd packages/migrate && bunx tsc --noEmit` reports no type errors.
- `cd packages/migrate && bun run build` produces `dist/cli.js`, `dist/index.js`, `dist/index.d.ts`.
- `node packages/migrate/dist/cli.js --root <repo>` converts a real multi-format repo into `AGENTS.md` (+ nested files) with warnings, and re-running it produces no duplicates.
- All six formats (Cursor, Claude, Windsurf, Copilot, Cline, Aider) are detected and converted with the verified field mappings, excluding personal/global files.
