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
