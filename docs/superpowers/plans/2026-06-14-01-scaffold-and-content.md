# Content + Scaffold Subsystem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build the complete content + scaffold layer of agents-md-cookbook — monorepo workspace, MIT license, storefront README, the full tool compatibility matrix, 15 production-grade AGENTS.md templates, a 4-file handbook, contribution machinery, and a CI pipeline ready to host the linter self-dogfood step.

**Architecture:** A bun-workspace monorepo whose root is pure content (Markdown templates + docs) plus declarative tooling config; the `packages/*` linter/migrate CLIs are added by separate plans, so this plan only declares the workspace seam and leaves an explicit integration TODO in CI. Every Markdown artifact is treated as a build artifact verified by `markdownlint-cli2` (content lint) and `lychee` (link resolution); content tasks "test" by running these and asserting clean output, then commit in small DRY batches.

**Tech Stack:** Markdown (CommonMark/GFM), bun workspaces, TypeScript config base (consumed later), markdownlint-cli2 (via bunx), lychee-action (CI link check), GitHub Actions.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `package.json` | Root workspace manifest declaring `packages/*`, content-lint scripts, devDependency on markdownlint-cli2. |
| `.gitignore` | Ignore node/bun/dist/coverage/editor artifacts. |
| `.editorconfig` | Enforce LF, UTF-8, 2-space indent, trailing-newline across the repo. |
| `tsconfig.base.json` | Shared strict TS compiler options inherited by future `packages/*`. |
| `.markdownlint-cli2.jsonc` | markdownlint rule config tuned for AGENTS.md prose/templates. |
| `.lycheeignore` | URL patterns the link checker should skip (anchors/local seams). |
| `packages/.gitkeep` | Keep the empty workspace dir tracked until linter/migrate plans land. |
| `LICENSE` | MIT license, owner Taiizor, year 2026. |
| `README.md` | Storefront: hero, badges, value prop, quick start, matrix preview, template index, why-AGENTS.md, contribution CTA, credits/sources. |
| `COMPATIBILITY.md` | Full tool-by-tool support matrix with legend + dated verification line. |
| `templates/typescript-node/AGENTS.md` | Template: TypeScript + Node (bun/npm) library/service. |
| `templates/python/AGENTS.md` | Template: generic Python project (uv + ruff + pytest). |
| `templates/go/AGENTS.md` | Template: Go module (go test, golangci-lint). |
| `templates/rust/AGENTS.md` | Template: Rust crate (cargo, clippy, nextest). |
| `templates/java-spring/AGENTS.md` | Template: Java + Spring Boot (Maven/Gradle). |
| `templates/dotnet-csharp/AGENTS.md` | Template: .NET / C# (dotnet CLI). |
| `templates/nextjs/AGENTS.md` | Template: Next.js app (App Router). |
| `templates/react-vite/AGENTS.md` | Template: React + Vite SPA + Vitest. |
| `templates/django/AGENTS.md` | Template: Django web app. |
| `templates/fastapi/AGENTS.md` | Template: FastAPI service. |
| `templates/rails/AGENTS.md` | Template: Ruby on Rails app. |
| `templates/monorepo/AGENTS.md` | Template: root of a multi-package monorepo (with nested guidance). |
| `templates/data-ml/AGENTS.md` | Template: data science / ML project (notebooks + training). |
| `templates/react-native/AGENTS.md` | Template: React Native / Expo mobile app. |
| `templates/minimal/AGENTS.md` | Template: <40-line minimal starter. |
| `docs/anatomy.md` | The canonical AGENTS.md section set and the purpose of each section. |
| `docs/best-practices.md` | DO / DON'T lists with citations to GitHub, ETH Zurich, Augment, philschmid. |
| `docs/nesting-monorepos.md` | Nearest-wins rule, nested files, OpenAI 88-file example, when-to-split. |
| `docs/common-mistakes.md` | Anti-patterns: /init auto-gen, platitudes, length bloat, orphan docs, README dup. |
| `CONTRIBUTING.md` | How to add a template, PR flow, template style bar. |
| `.github/pull_request_template.md` | PR checklist. |
| `.github/ISSUE_TEMPLATE/new-template.md` | Issue form for requesting/adding a template. |
| `.github/ISSUE_TEMPLATE/compatibility-update.md` | Issue form for matrix corrections. |
| `.github/workflows/ci.yml` | CI: markdown link check (lychee) + commented seam for linter self-dogfood. |

---

