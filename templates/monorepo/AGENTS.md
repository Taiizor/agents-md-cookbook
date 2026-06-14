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
