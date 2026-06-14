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
