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
