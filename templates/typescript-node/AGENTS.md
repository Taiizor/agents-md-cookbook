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
