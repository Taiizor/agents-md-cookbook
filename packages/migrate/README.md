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
