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
- uses: Taiizor/agents-md-cookbook@v1
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

Rule IDs in the `AGM-`/`XP-` namespaces are reused from the prior-art [agnix](https://github.com/agent-sh/agnix) taxonomy for interoperability; `AMC-` IDs are specific to this kit.

## Scoring

Each file gets a 0-100 score and a letter grade (A >= 90, B >= 80, C >= 70, D >= 60, else F). The score starts at 100, subtracts per-finding penalties, adds points for positive signals (build+test commands, commands early, boundaries + security, "never commit secrets", paired do/don't, 1-3 short examples, version pins, links within budget, ideal 50-150 line length), and subtracts for negative signals (over-length, platitudes, large architecture prose, too many links/examples, auto-generated markers, README duplication).

## License

MIT — part of [agents-md-cookbook](https://github.com/Taiizor/agents-md-cookbook).