### Task 1: Monorepo scaffold + tooling config

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.editorconfig`
- Create: `tsconfig.base.json`
- Create: `.markdownlint-cli2.jsonc`
- Create: `.lycheeignore`
- Create: `packages/.gitkeep`

- [ ] **Step 1: Create the root workspace manifest `package.json`.**
```json
{
  "name": "agents-md-cookbook",
  "version": "0.1.0",
  "private": true,
  "description": "The tested, tool-agnostic AGENTS.md kit.",
  "license": "MIT",
  "author": "Taiizor",
  "repository": {
    "type": "git",
    "url": "https://github.com/Taiizor/agents-md-cookbook.git"
  },
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "lint:md": "markdownlint-cli2 \"**/*.md\" \"#node_modules\" \"#**/CHANGELOG.md\"",
    "lint:md:fix": "markdownlint-cli2 --fix \"**/*.md\" \"#node_modules\" \"#**/CHANGELOG.md\""
  },
  "devDependencies": {
    "markdownlint-cli2": "0.15.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 2: Create `.gitignore`.**
```gitignore
# Dependencies
node_modules/
.pnp/
.pnp.js

# Bun
bun.lockb
.bun/

# Build output
dist/
build/
out/
*.tsbuildinfo

# Test / coverage
coverage/
.nyc_output/

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Editor / OS
.idea/
.vscode/*
!.vscode/extensions.json
.DS_Store
Thumbs.db

# Env
.env
.env.local
.env.*.local
```

- [ ] **Step 3: Create `.editorconfig`.**
```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false

[*.{json,jsonc,yml,yaml}]
indent_size = 2

[Makefile]
indent_style = tab
```

- [ ] **Step 4: Create `tsconfig.base.json` (inherited by future packages).**
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "types": [],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 5: Create `.markdownlint-cli2.jsonc` (rule config for prose + templates).**
```jsonc
{
  // markdownlint-cli2 config for agents-md-cookbook content.
  // Rationale: AGENTS.md templates are prose-heavy and intentionally use
  // long command lines, inline HTML badges, and duplicated section names
  // across template files, so a few default rules are relaxed.
  "config": {
    "default": true,
    "MD013": false, // line-length: command lines and tables exceed 80 chars
    "MD024": { "siblings_only": true }, // allow repeated headings across sections
    "MD033": false, // allow inline HTML (badge <img>, <sub>, <details>)
    "MD041": false, // first line need not be a top-level heading (badges/comments)
    "MD046": { "style": "fenced" }, // require fenced code blocks
    "MD048": { "style": "backtick" }, // require backtick fences
    "MD049": { "style": "asterisk" },
    "MD050": { "style": "asterisk" }
  },
  "globs": ["**/*.md"],
  "ignores": [
    "node_modules",
    "**/CHANGELOG.md",
    "docs/superpowers/**"
  ]
}
```

- [ ] **Step 6: Create `.lycheeignore` (link-check skip list).**
```text
# Local anchors and template placeholders the checker should not resolve.
^#
mailto:
# npm package pages for tools published by sibling plans (may 404 pre-release).
https://www.npmjs.com/package/agents-md-lint
https://www.npmjs.com/package/agents-md-migrate
```

- [ ] **Step 7: Create `packages/.gitkeep` to track the empty workspace dir.**
```text
# Placeholder. The agents-md-lint and agents-md-migrate packages are added
# by separate plans. Remove this file once a real package lands here.
```

- [ ] **Step 8: Install dev dependency and verify the content-lint tool resolves.**
  - Run: `bun install`
  - Expected: lockfile created, `markdownlint-cli2` present under `node_modules/.bin`.
  - Run: `bunx markdownlint-cli2 --help`
  - Expected PASS: prints markdownlint-cli2 usage banner (exit 0).

- [ ] **Step 9: Commit the scaffold.**
```bash
git add package.json .gitignore .editorconfig tsconfig.base.json .markdownlint-cli2.jsonc .lycheeignore packages/.gitkeep
git commit -m "$(cat <<'EOF'
chore: scaffold bun workspace + content lint config

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: LICENSE (MIT)

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: Create `LICENSE` with the MIT text (owner Taiizor, year 2026).**
```text
MIT License

Copyright (c) 2026 Taiizor

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Commit the license.**
```bash
git add LICENSE
git commit -m "$(cat <<'EOF'
docs: add MIT LICENSE

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: README.md (the storefront)

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md` with the COMPLETE storefront content.**
```markdown
# agents-md-cookbook

> **The tested, tool-agnostic AGENTS.md kit.**

[![CI](https://github.com/Taiizor/agents-md-cookbook/actions/workflows/ci.yml/badge.svg)](https://github.com/Taiizor/agents-md-cookbook/actions/workflows/ci.yml)
[![npm: agents-md-lint](https://img.shields.io/npm/v/agents-md-lint?label=agents-md-lint)](https://www.npmjs.com/package/agents-md-lint)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/Taiizor/agents-md-cookbook?style=social)](https://github.com/Taiizor/agents-md-cookbook/stargazers)

Copy a battle-tested `AGENTS.md` into your repo, lint it in CI, and migrate your
old `CLAUDE.md` / `.cursorrules` in one command. Every template is short on
purpose, leads with runnable commands, and is checked by our own linter.

`AGENTS.md` is a single Markdown file at your repo root that tells coding agents
how to build, test, and behave in your project. It is stewarded by the Linux
Foundation's Agentic AI Foundation, lives in 60,000+ repositories, and is read
natively by 24+ tools. One file, every agent.

---

## 30-second value prop

- **Tool-agnostic.** One `AGENTS.md` works across Cursor, Codex, Copilot,
  Windsurf, Cline, Zed, Jules, Amp, and more. See the full
  [compatibility matrix](./COMPATIBILITY.md).
- **Tested, not vibes.** Templates follow evidence from GitHub's 2,500-repo
  study, ETH Zurich's AGENTbench, and Augment's golden-PR eval — and CI lints
  every template with our own [`agents-md-lint`](#tooling).
- **Short by design.** 60-150 lines, commands first, real code snippets,
  explicit boundaries. No platitudes, no architecture essays, no token bloat.
- **Migrate in one command.** Turn an existing `CLAUDE.md`, `.cursorrules`, or
  `GEMINI.md` into a clean `AGENTS.md` with [`agents-md-migrate`](#tooling).

## Quick start

1. **Copy a template** for your stack into your repo root as `AGENTS.md`
   (filename must be exactly `AGENTS.md` — uppercase `AGENTS`, lowercase `.md`):

   ```bash
   curl -fsSL \
     https://raw.githubusercontent.com/Taiizor/agents-md-cookbook/develop/templates/typescript-node/AGENTS.md \
     -o AGENTS.md
   ```

   Browse the full [template index](#templates) for other stacks.

2. **Already have agent instructions?** Migrate them instead of starting over:

   ```bash
   bunx agents-md-migrate          # or: npx agents-md-migrate
   ```

   This detects `CLAUDE.md`, `.cursorrules`, `GEMINI.md`, and friends, then
   produces a single `AGENTS.md`. (Published by the
   [`agents-md-migrate`](#tooling) package.)

3. **Lint it in CI** so the file stays accurate as your project grows:

   ```yaml
   # .github/workflows/ci.yml
   - name: Lint AGENTS.md
     run: bunx agents-md-lint AGENTS.md   # or: npx agents-md-lint AGENTS.md
   ```

   Prefer a GitHub Action? Use the bundled [`action.yml`](./action.yml).

## Compatibility at a glance

| Tool | Reads `AGENTS.md`? |
| --- | --- |
| Cursor | NATIVE |
| OpenAI Codex | NATIVE |
| GitHub Copilot (coding agent) | NATIVE |
| Windsurf / Cascade | NATIVE |
| Cline | NATIVE |
| Zed | NATIVE (first-match) |
| Amp | NATIVE |
| Google Jules | NATIVE |
| opencode / RooCode | NATIVE |
| Claude Code | ADAPTER (symlink / `@AGENTS.md`) |
| Aider | ADAPTER (`--read AGENTS.md`) |
| Gemini CLI | CONFIG (opt-in) |
| Copilot (VS Code chat) | CONFIG (experimental) |

Full mechanism, nesting behavior, own-file fallbacks, and sources are in
**[COMPATIBILITY.md](./COMPATIBILITY.md)** (with a dated last-verified line).

## Templates

Each template is a complete, copy-pasteable `AGENTS.md` for one stack.

| Stack | Path |
| --- | --- |
| TypeScript + Node | [`templates/typescript-node/AGENTS.md`](./templates/typescript-node/AGENTS.md) |
| Python | [`templates/python/AGENTS.md`](./templates/python/AGENTS.md) |
| Go | [`templates/go/AGENTS.md`](./templates/go/AGENTS.md) |
| Rust | [`templates/rust/AGENTS.md`](./templates/rust/AGENTS.md) |
| Java + Spring Boot | [`templates/java-spring/AGENTS.md`](./templates/java-spring/AGENTS.md) |
| .NET / C# | [`templates/dotnet-csharp/AGENTS.md`](./templates/dotnet-csharp/AGENTS.md) |
| Next.js | [`templates/nextjs/AGENTS.md`](./templates/nextjs/AGENTS.md) |
| React + Vite | [`templates/react-vite/AGENTS.md`](./templates/react-vite/AGENTS.md) |
| Django | [`templates/django/AGENTS.md`](./templates/django/AGENTS.md) |
| FastAPI | [`templates/fastapi/AGENTS.md`](./templates/fastapi/AGENTS.md) |
| Ruby on Rails | [`templates/rails/AGENTS.md`](./templates/rails/AGENTS.md) |
| Monorepo (root) | [`templates/monorepo/AGENTS.md`](./templates/monorepo/AGENTS.md) |
| Data / ML | [`templates/data-ml/AGENTS.md`](./templates/data-ml/AGENTS.md) |
| React Native / Expo | [`templates/react-native/AGENTS.md`](./templates/react-native/AGENTS.md) |
| Minimal starter | [`templates/minimal/AGENTS.md`](./templates/minimal/AGENTS.md) |

## Why AGENTS.md

Coding agents **auto-execute** the commands you list, so a single file that is
accurate, short, and command-first beats scattered per-tool config. The
research is blunt about what works:

- **Lead with commands and flags.** GitHub's review of 2,500+ repos found the
  best files put build/test commands early with exact flags, prefer code
  examples over prose, and pair every boundary with a "do."
- **Keep it short and non-inferable.** ETH Zurich's AGENTbench found
  auto-generated `/init` files *reduce* task success ~3% and raise cost
  ~20-23%; agents follow files faithfully, so every wrong line is executed.
  Limit content to what an agent cannot infer (custom tooling, unusual builds).
- **Aim for 100-150 lines.** Augment's golden-PR eval found a 100-150 line
  sweet spot, numbered workflows (+25% correctness), decision tables, and
  3-10 line real-code examples (+20% reuse); gains reverse beyond ~300 lines.

Read the full handbook: [anatomy](./docs/anatomy.md) ·
[best practices](./docs/best-practices.md) ·
[nesting & monorepos](./docs/nesting-monorepos.md) ·
[common mistakes](./docs/common-mistakes.md).

## Tooling

Published to npm so you can run them with `bunx` or `npx` (no install needed):

- **`agents-md-lint`** — scores an `AGENTS.md` against the evidence-based rules
  and fails CI on regressions.
- **`agents-md-migrate`** — converts existing `CLAUDE.md` / `.cursorrules` /
  `GEMINI.md` into a clean `AGENTS.md`.

> These CLIs live under `packages/` and are released by separate plans; this
> repo dogfoods `agents-md-lint` on its own templates in CI.

## Contributing

Templates and matrix updates are the lifeblood of this repo. To add a stack,
fix a command, or correct a tool's support status, read
**[CONTRIBUTING.md](./CONTRIBUTING.md)** and open an issue from one of our
[templates](./.github/ISSUE_TEMPLATE). Every PR is link-checked and
content-linted automatically.

## Credits & sources

- The `AGENTS.md` standard: <https://agents.md/>
- GitHub Blog — *How to write a great agents.md: Lessons from over 2,500
  repositories* (Matt Nigh, 2025-11-25).
- ETH Zurich — *Evaluating AGENTS.md* (arXiv:2602.11988, Feb 2026), benchmark
  AGENTbench.
- Augment Code — AuggieBench golden-PR evaluation.
- philschmid — practical AGENTS.md length/structure guidance.

## License

[MIT](./LICENSE) © 2026 Taiizor
```

- [ ] **Step 2: Verify the README passes the content linter.**
  - Run: `bunx markdownlint-cli2 README.md`
  - Expected PASS: `Linting: 1 file(s)` then `Summary: 0 error(s)` (exit 0).

- [ ] **Step 3: Commit the README.**
```bash
git add README.md
git commit -m "$(cat <<'EOF'
docs: add storefront README

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: COMPATIBILITY.md (the full matrix)

**Files:**
- Create: `COMPATIBILITY.md`

- [ ] **Step 1: Create `COMPATIBILITY.md` with the COMPLETE matrix (verbatim data).**
```markdown
# AGENTS.md Tool Compatibility Matrix

How each major coding-agent tool consumes `AGENTS.md`, what its own/primary
file is, and how it behaves in nested/monorepo layouts.

> **Last verified:** 2026-06-14. Tool behavior changes fast — if a row is
> stale, please open a [compatibility update issue](./.github/ISSUE_TEMPLATE/compatibility-update.md).

## Legend

| Code | Meaning |
| --- | --- |
| **NATIVE** | Reads `AGENTS.md` automatically with no configuration. |
| **CONFIG** | Reads `AGENTS.md` only after you opt in via a setting. |
| **ADAPTER** | Does not read `AGENTS.md`; needs a symlink, import, or flag. |
| **NO** | Does not read `AGENTS.md` (see ADAPTER workaround if listed). |

The filename must be exactly `AGENTS.md` (uppercase `AGENTS`, lowercase `.md`),
at the repo root; monorepos use nested `AGENTS.md` files where the nearest file
in the tree wins, and a user's chat prompt overrides everything.

## Matrix

| Tool | Reads AGENTS.md? | Mechanism | Own / primary file | Nested / monorepo | Notes | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Cursor (IDE + CLI) | NATIVE | Reads `AGENTS.md` automatically; CLI also reads `CLAUDE.md` at root; coexists with `.cursor/rules/*.mdc` + legacy `.cursorrules`. | `.cursor/rules/*.mdc` | Yes — combines with parents, more specific wins. | Broad coexistence with vendor rule files. | <https://cursor.com/docs/cli/using> |
| Claude Code | NO (not native) | ADAPTER — symlink `ln -s AGENTS.md CLAUDE.md`, or `@AGENTS.md` import inside `CLAUDE.md`, or `/init` folds it in. | `CLAUDE.md` (+ `~/.claude/CLAUDE.md`) | `CLAUDE.md` hierarchical; `AGENTS.md` only via symlink per dir. | Biggest open feature request (#6235 / #31005, 5,200+ reactions). | <https://github.com/anthropics/claude-code/issues/31005> |
| OpenAI Codex (CLI + cloud) | NATIVE | Richest cascade: global `~/.codex` then root -> cwd, <=1 file/dir, concatenated root-down, closer overrides; `AGENTS.override.md` > `AGENTS.md` > fallbacks. | `AGENTS.md` | Yes — full cascade, closer dir overrides. | Cap `project_doc_max_bytes` default 32 KiB. | <https://developers.openai.com/codex/guides/agents-md> |
| GitHub Copilot (coding agent) | NATIVE (root + nested since 2025-08-28) | Reads `AGENTS.md`; also `.github/copilot-instructions.md`, `.github/instructions/**.instructions.md`, `CLAUDE.md`, `GEMINI.md`. | `.github/copilot-instructions.md` | Yes — root + nested. | Treated as strong context, not strict enforcement. | <https://github.blog/changelog/2025-08-28-copilot-coding-agent-now-supports-agents-md-custom-instructions/> |
| GitHub Copilot (VS Code chat) | CONFIG | Experimental, OFF by default; must enable. | `.github/copilot-instructions.md` | Follows VS Code instruction scoping. | Opt-in experimental setting. | <https://code.visualstudio.com/docs/agent-customization/custom-instructions> |
| Gemini CLI | CONFIG (not default) | Set `settings.json` `context.fileName: ["AGENTS.md","GEMINI.md"]`. Native default declined. | `GEMINI.md` | Per configured filename list. | Free-tier Gemini CLI to be replaced by Antigravity CLI ~2026-06-18. | <https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/gemini-md.md> |
| Windsurf / Cascade (Cognition/Devin) | NATIVE via Rules engine | Root `AGENTS.md` = always-on; subdir = glob-scoped. | Legacy `.windsurfrules`; rules now `.devin/rules` (was `.windsurf/rules`). | Yes — subdir files glob-scoped. | ~6,000 chars/file, 12,000 total. | <https://docs.devin.ai/desktop/cascade/agents-md> |
| Aider | NO (not automatic) | ADAPTER — `aider --read AGENTS.md`, `/read`, or `read: AGENTS.md` in `.aider.conf.yml`. | `CONVENTIONS.md` (also not auto-loaded). | Manual per invocation. | Conventions file is likewise opt-in. | <https://aider.chat/docs/usage/conventions.html> |
| Google Jules | NATIVE (repo-root, since 2025-06-20) | Reads root `AGENTS.md`; also uses `README.md` for context. | `AGENTS.md` | Repo-root. | Pulls README as supplementary context. | <https://jules.google/docs/changelog/2025-06-20/> |
| Cline | NATIVE | Project-root `AGENTS.md` + global `~/.agents/AGENTS.md`, autoloaded; also reads `.clinerules/`, `.cursorrules`, `.windsurfrules`. | `.clinerules/` | Workspace wins over global. | Wide vendor-file fallback set. | <https://docs.cline.bot/customization/cline-rules> |
| Zed | NATIVE but FIRST-MATCH | Priority order (not merge): `.rules` > `.cursorrules` > `.windsurfrules` > `.clinerules` > `.github/copilot-instructions.md` > `AGENT.md` > `AGENTS.md` > `CLAUDE.md` > `GEMINI.md`. | `.rules` | First match wins. | A stray vendor file SHADOWS `AGENTS.md`. | <https://zed.dev/docs/ai/instructions> |
| Amp (Sourcegraph) | NATIVE | Reads `AGENTS.md`; falls back to `AGENT.md` or `CLAUDE.md`. | `AGENTS.md` | Standard. | Migrate: `mv AGENT.md AGENTS.md && ln -s AGENTS.md AGENT.md`. | <https://ampcode.com/manual> |
| opencode | NATIVE | Reads `AGENTS.md`; `/init` can generate one. | `AGENTS.md` | Standard. | `/init` generation supported. | <https://agents.md/> |
| RooCode | NATIVE | Reads `AGENTS.md`; `AGENTS.local.md` personal overrides (v3.47.0). | `AGENTS.md` | Standard. | Personal overrides via `.local.md`. | <https://docs.roocode.com/update-notes/v3.47.0> |
| Kilo Code, Factory, Devin, Warp, JetBrains Junie, Augment, Phoenix, Ona, UiPath Autopilot, Semgrep, goose, Gemini Code Assist (agent mode), Android Studio Gemini | NATIVE | Read `AGENTS.md` per the official tool list. | `AGENTS.md` | Standard. | Listed as native on the official directory. | <https://agents.md/> |

## How to read this table

- If your tool is **NATIVE**, just drop `AGENTS.md` at your repo root.
- If it is **CONFIG**, copy the one-line setting from the *Mechanism* column.
- If it is **ADAPTER / NO**, use the symlink/flag in the *Mechanism* column
  (our [`agents-md-migrate`](./README.md#tooling) can wire these up for you).
- In a monorepo, prefer nested `AGENTS.md` files; remember Zed uses
  **first-match** priority, so a stray `.cursorrules` can shadow `AGENTS.md`.
```

- [ ] **Step 2: Verify the matrix passes the content linter.**
  - Run: `bunx markdownlint-cli2 COMPATIBILITY.md`
  - Expected PASS: `Summary: 0 error(s)` (exit 0).

- [ ] **Step 3: Commit the compatibility matrix.**
```bash
git add COMPATIBILITY.md
git commit -m "$(cat <<'EOF'
docs: add tool compatibility matrix

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Template — TypeScript + Node

**Files:**
- Create: `templates/typescript-node/AGENTS.md`

- [ ] **Step 1: Create `templates/typescript-node/AGENTS.md` with COMPLETE content.**
```markdown
# AGENTS.md

TypeScript Node.js service/library. Replace the bracketed bits with your project.

## Stack

- Node.js 20 LTS, TypeScript 5.5 (strict).
- Package manager: **pnpm 9** (use `pnpm`, never `npm`/`yarn`).
- Test runner: Vitest. Lint/format: ESLint + Prettier.

## Setup

```bash
pnpm install          # install deps
cp .env.example .env  # local config; never commit .env
```

## Commands

Run these from the repo root. Agents may execute them, so they must work as-is.

```bash
pnpm dev              # start the watch-mode dev server
pnpm build            # tsc -p tsconfig.json, emits to dist/
pnpm test             # vitest run (all tests, once)
pnpm test -- --watch  # vitest in watch mode
pnpm lint             # eslint . --max-warnings=0
pnpm format           # prettier --write .
pnpm typecheck        # tsc --noEmit
```

Verify a single file fast: `pnpm vitest run src/foo.test.ts`.

## Code style

- Strict TypeScript: no `any`, no non-null `!` unless justified in a comment.
- Prefer named exports; one public concept per file.
- Validate external input with Zod at the boundary, then trust types inward.

Example — a typed, validated handler:

```ts
import { z } from "zod";

const Input = z.object({ id: z.string().uuid(), limit: z.number().int().max(100) });

export function listItems(raw: unknown) {
  const { id, limit } = Input.parse(raw); // throws on bad input
  return db.items.findMany({ where: { ownerId: id }, take: limit });
}
```

## Testing

- Co-locate tests as `*.test.ts` next to the code they cover.
- A change is done when `pnpm typecheck`, `pnpm lint`, and `pnpm test` all pass.
- Add a failing test first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Keep commits small; use Conventional Commits (`feat:`, `fix:`, `chore:`).
3. Before pushing, run `pnpm lint && pnpm typecheck && pnpm test`.
4. Open a PR with a one-line summary and the test command you ran.

## Boundaries

- **Do** read `.env.example` to learn required config; **never** commit secrets,
  `.env`, or real credentials.
- **Do** edit `src/**`; **ask first** before changing `package.json` deps,
  CI workflows, or anything under `infra/`.
- **Do** add a migration when changing the DB schema; **never** edit an existing
  applied migration file — add a new one.
- **Never** disable lint/type errors with broad `// eslint-disable` or `// @ts-ignore`
  to make CI pass; fix the cause.

## More

- Architecture & conventions: `docs/architecture.md`.
- API reference: `docs/api.md`.
```

- [ ] **Step 2: Verify line count is within the 60-150 budget and lint passes.**
  - Run: `bunx markdownlint-cli2 templates/typescript-node/AGENTS.md`
  - Expected PASS: `Summary: 0 error(s)`.
  - Run: `wc -l templates/typescript-node/AGENTS.md` (Bash tool) — expect between 60 and 150.

- [ ] **Step 3: Commit the TypeScript template.**
```bash
git add templates/typescript-node/AGENTS.md
git commit -m "$(cat <<'EOF'
docs(templates): add typescript-node AGENTS.md

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Template — Python

**Files:**
- Create: `templates/python/AGENTS.md`

- [ ] **Step 1: Create `templates/python/AGENTS.md` with COMPLETE content.**
```markdown
# AGENTS.md

Generic Python project. Replace the bracketed bits with your project's details.

## Stack

- Python 3.12.
- Dependency/runner: **uv** (use `uv`, never bare `pip` in the project venv).
- Lint + format: Ruff. Type check: mypy. Tests: pytest.

## Setup

```bash
uv sync                 # create .venv and install deps from uv.lock
cp .env.example .env    # local config; never commit .env
```

## Commands

Run from the repo root via `uv run` so the project venv is used.

```bash
uv run python -m app          # run the app
uv run pytest -q              # run all tests, quiet
uv run pytest -v path/to/test_x.py::test_case   # one test, verbose
uv run ruff check .           # lint
uv run ruff format .          # format
uv run mypy src               # type check
```

## Code style

- Ruff is the source of truth; do not hand-format around it.
- Full type hints on public functions; prefer dataclasses over loose dicts.
- Raise specific exceptions; never `except:` bare.

Example — a typed, defensible function:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Item:
    id: str
    qty: int

def total_qty(items: list[Item]) -> int:
    if any(i.qty < 0 for i in items):
        raise ValueError("qty must be non-negative")
    return sum(i.qty for i in items)
```

## Testing

- Tests live in `tests/`, named `test_*.py`.
- A change is done when `uv run ruff check .`, `uv run mypy src`, and
  `uv run pytest -q` all pass.
- Add a failing test first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `chore:`); keep commits small.
3. Before pushing: `uv run ruff check . && uv run mypy src && uv run pytest -q`.
4. PR description: one-line summary + the exact test command you ran.

## Boundaries

- **Do** read `.env.example` for required config; **never** commit secrets,
  `.env`, or credentials.
- **Do** edit `src/**` and `tests/**`; **ask first** before changing
  `pyproject.toml` dependencies or CI workflows.
- **Do** add a new Alembic migration for schema changes; **never** edit an
  already-applied migration.
- **Never** silence type/lint errors with blanket `# type: ignore` or
  `# noqa`; fix the underlying issue.

## More

- Architecture notes: `docs/architecture.md`.
- Runbook: `docs/runbook.md`.
```

- [ ] **Step 2: Lint and verify length.**
  - Run: `bunx markdownlint-cli2 templates/python/AGENTS.md`
  - Expected PASS: `Summary: 0 error(s)`.

- [ ] **Step 3: Commit the Python template.**
```bash
git add templates/python/AGENTS.md
git commit -m "$(cat <<'EOF'
docs(templates): add python AGENTS.md

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Template — Monorepo (root)

**Files:**
- Create: `templates/monorepo/AGENTS.md`

- [ ] **Step 1: Create `templates/monorepo/AGENTS.md` with COMPLETE content.**
```markdown
# AGENTS.md

Root of a multi-package monorepo. This file holds shared rules; each package
keeps its own nested `AGENTS.md` with package-specific commands.

## Stack

- Workspace manager: **pnpm 9 workspaces** + Turborepo for task running.
- Packages live under `packages/*` and `apps/*`.
- Per-package toolchains vary; defer to each package's nested `AGENTS.md`.

## Setup

```bash
pnpm install            # install all workspace deps once at the root
cp .env.example .env    # shared local config; never commit .env
```

## Commands (run at the repo root)

```bash
pnpm build              # turbo run build (respects the dependency graph)
pnpm test               # turbo run test across all packages
pnpm lint               # turbo run lint across all packages
pnpm --filter @acme/web dev          # run one package's dev task
pnpm --filter @acme/api test         # test only one package
pnpm --filter ...@acme/core build    # build a package and its dependents
```

Prefer `--filter` to scope work to the package you changed instead of building
the whole repo.

## Nested AGENTS.md (read this)

- Agents use the **nearest** `AGENTS.md` in the tree; the closest file to the
  edited file wins, and a user's chat prompt overrides everything.
- This root file covers cross-cutting rules only. Put package-specific build,
  test, and style commands in that package's own `AGENTS.md`, e.g.
  `packages/core/AGENTS.md`, `apps/web/AGENTS.md`.
- Keep each file short; do not duplicate root rules into every package.

Example — a minimal nested package file (`apps/web/AGENTS.md`):

```markdown
# AGENTS.md
Next.js app. Commands: `pnpm --filter @acme/web dev|build|test`.
Tests: Playwright in `e2e/`. Never call the DB directly — use `@acme/core`.
```

## Code style

- Shared ESLint/Prettier config lives in `packages/config`; do not fork it
  per package.
- Cross-package imports go through published package entry points
  (`@acme/core`), never deep relative paths across package boundaries.

## Testing

- A change is done when `pnpm lint && pnpm test` pass at the root (or the
  scoped `--filter` equivalents for the package you touched).
- Add tests in the package that owns the behavior.

## Git & PRs

1. Branch from `main`: `git switch -c feat/<pkg>-<short-name>`.
2. Conventional Commits scoped to the package: `feat(web): ...`.
3. Before pushing: `pnpm --filter ...<changed-pkg> lint test build`.
4. PR description lists which packages changed and the commands you ran.

## Boundaries

- **Do** edit within a single package per PR when possible; **ask first**
  before changing the workspace root `package.json`, `turbo.json`, or
  `pnpm-workspace.yaml`.
- **Do** add a new package under `packages/`; **never** introduce a circular
  dependency between packages (CI rejects it).
- **Do** read `.env.example`; **never** commit secrets or `.env`.
- **Never** bump a shared dependency in one package only — change it at the
  root so versions stay aligned.

## More

- When to split a package: `docs/nesting-monorepos.md`.
- Dependency graph & ownership: `docs/architecture.md`.
```

- [ ] **Step 2: Lint and verify length.**
  - Run: `bunx markdownlint-cli2 templates/monorepo/AGENTS.md`
  - Expected PASS: `Summary: 0 error(s)`.

- [ ] **Step 3: Commit the monorepo template.**
```bash
git add templates/monorepo/AGENTS.md
git commit -m "$(cat <<'EOF'
docs(templates): add monorepo root AGENTS.md

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Template — Go

**Files:**
- Create: `templates/go/AGENTS.md`

- [ ] **Step 1: Create `templates/go/AGENTS.md` with COMPLETE content.**
```markdown
# AGENTS.md

Go module. Replace the bracketed bits with your project's details.

## Stack

- Go 1.22 (modules; module path in `go.mod`).
- Lint: golangci-lint. Format: gofmt + goimports. Tests: standard `go test`.

## Setup

```bash
go mod download         # fetch dependencies
cp .env.example .env    # local config; never commit .env
```

## Commands

```bash
go run ./cmd/app                 # run the main binary
go build ./...                   # build everything
go test ./...                    # run all tests
go test -run TestThing ./pkg/x   # run one test
go test -race -cover ./...       # race detector + coverage
golangci-lint run                # lint
gofmt -l -w . && goimports -w .  # format + fix imports
```

## Code style

- Code must be `gofmt`-clean; CI rejects unformatted code.
- Return errors, don't panic in library code; wrap with `fmt.Errorf("...: %w", err)`.
- Accept interfaces, return concrete types.

Example — idiomatic error wrapping:

```go
func LoadConfig(path string) (*Config, error) {
    b, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("read config %q: %w", path, err)
    }
    var c Config
    if err := json.Unmarshal(b, &c); err != nil {
        return nil, fmt.Errorf("parse config: %w", err)
    }
    return &c, nil
}
```

## Testing

- Table-driven tests in `*_test.go` beside the code.
- A change is done when `golangci-lint run` and `go test -race ./...` pass.
- Add a failing test first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `chore:`).
3. Before pushing: `gofmt -l . && golangci-lint run && go test -race ./...`.
4. PR description: one-line summary + the test command you ran.

## Boundaries

- **Do** read `.env.example`; **never** commit secrets or `.env`.
- **Do** edit package code; **ask first** before running `go get` to add a new
  dependency or before touching `go.mod`/`go.sum` by hand.
- **Do** run `go mod tidy` after dependency changes; **never** hand-edit
  `go.sum`.
- **Never** suppress vet/lint findings with `//nolint` without a reason comment.

## More

- Package layout & design: `docs/architecture.md`.
```

- [ ] **Step 2: Lint.**
  - Run: `bunx markdownlint-cli2 templates/go/AGENTS.md`
  - Expected PASS: `Summary: 0 error(s)`.

- [ ] **Step 3: Commit.**
```bash
git add templates/go/AGENTS.md
git commit -m "$(cat <<'EOF'
docs(templates): add go AGENTS.md

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Template — Rust

**Files:**
- Create: `templates/rust/AGENTS.md`

- [ ] **Step 1: Create `templates/rust/AGENTS.md` with COMPLETE content.**
```markdown
# AGENTS.md

Rust crate/workspace. Replace the bracketed bits with your project's details.

## Stack

- Rust stable (pinned in `rust-toolchain.toml`), 2021 edition.
- Build/test: Cargo (+ cargo-nextest). Lint: Clippy. Format: rustfmt.

## Setup

```bash
rustup show             # confirm the pinned toolchain is installed
cargo fetch             # download dependencies
```

## Commands

```bash
cargo run               # run the default binary
cargo build             # debug build
cargo build --release   # optimized build
cargo nextest run       # run all tests (fast); or: cargo test
cargo test some_test    # run one test by name substring
cargo clippy --all-targets -- -D warnings   # lint, warnings = errors
cargo fmt --all         # format
```

## Code style

- Code must be `cargo fmt`-clean and `clippy`-clean (warnings denied in CI).
- Prefer `Result<T, E>` + `?` over `.unwrap()`/`.expect()` outside tests and
  `main`.
- Use `thiserror` for library error enums; avoid stringly-typed errors.

Example — fallible parsing with `?`:

```rust
use std::path::Path;

pub fn load(path: &Path) -> Result<Config, ConfigError> {
    let text = std::fs::read_to_string(path)?;       // io::Error -> ConfigError
    let cfg: Config = toml::from_str(&text)?;        // de::Error -> ConfigError
    Ok(cfg)
}
```

## Testing

- Unit tests in `#[cfg(test)]` modules; integration tests in `tests/`.
- A change is done when `cargo clippy -- -D warnings`, `cargo fmt --check`,
  and `cargo nextest run` all pass.
- Add a failing test first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `chore:`).
3. Before pushing: `cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo nextest run`.
4. PR description: one-line summary + the test command you ran.

## Boundaries

- **Do** edit crate source; **ask first** before adding a dependency with
  `cargo add` (it changes `Cargo.toml`/`Cargo.lock`).
- **Do** keep `unsafe` blocks tiny and documented with a `// SAFETY:` comment;
  **never** add `unsafe` to silence the borrow checker.
- **Do** read `.env.example`; **never** commit secrets or `.env`.
- **Never** commit with `#[allow(...)]` added only to pass CI; fix the lint.

## More

- Crate/module layout: `docs/architecture.md`.
```

- [ ] **Step 2: Lint.**
  - Run: `bunx markdownlint-cli2 templates/rust/AGENTS.md`
  - Expected PASS: `Summary: 0 error(s)`.

- [ ] **Step 3: Commit.**
```bash
git add templates/rust/AGENTS.md
git commit -m "$(cat <<'EOF'
docs(templates): add rust AGENTS.md

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Template — Java + Spring Boot

**Files:**
- Create: `templates/java-spring/AGENTS.md`

- [ ] **Step 1: Create `templates/java-spring/AGENTS.md` with COMPLETE content.**
```markdown
# AGENTS.md

Java + Spring Boot service. Replace the bracketed bits with your details.

## Stack

- Java 21 (LTS), Spring Boot 3.3.
- Build: **Maven** via the wrapper `./mvnw` (use the wrapper, not a global mvn).
- Tests: JUnit 5 + Spring Boot Test. Format: Spotless (google-java-format).

## Setup

```bash
./mvnw -version          # confirm the wrapper + JDK 21
cp .env.example .env     # local config; never commit .env
```

## Commands

```bash
./mvnw spring-boot:run                 # run the app locally
./mvnw clean package                   # build the jar (runs tests)
./mvnw test                            # run all tests
./mvnw -Dtest=OrderServiceTest test    # run one test class
./mvnw spotless:apply                  # format
./mvnw spotless:check verify           # format check + full verify
```

> Gradle variant: swap `./mvnw` for `./gradlew`, `package` for `build`,
> and `-Dtest=X test` for `test --tests X`.

## Code style

- Spotless is the source of truth; run `spotless:apply` before committing.
- Constructor injection only (no field `@Autowired`); keep beans stateless.
- Use DTOs at the web boundary; never expose JPA entities directly in responses.

Example — constructor-injected service:

```java
@Service
public class OrderService {
    private final OrderRepository repo;

    public OrderService(OrderRepository repo) {
        this.repo = repo;
    }

    public Order get(long id) {
        return repo.findById(id)
            .orElseThrow(() -> new OrderNotFoundException(id));
    }
}
```

## Testing

- Unit tests under `src/test/java`, mirroring the main package.
- A change is done when `./mvnw spotless:check verify` passes.
- Add a failing test first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `chore:`).
3. Before pushing: `./mvnw spotless:check verify`.
4. PR description: one-line summary + the test command you ran.

## Boundaries

- **Do** read `.env.example` and `application.yml` for config; **never** commit
  secrets, `.env`, or real credentials.
- **Do** edit application code; **ask first** before changing `pom.xml`
  dependencies or Spring auto-config.
- **Do** add a Flyway migration under `src/main/resources/db/migration` for
  schema changes; **never** edit an applied `V*` migration.
- **Never** disable a failing test with `@Disabled` to make the build green.

## More

- Module/layer boundaries: `docs/architecture.md`.
```

- [ ] **Step 2: Lint.**
  - Run: `bunx markdownlint-cli2 templates/java-spring/AGENTS.md`
  - Expected PASS: `Summary: 0 error(s)`.

- [ ] **Step 3: Commit.**
```bash
git add templates/java-spring/AGENTS.md
git commit -m "$(cat <<'EOF'
docs(templates): add java-spring AGENTS.md

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Template — .NET / C#

**Files:**
- Create: `templates/dotnet-csharp/AGENTS.md`

- [ ] **Step 1: Create `templates/dotnet-csharp/AGENTS.md` with COMPLETE content.**
```markdown
# AGENTS.md

.NET / C# solution. Replace the bracketed bits with your project's details.

## Stack

- .NET 8 (LTS), C# 12, nullable reference types enabled.
- Build/test: `dotnet` CLI. Tests: xUnit. Format: `dotnet format`.

## Setup

```bash
dotnet restore           # restore NuGet packages
cp .env.example .env     # local config; never commit .env
```

## Commands

```bash
dotnet run --project src/Api            # run the API project
dotnet build -c Release                 # build
dotnet test                             # run all tests
dotnet test --filter FullyQualifiedName~OrderServiceTests   # one test class
dotnet format                           # apply formatting + analyzers
dotnet format --verify-no-changes       # format check (used in CI)
```

## Code style

- Nullable is on: treat warnings as errors; do not sprinkle `!` null-forgiving.
- Use `async`/`await` end-to-end; suffix async methods with `Async`.
- Prefer records for DTOs; keep services injected via the DI container.

Example — an async service method:

```csharp
public sealed class OrderService(IOrderRepository repo)
{
    public async Task<Order> GetAsync(long id, CancellationToken ct)
    {
        return await repo.FindAsync(id, ct)
            ?? throw new OrderNotFoundException(id);
    }
}
```

## Testing

- Test projects named `*.Tests`; mirror the namespace under test.
- A change is done when `dotnet format --verify-no-changes` and `dotnet test`
  pass.
- Add a failing test first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `chore:`).
3. Before pushing: `dotnet format --verify-no-changes && dotnet build -c Release && dotnet test`.
4. PR description: one-line summary + the test command you ran.

## Boundaries

- **Do** read `.env.example` and `appsettings.json`; **never** commit secrets,
  `.env`, or `appsettings.*.json` with real values.
- **Do** edit project code; **ask first** before adding NuGet packages or
  editing `.csproj` `TargetFramework`.
- **Do** add an EF Core migration (`dotnet ef migrations add`) for schema
  changes; **never** edit an applied migration's `Up`/`Down`.
- **Never** suppress analyzer warnings with `#pragma warning disable` to pass CI.

## More

- Project/layer layout: `docs/architecture.md`.
```

- [ ] **Step 2: Lint.**
  - Run: `bunx markdownlint-cli2 templates/dotnet-csharp/AGENTS.md`
  - Expected PASS: `Summary: 0 error(s)`.

- [ ] **Step 3: Commit.**
```bash
git add templates/dotnet-csharp/AGENTS.md
git commit -m "$(cat <<'EOF'
docs(templates): add dotnet-csharp AGENTS.md

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Template — Next.js

**Files:**
- Create: `templates/nextjs/AGENTS.md`

- [ ] **Step 1: Create `templates/nextjs/AGENTS.md` with COMPLETE content.**
```markdown
# AGENTS.md

Next.js app (App Router). Replace the bracketed bits with your details.

## Stack

- Next.js 14 (App Router), React 18, TypeScript strict.
- Package manager: **pnpm 9**. Tests: Vitest (unit) + Playwright (e2e).
- Lint/format: ESLint (next config) + Prettier.

## Setup

```bash
pnpm install
cp .env.example .env.local   # Next reads .env.local; never commit it
```

## Commands

```bash
pnpm dev               # next dev (http://localhost:3000)
pnpm build             # next build (also type-checks)
pnpm start             # serve the production build
pnpm test              # vitest run
pnpm test:e2e          # playwright test
pnpm lint              # next lint
pnpm typecheck         # tsc --noEmit
```

## Code style

- Default to **Server Components**; add `"use client"` only when you need state,
  effects, or browser APIs.
- Fetch data in server components / route handlers; never expose secrets to the
  client bundle (only `NEXT_PUBLIC_*` vars reach the browser).
- Co-locate components with their route segment under `app/`.

Example — a server component fetching data:

```tsx
// app/orders/page.tsx (Server Component by default)
export default async function OrdersPage() {
  const orders = await db.order.findMany({ take: 20 }); // runs on the server
  return <OrderList orders={orders} />;
}
```

## Testing

- Unit tests as `*.test.tsx` beside components; e2e specs under `e2e/`.
- A change is done when `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass;
  run `pnpm test:e2e` for routing/flow changes.
- Add a failing test first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `chore:`).
3. Before pushing: `pnpm lint && pnpm typecheck && pnpm test`.
4. PR description: one-line summary + the test command you ran.

## Boundaries

- **Do** put browser-safe config in `NEXT_PUBLIC_*`; **never** reference a
  server-only secret inside a `"use client"` component.
- **Do** edit `app/**` and `components/**`; **ask first** before changing
  `next.config.js`, middleware, or auth.
- **Do** read `.env.example`; **never** commit `.env.local` or secrets.
- **Never** disable ESLint rules inline to ship; fix the cause.

## More

- Routing & data conventions: `docs/architecture.md`.
```

- [ ] **Step 2: Lint.**
  - Run: `bunx markdownlint-cli2 templates/nextjs/AGENTS.md`
  - Expected PASS: `Summary: 0 error(s)`.

- [ ] **Step 3: Commit.**
```bash
git add templates/nextjs/AGENTS.md
git commit -m "$(cat <<'EOF'
docs(templates): add nextjs AGENTS.md

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: Template — React + Vite

**Files:**
- Create: `templates/react-vite/AGENTS.md`

- [ ] **Step 1: Create `templates/react-vite/AGENTS.md` with COMPLETE content.**
```markdown
# AGENTS.md

React SPA built with Vite. Replace the bracketed bits with your details.

## Stack

- React 18 + TypeScript strict, bundled by Vite 5.
- Package manager: **pnpm 9**. Tests: Vitest + Testing Library.
- Lint/format: ESLint + Prettier.

## Setup

```bash
pnpm install
cp .env.example .env   # Vite exposes only VITE_* vars; never commit .env
```

## Commands

```bash
pnpm dev               # vite dev server (http://localhost:5173)
pnpm build             # tsc -b && vite build -> dist/
pnpm preview           # serve the production build locally
pnpm test              # vitest run
pnpm test -- --watch   # vitest watch
pnpm lint              # eslint . --max-warnings=0
pnpm typecheck         # tsc --noEmit
```

## Code style

- Function components + hooks only; no class components.
- Keep components pure; side effects go in `useEffect` or event handlers.
- Only `VITE_`-prefixed env vars are exposed to the client — never put secrets
  in any env var the bundle can read.

Example — a small, testable component:

```tsx
type Props = { items: string[] };

export function ItemList({ items }: Props) {
  if (items.length === 0) return <p>No items</p>;
  return <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>;
}
```

## Testing

- Co-locate tests as `*.test.tsx`; query by role/text, not test IDs, when possible.
- A change is done when `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- Add a failing test first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `chore:`).
3. Before pushing: `pnpm lint && pnpm typecheck && pnpm test`.
4. PR description: one-line summary + the test command you ran.

## Boundaries

- **Do** call backends from a typed API client in `src/api`; **ask first**
  before adding a new runtime dependency.
- **Do** keep secrets server-side; **never** ship an API secret in a `VITE_*`
  var or commit `.env`.
- **Do** edit `src/**`; **ask first** before changing `vite.config.ts`.
- **Never** disable ESLint inline just to pass CI; fix the cause.

## More

- Component & state conventions: `docs/architecture.md`.
```

- [ ] **Step 2: Lint.**
  - Run: `bunx markdownlint-cli2 templates/react-vite/AGENTS.md`
  - Expected PASS: `Summary: 0 error(s)`.

- [ ] **Step 3: Commit.**
```bash
git add templates/react-vite/AGENTS.md
git commit -m "$(cat <<'EOF'
docs(templates): add react-vite AGENTS.md

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: Template — Django

**Files:**
- Create: `templates/django/AGENTS.md`

- [ ] **Step 1: Create `templates/django/AGENTS.md` with COMPLETE content.**
```markdown
# AGENTS.md

Django web application. Replace the bracketed bits with your details.

## Stack

- Python 3.12, Django 5.0.
- Dependency/runner: **uv**. Lint/format: Ruff. Tests: pytest + pytest-django.

## Setup

```bash
uv sync                       # create .venv and install deps
cp .env.example .env          # local config; never commit .env
uv run python manage.py migrate   # apply DB migrations
```

## Commands

```bash
uv run python manage.py runserver        # dev server (http://localhost:8000)
uv run pytest -q                         # run all tests
uv run pytest path/to/test_views.py -v   # one test file
uv run python manage.py makemigrations   # create migrations for model changes
uv run python manage.py migrate          # apply migrations
uv run ruff check . && uv run ruff format .   # lint + format
```

## Code style

- Keep views thin; put business logic in services or model methods, not views.
- Always use the ORM with parameterized queries; never build SQL with f-strings.
- Use `select_related`/`prefetch_related` to avoid N+1 queries.

Example — a thin view delegating to the model layer:

```python
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from .models import Order

def order_detail(request, pk):
    order = get_object_or_404(Order.objects.select_related("customer"), pk=pk)
    return JsonResponse(order.to_dict())
```

## Testing

- Tests live in each app's `tests/` package; use `pytest-django` fixtures.
- A change is done when `uv run ruff check .` and `uv run pytest -q` pass.
- Add a failing test first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `chore:`).
3. Before pushing: `uv run ruff check . && uv run pytest -q`.
4. PR: one-line summary + the test command you ran + any new migrations.

## Boundaries

- **Do** read `.env.example` and `settings.py` for config; **never** commit
  `SECRET_KEY`, `.env`, or real credentials.
- **Do** run `makemigrations` when models change; **never** edit an applied
  migration — add a new one.
- **Do** edit app code; **ask first** before changing `settings.py`,
  middleware, or installed apps.
- **Never** set `DEBUG = True` in committed settings or expose admin without auth.

## More

- App structure & domain layout: `docs/architecture.md`.
```

- [ ] **Step 2: Lint.**
  - Run: `bunx markdownlint-cli2 templates/django/AGENTS.md`
  - Expected PASS: `Summary: 0 error(s)`.

- [ ] **Step 3: Commit.**
```bash
git add templates/django/AGENTS.md
git commit -m "$(cat <<'EOF'
docs(templates): add django AGENTS.md

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: Template — FastAPI

**Files:**
- Create: `templates/fastapi/AGENTS.md`

- [ ] **Step 1: Create `templates/fastapi/AGENTS.md` with COMPLETE content.**
```markdown
# AGENTS.md

FastAPI service. Replace the bracketed bits with your project's details.

## Stack

- Python 3.12, FastAPI + Uvicorn, Pydantic v2.
- Dependency/runner: **uv**. Lint: Ruff. Type check: mypy. Tests: pytest.

## Setup

```bash
uv sync                 # create .venv and install deps
cp .env.example .env    # local config; never commit .env
```

## Commands

```bash
uv run uvicorn app.main:app --reload     # dev server (http://localhost:8000)
uv run pytest -q                         # run all tests
uv run pytest tests/test_orders.py -v    # one test file
uv run ruff check . && uv run ruff format .   # lint + format
uv run mypy app                          # type check
```

Interactive docs are served at `/docs` when the app is running.

## Code style

- Define request/response models with Pydantic; let FastAPI validate at the edge.
- Inject shared resources (db sessions, clients) with `Depends`, not globals.
- Use `async def` handlers and async DB drivers consistently.

Example — a typed, validated endpoint:

```python
from fastapi import APIRouter, Depends
from pydantic import BaseModel

router = APIRouter()

class OrderIn(BaseModel):
    sku: str
    qty: int

@router.post("/orders")
async def create_order(body: OrderIn, db=Depends(get_db)):
    return await db.create_order(body.sku, body.qty)
```

## Testing

- Tests in `tests/`; use `httpx.AsyncClient` against the ASGI app.
- A change is done when `uv run ruff check .`, `uv run mypy app`, and
  `uv run pytest -q` all pass.
- Add a failing test first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `chore:`).
3. Before pushing: `uv run ruff check . && uv run mypy app && uv run pytest -q`.
4. PR description: one-line summary + the test command you ran.

## Boundaries

- **Do** read `.env.example` for config; **never** commit secrets or `.env`.
- **Do** add an Alembic migration for schema changes; **never** edit an applied
  migration.
- **Do** edit `app/**`; **ask first** before changing dependency injection
  wiring or `pyproject.toml` deps.
- **Never** disable Pydantic validation or accept raw `dict` request bodies to
  "save time."

## More

- Service layout & dependencies: `docs/architecture.md`.
```

- [ ] **Step 2: Lint.**
  - Run: `bunx markdownlint-cli2 templates/fastapi/AGENTS.md`
  - Expected PASS: `Summary: 0 error(s)`.

- [ ] **Step 3: Commit.**
```bash
git add templates/fastapi/AGENTS.md
git commit -m "$(cat <<'EOF'
docs(templates): add fastapi AGENTS.md

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 16: Template — Ruby on Rails

**Files:**
- Create: `templates/rails/AGENTS.md`

- [ ] **Step 1: Create `templates/rails/AGENTS.md` with COMPLETE content.**
```markdown
# AGENTS.md

Ruby on Rails application. Replace the bracketed bits with your details.

## Stack

- Ruby 3.3, Rails 7.1.
- Dependency manager: Bundler. Lint: RuboCop. Tests: RSpec.

## Setup

```bash
bundle install               # install gems
cp .env.example .env         # local config; never commit .env
bin/rails db:setup           # create + migrate + seed the dev DB
```

## Commands

```bash
bin/rails server                       # dev server (http://localhost:3000)
bundle exec rspec                      # run all specs
bundle exec rspec spec/models/order_spec.rb   # one spec file
bin/rails db:migrate                   # apply migrations
bin/rails g migration AddXToY x:string # generate a migration
bundle exec rubocop -A                 # lint + autocorrect
```

## Code style

- Follow RuboCop (rails + rspec cops); run `rubocop -A` before committing.
- Keep controllers skinny; push logic into models, service objects, or jobs.
- Use strong parameters; never pass raw `params` to `update`/`create`.

Example — a service object with strong params in the controller:

```ruby
class OrdersController < ApplicationController
  def create
    order = Orders::Create.call(order_params)
    render json: order, status: :created
  end

  private

  def order_params
    params.require(:order).permit(:sku, :qty)
  end
end
```

## Testing

- Specs live under `spec/`, mirroring `app/`.
- A change is done when `bundle exec rubocop` and `bundle exec rspec` pass.
- Add a failing spec first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `chore:`).
3. Before pushing: `bundle exec rubocop && bundle exec rspec`.
4. PR: one-line summary + the test command you ran + any new migrations.

## Boundaries

- **Do** read `.env.example` and `config/credentials`; **never** commit
  `master.key`, secrets, or `.env`.
- **Do** generate a migration for schema changes; **never** edit an applied
  migration — add a new one and re-run `db:migrate`.
- **Do** edit `app/**`; **ask first** before changing `Gemfile`, initializers,
  or routes that affect auth.
- **Never** skip strong parameters or interpolate user input into SQL.

## More

- Domain/service layout: `docs/architecture.md`.
```

- [ ] **Step 2: Lint.**
  - Run: `bunx markdownlint-cli2 templates/rails/AGENTS.md`
  - Expected PASS: `Summary: 0 error(s)`.

- [ ] **Step 3: Commit.**
```bash
git add templates/rails/AGENTS.md
git commit -m "$(cat <<'EOF'
docs(templates): add rails AGENTS.md

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 17: Template — Data / ML

**Files:**
- Create: `templates/data-ml/AGENTS.md`

- [ ] **Step 1: Create `templates/data-ml/AGENTS.md` with COMPLETE content.**
```markdown
# AGENTS.md

Data science / ML project. Replace the bracketed bits with your details.

## Stack

- Python 3.12, pandas/polars + scikit-learn/PyTorch.
- Dependency/runner: **uv**. Lint/format: Ruff. Tests: pytest.
- Experiment tracking: MLflow. Notebooks live in `notebooks/`.

## Setup

```bash
uv sync                 # create .venv and install deps
cp .env.example .env    # API keys / data paths; never commit .env
```

## Commands

```bash
uv run jupyter lab                       # exploratory notebooks
uv run python -m src.train --config configs/baseline.yaml   # train a model
uv run python -m src.evaluate --run-id <id>                 # evaluate a run
uv run pytest -q                         # run all tests
uv run ruff check . && uv run ruff format .   # lint + format
uv run nbstripout notebooks/*.ipynb      # strip notebook outputs before commit
```

## Code style

- Put reusable logic in `src/` modules; notebooks should import from `src`,
  not redefine pipeline code.
- Set and log random seeds for reproducibility; pin data versions.
- Keep configs in `configs/*.yaml`; do not hardcode hyperparameters in code.

Example — a seeded, reproducible split:

```python
from sklearn.model_selection import train_test_split

def split(df, *, seed: int = 42):
    return train_test_split(df, test_size=0.2, random_state=seed, shuffle=True)
```

## Testing

- Test data transforms and feature code in `tests/`; assert on shapes/dtypes.
- A change is done when `uv run ruff check .` and `uv run pytest -q` pass and
  notebook outputs are stripped.
- Add a failing test first for any reusable transform (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c exp/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `exp:`).
3. Before pushing: `uv run nbstripout notebooks/*.ipynb && uv run ruff check . && uv run pytest -q`.
4. PR: one-line summary + metrics + the config/run id you used.

## Boundaries

- **Do** keep large data out of git — use the configured data store/DVC;
  **never** commit raw datasets, model weights, or `.env`.
- **Do** strip notebook outputs before committing; **never** commit a notebook
  with embedded secrets or PII in cell output.
- **Do** edit `src/**` and `configs/**`; **ask first** before changing the
  data schema or deleting an MLflow experiment.
- **Never** train on the test split or leak target columns into features.

## More

- Pipeline & data lineage: `docs/architecture.md`.
```

- [ ] **Step 2: Lint.**
  - Run: `bunx markdownlint-cli2 templates/data-ml/AGENTS.md`
  - Expected PASS: `Summary: 0 error(s)`.

- [ ] **Step 3: Commit.**
```bash
git add templates/data-ml/AGENTS.md
git commit -m "$(cat <<'EOF'
docs(templates): add data-ml AGENTS.md

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 18: Template — React Native / Expo

**Files:**
- Create: `templates/react-native/AGENTS.md`

- [ ] **Step 1: Create `templates/react-native/AGENTS.md` with COMPLETE content.**
```markdown
# AGENTS.md

React Native (Expo) mobile app. Replace the bracketed bits with your details.

## Stack

- Expo SDK 51, React Native 0.74, TypeScript strict, Expo Router.
- Package manager: **pnpm 9**. Tests: Jest + React Native Testing Library.
- Lint/format: ESLint + Prettier.

## Setup

```bash
pnpm install
cp .env.example .env     # EXPO_PUBLIC_* vars only on the client; never commit .env
```

## Commands

```bash
pnpm start               # expo start (Metro bundler + dev menu)
pnpm ios                 # run on the iOS simulator
pnpm android             # run on an Android emulator
pnpm test                # jest
pnpm lint                # eslint . --max-warnings=0
pnpm typecheck           # tsc --noEmit
```

## Code style

- Function components + hooks; route files live under `app/` (Expo Router).
- Only `EXPO_PUBLIC_*` env vars are exposed to the app bundle — keep real
  secrets on the backend, never in the client.
- Use `StyleSheet.create` or the project's styling lib; avoid inline style soup.

Example — a typed screen component:

```tsx
import { View, Text } from "react-native";

type Props = { name: string };

export default function Greeting({ name }: Props) {
  return (
    <View>
      <Text>Hello, {name}</Text>
    </View>
  );
}
```

## Testing

- Co-locate tests as `*.test.tsx`; query by accessibility role/label.
- A change is done when `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- Add a failing test first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `chore:`).
3. Before pushing: `pnpm lint && pnpm typecheck && pnpm test`.
4. PR: one-line summary + the test command + which platforms you smoke-tested.

## Boundaries

- **Do** put public config in `EXPO_PUBLIC_*`; **never** ship an API secret in
  the client bundle or commit `.env`.
- **Do** edit `app/**` and `components/**`; **ask first** before changing
  `app.json`/`app.config.ts`, native modules, or EAS build config.
- **Do** keep `ios/` and `android/` generated; **never** hand-edit native
  folders if the project uses Expo prebuild.
- **Never** disable ESLint inline just to pass CI; fix the cause.

## More

- Navigation & state conventions: `docs/architecture.md`.
```

- [ ] **Step 2: Lint.**
  - Run: `bunx markdownlint-cli2 templates/react-native/AGENTS.md`
  - Expected PASS: `Summary: 0 error(s)`.

- [ ] **Step 3: Commit.**
```bash
git add templates/react-native/AGENTS.md
git commit -m "$(cat <<'EOF'
docs(templates): add react-native AGENTS.md

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 19: Template — Minimal starter

**Files:**
- Create: `templates/minimal/AGENTS.md`

- [ ] **Step 1: Create `templates/minimal/AGENTS.md` with COMPLETE content (<40 lines).**
```markdown
# AGENTS.md

[One sentence: what this project is and what stack it uses.]

## Commands

```bash
<install-command>     # e.g. pnpm install / uv sync / bundle install
<run-command>         # start the app locally
<test-command>        # run the test suite
<lint-command>        # lint + format
```

## Code style

- [Point to the linter/formatter; let it be the source of truth.]
- [One or two project-specific rules an agent could not infer.]

## Testing

- A change is done when `<lint-command>` and `<test-command>` both pass.
- Add a failing test first, then make it pass.

## Boundaries

- **Do** read `.env.example` for required config; **never** commit secrets or `.env`.
- **Do** edit source code; **ask first** before changing dependencies or CI.
- **Never** disable lint/type errors to make CI pass — fix the cause.
```

- [ ] **Step 2: Lint and confirm it is under 40 lines.**
  - Run: `bunx markdownlint-cli2 templates/minimal/AGENTS.md`
  - Expected PASS: `Summary: 0 error(s)`.
  - Run: `wc -l templates/minimal/AGENTS.md` (Bash tool) — expect < 40.

- [ ] **Step 3: Commit.**
```bash
git add templates/minimal/AGENTS.md
git commit -m "$(cat <<'EOF'
docs(templates): add minimal AGENTS.md starter

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 20: Handbook — anatomy.md

**Files:**
- Create: `docs/anatomy.md`

- [ ] **Step 1: Create `docs/anatomy.md` with COMPLETE content.**
```markdown
# Anatomy of an AGENTS.md

`AGENTS.md` is freeform CommonMark/GFM Markdown. There are **no required
fields and no reserved headings** — you can name sections however you like.
This page documents the *conventional* section set most tools and humans
expect, and what each section is for. Pick the sections you need; skip the rest.

> The filename must be exactly `AGENTS.md` (uppercase `AGENTS`, lowercase
> `.md`), placed at the repo root. Monorepos add nested `AGENTS.md` files; the
> nearest file in the tree wins and a user's chat prompt overrides everything.

## A note on frontmatter

AGENTS.md 1.0 has **no YAML frontmatter**. A *draft* v1.1 proposal (issue #135,
**not merged**) would add optional `description` (string, <200 chars) and
`tags` (string array), with unknown keys ignored for forward-compatibility.
Until it lands, write plain Markdown and do not rely on frontmatter.

## Conventional sections

These mirror the official canonical example, which uses headings like
`## Dev environment tips`, `## Testing instructions`, and `## PR instructions`.

### Project overview

One or two sentences: what the project is and the stack (with versions). Keep
it tiny — agents do not need a tour, and long overviews waste tokens without
helping the agent find files.

### Setup commands / Dev environment tips

The exact commands to install dependencies and start developing
(`pnpm install`, `uv sync`, `bundle install`, ...). Agents **auto-execute**
these, so they must be copy-pasteable and correct.

### Build and test commands

Put commands **early** and include real flags (`pnpm test`, `pytest -v`,
`go test -race ./...`). Add a fast single-file verify command so the agent can
check its own work cheaply. This is the highest-value section.

### Code style

Point to the linter/formatter as the source of truth and list only the few
rules an agent cannot infer from config. Prefer a short real code example over
a paragraph of prose.

### Testing instructions

Where tests live, how to run one test, and the definition of done (which
commands must pass). State the TDD expectation if you have one.

### Security considerations

The single most common helpful constraint is **"never commit secrets."** Note
where config lives (`.env.example`), what must never be committed, and any
input-handling rules (validate at the boundary, parameterized queries).

### PR / commit instructions

Branch naming, commit convention (e.g. Conventional Commits), and the exact
checks to run before pushing. Keep it to a short numbered workflow.

### Boundaries (always-do / ask-first / never-do)

Explicit guardrails, each "never" **paired with a "do."** Example: *Do add a
new migration for schema changes; never edit an applied migration.* Pairing
keeps the agent unblocked instead of stuck.

## Recommended order

Commands first (setup → build/test), then code style and testing, then
security and PR rules, then boundaries, then a short linked-references section.
Front-loading commands matches what works in practice — see
[best-practices.md](./best-practices.md).

## Progressive disclosure

Keep the file short and **link** to deeper docs (architecture, runbooks) rather
than inlining them. Cap linked references to ~10-15 and link them explicitly —
orphan, unlinked docs are almost never discovered by agents.
```

- [ ] **Step 2: Lint.**
  - Run: `bunx markdownlint-cli2 docs/anatomy.md`
  - Expected PASS: `Summary: 0 error(s)`.

- [ ] **Step 3: Commit.**
```bash
git add docs/anatomy.md
git commit -m "$(cat <<'EOF'
docs(handbook): add anatomy.md

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 21: Handbook — best-practices.md

**Files:**
- Create: `docs/best-practices.md`

- [ ] **Step 1: Create `docs/best-practices.md` with COMPLETE content.**
```markdown
# AGENTS.md Best Practices

Evidence-based rules for writing an `AGENTS.md` that actually helps agents.
Citations point to the studies behind each rule; read the
[caveats](#caveats-on-the-evidence) before treating any single source as proof.

## DO

- **Lead with runnable commands and flags.** Put build/test/lint commands
  early with exact flags (`pnpm test`, `pytest -v`, `go test -race ./...`).
  Agents auto-execute them, so they must be copy-pasteable. *(GitHub 2,500-repo
  study; Augment AuggieBench.)*
- **Add file-scoped verify commands.** Give a fast way to check one file/test
  so the agent can validate its own change cheaply. *(GitHub study.)*
- **Use a few short real code snippets.** 3-10 line examples from your codebase
  beat explanations; they raised code-reuse ~+20%. *(Augment.)*
- **Pair every boundary with a "do."** "Never edit an applied migration —
  add a new one." Pairing keeps the agent unblocked. *(GitHub study.)*
- **Write numbered workflows.** Step-by-step PR/release flows improved
  correctness ~+25%. *(Augment.)*
- **Use decision tables.** Small "if X, do Y" tables improved best-practice
  adherence ~+25%. *(Augment.)*
- **State the stack with versions.** Naming a tool (e.g. `uv`) makes agents use
  it ~1.6x more — so name the *right* one explicitly. *(ETH Zurich.)*
- **Use progressive disclosure with linked refs.** Keep the file short and link
  deeper docs; AGENTS.md itself is discovered ~100% of the time and linked refs
  >90%, but dir READMEs only ~40% and orphan docs <10%. Cap links ~10-15.
  *(Augment.)*
- **Nest per package in monorepos.** One `AGENTS.md` per package; the nearest
  file wins. See [nesting-monorepos.md](./nesting-monorepos.md).
- **Treat it as a living doc.** Update it when commands change; a stale command
  gets executed and wastes a run. *(ETH Zurich.)*
- **Always include "never commit secrets."** It is the most common helpful
  constraint across repos. *(GitHub study.)*

## DON'T

- **Don't auto-generate via `/init`.** LLM-generated files *reduced* task
  success ~3% and raised inference cost ~20-23%. Write it by hand. *(ETH
  Zurich.)*
- **Don't write vague platitudes.** "Write clean code," "be helpful," "follow
  best practices" add tokens and zero signal. *(GitHub study; philschmid.)*
- **Don't include long architecture/file-tour prose.** Detailed codebase
  overviews did **not** speed up file-finding, and architecture overload cut
  completeness ~-25%. *(ETH Zurich; Augment.)*
- **Don't exceed length budgets.** Aim 100-150 lines (some <60); gains reverse
  beyond ~300 lines. Target <300 lines hard. *(Augment; philschmid.)*
- **Don't stack 30+ naked "don'ts."** Excessive warnings made agents ~2x
  slower; pair each with a "do" instead. *(Augment.)*
- **Don't duplicate the README.** Link to it; don't restate it. *(philschmid.)*
- **Don't leave orphan, unlinked docs.** They are discovered <10% of the time —
  link every reference explicitly. *(Augment.)*
- **Don't introduce patterns not yet in the codebase.** Agents follow the file
  faithfully, so describing an aspirational pattern makes them implement it
  prematurely. *(ETH Zurich.)*
- **Don't add inferable detail.** Limit content to non-inferable specifics:
  custom tooling, unusual build commands, repo-specific rules. *(ETH Zurich.)*

## Length & byte budgets enforced by tools

- **OpenAI Codex** truncates `AGENTS.md` at **32 KiB (32768 bytes)** by default
  (`project_doc_max_bytes`).
- **Windsurf / Cascade** caps **6,000 chars per file** and **12,000 chars
  total**.

Keeping files to ~100-150 lines stays comfortably under all of these.

## Caveats on the evidence

- The **GitHub 2,500-repo blog** is a pattern piece, not a controlled study —
  cite it for patterns, not proof.
- **ETH Zurich's AGENTbench** (arXiv:2602.11988, 138 issues across 12 repos)
  is a benchmark; human-written files helped only ~+4%, so the realistic goal
  is "don't hurt" more than "big win." The strongest finding is that agents
  follow files literally, which is why accuracy matters more than volume.
- **Augment's AuggieBench** is a golden-PR eval; treat the percentage deltas as
  directional, stack-dependent signals.

## The one-paragraph version

Lead with exact commands and flags, add a couple of short real code snippets,
pair every "never" with a "do," keep it to ~100-150 non-inferable lines, link
(don't inline) deeper docs, nest per package, never auto-generate, and never
commit secrets.
```

- [ ] **Step 2: Lint.**
  - Run: `bunx markdownlint-cli2 docs/best-practices.md`
  - Expected PASS: `Summary: 0 error(s)`.

- [ ] **Step 3: Commit.**
```bash
git add docs/best-practices.md
git commit -m "$(cat <<'EOF'
docs(handbook): add best-practices.md

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 22: Handbook — nesting-monorepos.md

**Files:**
- Create: `docs/nesting-monorepos.md`

- [ ] **Step 1: Create `docs/nesting-monorepos.md` with COMPLETE content.**
```markdown
# Nesting & Monorepos

In a monorepo you place an `AGENTS.md` at the repo root **and** additional
nested `AGENTS.md` files inside packages. This page explains the resolution
rule, how to structure nested files, and when to split.

## The nearest-file-in-tree rule

When an agent works on a file, it uses the **closest** `AGENTS.md` walking up
the directory tree from that file. More specific (deeper) files win over the
root. A user's chat prompt overrides every file.

```text
repo/
  AGENTS.md                 <- root: shared, cross-cutting rules
  packages/
    core/
      AGENTS.md             <- applies to packages/core/**
      src/index.ts          <- agent uses packages/core/AGENTS.md (nearest)
    web/
      AGENTS.md             <- applies to packages/web/**
  apps/
    admin/
      AGENTS.md             <- applies to apps/admin/**
```

Tool-specific nuances (see [COMPATIBILITY.md](../COMPATIBILITY.md)):

- **OpenAI Codex** concatenates root-down with closer files overriding, allows
  at most one file per directory, and supports `AGENTS.override.md`.
- **Cursor** combines a file with its parents, more specific winning.
- **Windsurf/Cascade** treats a root file as always-on and subdir files as
  glob-scoped.
- **Zed** uses **first-match** priority, not merge — a stray vendor rules file
  in a subdir can shadow that subdir's `AGENTS.md`.

## How to structure nested files

- **Root file = shared rules only.** Workspace tooling, cross-package import
  rules, commit conventions, "never commit secrets."
- **Package file = package specifics.** The package's own build/test commands
  and any local conventions an agent cannot infer.
- **Do not duplicate** root rules into every package — that is just bloat the
  agent re-reads at every directory.

A minimal nested file can be tiny:

```markdown
# AGENTS.md
Payments service. Commands: `pnpm --filter @acme/payments dev|test|build`.
Tests: contract tests in `test/contract/`. Never call Stripe live keys in tests.
```

## Real-world scale: OpenAI's 88 files

OpenAI's own monorepo reportedly ships around **88 `AGENTS.md` files** — one
near each meaningful unit of work. The lesson is not "write 88 files," it is
that nested files scale linearly with the number of *distinct toolchains and
conventions*, while each individual file stays short and local.

## When to split into a nested file

Add a nested `AGENTS.md` when a directory has:

- **Different commands** (its own test runner, build step, or package manager).
- **Different conventions** the root file does not cover (a service with strict
  contract tests, a package with a different language).
- **Different boundaries** (e.g. "never call the live payment API here").

Do **not** add a nested file when:

- The package follows the root rules unchanged (just rely on the root).
- You would only be repeating the root file (duplication, not signal).
- The "difference" is inferable from config the agent already reads.

## Checklist

- [ ] Root file holds only shared, cross-cutting rules.
- [ ] Each distinct toolchain/convention has its own short nested file.
- [ ] No nested file duplicates the root.
- [ ] No stray `.cursorrules`/`.windsurfrules` left in a subdir that could
      shadow `AGENTS.md` under first-match tools like Zed.
- [ ] Every nested file is still ~60-150 lines or less.
```

- [ ] **Step 2: Lint.**
  - Run: `bunx markdownlint-cli2 docs/nesting-monorepos.md`
  - Expected PASS: `Summary: 0 error(s)`.

- [ ] **Step 3: Commit.**
```bash
git add docs/nesting-monorepos.md
git commit -m "$(cat <<'EOF'
docs(handbook): add nesting-monorepos.md

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 23: Handbook — common-mistakes.md

**Files:**
- Create: `docs/common-mistakes.md`

- [ ] **Step 1: Create `docs/common-mistakes.md` with COMPLETE content.**
```markdown
# Common AGENTS.md Mistakes

The anti-patterns that make an `AGENTS.md` neutral or harmful. Each entry
states the mistake, why it hurts, and the fix. See
[best-practices.md](./best-practices.md) for the positive version and sources.

## 1. Auto-generating with `/init`

**Mistake:** Running an agent's `/init` (or similar) and committing whatever it
produces.

**Why it hurts:** In ETH Zurich's AGENTbench, LLM-generated files *reduced*
task success ~3% and raised inference cost ~20-23%. The generated content is
mostly inferable codebase description that agents do not need — and because
agents follow the file faithfully, every wrong line is executed.

**Fix:** Write it by hand. Limit content to non-inferable specifics: custom
tooling, unusual build commands, and repo-specific rules.

## 2. Vague platitudes

**Mistake:** "Write clean code," "be helpful," "follow best practices,"
"use good naming."

**Why it hurts:** Zero actionable signal, pure token cost. The agent already
"knows" these and cannot act on them differently.

**Fix:** Replace with concrete, checkable rules: "Run `pnpm lint` before
committing," "Validate request bodies with Zod at the boundary."

## 3. Length bloat

**Mistake:** A 400-line file with a full architecture tour and a file-by-file
directory listing.

**Why it hurts:** Augment found the sweet spot at 100-150 lines with gains
reversing beyond ~300; architecture overload cut completeness ~-25%. ETH Zurich
found detailed overviews do **not** speed file-finding. Tools also truncate:
Codex at 32 KiB, Windsurf at 6,000 chars/file (12,000 total).

**Fix:** Target ~100-150 lines. Cut the architecture essay; link a short
`docs/architecture.md` instead.

## 4. A wall of naked "don'ts"

**Mistake:** 30+ standalone prohibitions with no guidance on what to do.

**Why it hurts:** Excessive warnings made agents ~2x slower in Augment's eval,
and a "never" with no "do" can leave the agent stuck.

**Fix:** Keep boundaries few and **pair each with a "do":** "Never edit an
applied migration — add a new one instead."

## 5. Orphan, unlinked docs

**Mistake:** Putting important guidance in a `docs/` file that nothing links to.

**Why it hurts:** Doc-discovery rates: `AGENTS.md` ~100%, explicitly linked
refs >90%, directory READMEs ~40%, **orphan docs <10%**. Unlinked docs are
effectively invisible to the agent.

**Fix:** Link every reference doc explicitly from `AGENTS.md`, and cap the
number of links to ~10-15.

## 6. Duplicating the README

**Mistake:** Copying the README's intro, install steps, and feature list into
`AGENTS.md`.

**Why it hurts:** Double maintenance and double tokens; the two drift apart and
the agent reads stale duplicates.

**Fix:** Link to the README for human-facing context; keep `AGENTS.md` focused
on agent-actionable commands, rules, and boundaries.

## 7. Describing patterns not yet in the codebase

**Mistake:** Documenting an aspirational architecture ("we use CQRS
everywhere") the code does not actually follow yet.

**Why it hurts:** Agents follow the file faithfully and will implement the
described-but-absent pattern prematurely, creating inconsistency.

**Fix:** Document only what the codebase does today. Update the file when the
pattern actually lands.

## 8. Wrong filename or wrong location

**Mistake:** `agents.md`, `Agents.md`, `AGENT.md`, or burying it in a subfolder
when it should be at the root.

**Why it hurts:** The name must be exactly `AGENTS.md` (uppercase `AGENTS`,
lowercase `.md`) at the repo root; native tools look for that exact name.
Note Zed's first-match order also recognizes a singular `AGENT.md` — but the
portable, standard choice is `AGENTS.md`.

**Fix:** Name it exactly `AGENTS.md` at the repo root; add nested `AGENTS.md`
files per package as needed.

## 9. Stale commands

**Mistake:** Leaving a command in the file after the script was renamed or
removed.

**Why it hurts:** Agents auto-execute listed commands; a stale command fails
the run or does the wrong thing, wasting a whole attempt.

**Fix:** Treat `AGENTS.md` as a living doc. When you change a script, update
the file in the same PR — and lint it (e.g. with `agents-md-lint`) in CI.
```

- [ ] **Step 2: Lint.**
  - Run: `bunx markdownlint-cli2 docs/common-mistakes.md`
  - Expected PASS: `Summary: 0 error(s)`.

- [ ] **Step 3: Commit.**
```bash
git add docs/common-mistakes.md
git commit -m "$(cat <<'EOF'
docs(handbook): add common-mistakes.md

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 24: CONTRIBUTING.md

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Create `CONTRIBUTING.md` with COMPLETE content.**
```markdown
# Contributing to agents-md-cookbook

Thanks for helping make `AGENTS.md` better for everyone. The two highest-value
contributions are **new templates** and **compatibility-matrix corrections**.

## Ground rules

- The default branch is `develop`; open PRs against it.
- This is a **bun workspace**. Use `bun` / `bunx` for development. (Published
  CLIs also work via `npx` for end users.)
- Every Markdown file is content-linted and link-checked in CI. Run the checks
  locally before pushing (see below).

## Local setup

```bash
git clone https://github.com/Taiizor/agents-md-cookbook.git
cd agents-md-cookbook
bun install
bun run lint:md           # markdownlint over all Markdown
bun run lint:md:fix       # auto-fix what is fixable
```

## Adding a template

1. Create a directory under `templates/<stack>/` and a single file named exactly
   `AGENTS.md` inside it (uppercase `AGENTS`, lowercase `.md`).
2. Follow the **template style bar** below.
3. Add a row to the Templates table in [README.md](./README.md).
4. Run `bun run lint:md` and fix any issues.
5. Open a PR using the [new-template issue](./.github/ISSUE_TEMPLATE/new-template.md)
   as the basis for your description.

### Template style bar (required)

Every template must:

- [ ] Be **60-150 lines** (the `minimal` template may be shorter).
- [ ] Put **commands early**, with real flags, that work copy-pasted.
- [ ] Use the **correct package manager / test runner** for the ecosystem
      (e.g. `uv` for Python, `cargo nextest` for Rust, `./mvnw` for Maven).
- [ ] Include **1-2 short real code snippets** (3-10 lines), not prose essays.
- [ ] Have a **Security / Boundaries** section that includes
      **"never commit secrets"** and pairs each "never" with a "do."
- [ ] State the **stack with versions**.
- [ ] **Avoid** vague platitudes and long architecture/file-tour prose.

These rules come from the evidence in
[docs/best-practices.md](./docs/best-practices.md). When `agents-md-lint`
lands, it will enforce most of them automatically; until then, reviewers check
by hand.

## Updating the compatibility matrix

1. Edit [COMPATIBILITY.md](./COMPATIBILITY.md).
2. Keep the column structure (Tool | Reads AGENTS.md? | Mechanism | Own/primary
   file | Nested/monorepo | Notes | Source).
3. **Cite a primary source** (official docs, changelog, or issue) in the Source
   column.
4. Bump the "Last verified" date at the top.
5. Open a PR using the
   [compatibility-update issue](./.github/ISSUE_TEMPLATE/compatibility-update.md).

## Editing the handbook

`docs/*.md` should stay evidence-backed. If you add a claim, cite the source
(GitHub study, ETH Zurich AGENTbench, Augment AuggieBench, philschmid, or
official tool docs). Keep examples short and runnable.

## Commit & PR conventions

- Use **Conventional Commits**: `feat(templates): add svelte AGENTS.md`,
  `fix(compat): correct Zed priority order`, `docs(handbook): ...`.
- Keep commits small and focused (one template or one logical change per PR).
- Fill in the [pull request template](./.github/pull_request_template.md).
- A PR is mergeable when CI (link check + content lint) is green and a
  maintainer approves.

## Code of conduct

Be respectful and constructive. Assume good faith; review the work, not the
person.
```

- [ ] **Step 2: Lint.**
  - Run: `bunx markdownlint-cli2 CONTRIBUTING.md`
  - Expected PASS: `Summary: 0 error(s)`.

- [ ] **Step 3: Commit.**
```bash
git add CONTRIBUTING.md
git commit -m "$(cat <<'EOF'
docs: add CONTRIBUTING guide

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 25: GitHub PR + issue templates

**Files:**
- Create: `.github/pull_request_template.md`
- Create: `.github/ISSUE_TEMPLATE/new-template.md`
- Create: `.github/ISSUE_TEMPLATE/compatibility-update.md`

- [ ] **Step 1: Create `.github/pull_request_template.md` with COMPLETE content.**
```markdown
## What does this PR do?

<!-- One or two sentences. Link any related issue: Closes #123. -->

## Type of change

- [ ] New template (`templates/<stack>/AGENTS.md`)
- [ ] Compatibility matrix update (`COMPATIBILITY.md`)
- [ ] Handbook / docs change (`docs/**`, `README.md`)
- [ ] Tooling / CI change
- [ ] Other

## Checklist

- [ ] `bun run lint:md` passes locally.
- [ ] Links resolve (no broken internal/external links).
- [ ] If a **template**: it follows the style bar in
      [CONTRIBUTING.md](../CONTRIBUTING.md) (60-150 lines, commands first,
      real flags, 1-2 code snippets, "never commit secrets," do-paired-with-don't,
      stack with versions).
- [ ] If a **template**: added a row to the Templates table in `README.md`.
- [ ] If a **compatibility change**: cited a primary source and bumped the
      "Last verified" date.
- [ ] Commits use Conventional Commits.

## Notes for reviewers

<!-- Anything that needs explaining: tradeoffs, open questions, follow-ups. -->
```

- [ ] **Step 2: Create `.github/ISSUE_TEMPLATE/new-template.md` with COMPLETE content.**
```markdown
---
name: New template request
about: Request or propose a new AGENTS.md template for a stack
title: "templates: add <stack> AGENTS.md"
labels: ["template", "good first issue"]
assignees: []
---

## Stack

<!-- Language + framework + version, e.g. "Svelte 5 + SvelteKit" -->

## Toolchain details (so the template is correct)

- Package manager / dependency tool:
- Build command:
- Test runner + run command:
- Lint / format command:
- Anything non-inferable an agent must know:

## Why this stack?

<!-- Popularity, requests, gap in the current template set. -->

## Are you submitting a PR?

- [ ] Yes — I will follow the style bar in
      [CONTRIBUTING.md](../../CONTRIBUTING.md).
- [ ] No — requesting that a maintainer or contributor write it.

## Style bar reminder

The template must be 60-150 lines, lead with commands + real flags, use the
correct package manager/test runner, include 1-2 short real code snippets, have
a Security/Boundaries section with "never commit secrets" (each "never" paired
with a "do"), and state the stack with versions.
```

- [ ] **Step 3: Create `.github/ISSUE_TEMPLATE/compatibility-update.md` with COMPLETE content.**
```markdown
---
name: Compatibility update
about: Report a correction or new tool for the AGENTS.md compatibility matrix
title: "compat: update <tool>"
labels: ["compatibility"]
assignees: []
---

## Tool

<!-- e.g. "Cursor", "OpenAI Codex", "Zed" -->

## What is wrong or missing?

<!-- Describe the change to the row(s) in COMPATIBILITY.md. -->

## Proposed values

| Field | Value |
| --- | --- |
| Reads AGENTS.md? | <!-- NATIVE / CONFIG / ADAPTER / NO --> |
| Mechanism | |
| Own / primary file | |
| Nested / monorepo | |
| Notes | |

## Primary source (required)

<!-- Link to official docs, a changelog entry, or an issue. We do not accept
matrix changes without a citation. -->

## Verified on

<!-- Date you confirmed this behavior, and tool version if relevant. -->
```

- [ ] **Step 4: Lint all three GitHub Markdown files.**
  - Run: `bunx markdownlint-cli2 ".github/**/*.md"`
  - Expected PASS: `Summary: 0 error(s)`.

- [ ] **Step 5: Commit the GitHub templates.**
```bash
git add .github/pull_request_template.md .github/ISSUE_TEMPLATE/new-template.md .github/ISSUE_TEMPLATE/compatibility-update.md
git commit -m "$(cat <<'EOF'
chore(github): add PR and issue templates

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 26: CI workflow (link check + linter seam)

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml` with COMPLETE content.**
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

  # --- Integration seam: filled in by the linter plan ---------------------
  # The agents-md-lint package (packages/linter) is added by a separate plan.
  # Once it exists, append a job here that self-dogfoods our own linter over
  # every template, e.g.:
  #
  # dogfood:
  #   name: Lint our own templates with agents-md-lint
  #   runs-on: ubuntu-latest
  #   steps:
  #     - uses: actions/checkout@v4
  #     - uses: oven-sh/setup-bun@v2
  #       with:
  #         bun-version: latest
  #     - run: bun install --frozen-lockfile
  #     - run: bunx agents-md-lint templates/**/AGENTS.md
  # ------------------------------------------------------------------------
```

- [ ] **Step 2: Validate the YAML parses and the link check works locally.**
  - Run (YAML well-formedness): `bunx js-yaml .github/workflows/ci.yml > /dev/null && echo "yaml-ok"`
  - Expected PASS: prints `yaml-ok` (exit 0).
  - Run (local link check, mirrors the CI step): `docker run --rm -v "$PWD:/input" lycheeverse/lychee --no-progress --exclude-mail "/input/**/*.md"`
  - Expected PASS: lychee summary reports `0 errors` across all Markdown files (exit 0). If Docker is unavailable, rely on the CI run instead.

- [ ] **Step 3: Commit the CI workflow.**
```bash
git add .github/workflows/ci.yml
git commit -m "$(cat <<'EOF'
ci: add markdown lint + link check workflow

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 27: Full-repo verification pass

**Files:**
- Modify: (none — verification only; fix any file flagged below)

- [ ] **Step 1: Run the content linter across the whole repo.**
  - Run: `bun run lint:md`
  - Expected PASS: `Summary: 0 error(s)` over every Markdown file. Fix any file the linter flags, then re-run until clean.

- [ ] **Step 2: Confirm every template exists and is named exactly `AGENTS.md`.**
  - Run (Bash tool): `ls templates/*/AGENTS.md | wc -l`
  - Expected PASS: prints `15` (one `AGENTS.md` per template stack).

- [ ] **Step 3: Confirm template line counts are within budget.**
  - Run (Bash tool): `wc -l templates/*/AGENTS.md`
  - Expected PASS: each non-minimal template is 60-150 lines; `templates/minimal/AGENTS.md` is under 40.

- [ ] **Step 4: Run the link check locally (or confirm the CI job is green).**
  - Run: `docker run --rm -v "$PWD:/input" lycheeverse/lychee --no-progress --exclude-mail "/input/**/*.md"`
  - Expected PASS: `0 errors`. If Docker is unavailable, push the branch and confirm the CI `markdown` job passes.

- [ ] **Step 5: Confirm the working tree is clean (all work committed).**
  - Run: `git status --porcelain`
  - Expected PASS: empty output (nothing uncommitted, nothing untracked).

- [ ] **Step 6 (only if Step 1 or 4 required fixes): commit the fixes.**
```bash
git add -A
git commit -m "$(cat <<'EOF'
docs: fix markdown lint and link-check findings

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```
```
