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
