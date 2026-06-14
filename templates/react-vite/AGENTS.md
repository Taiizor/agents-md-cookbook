# AGENTS.md

React SPA built with Vite. Replace the bracketed bits with your details.

## Stack

- React 18 + TypeScript strict, bundled by Vite 5. Runtime: Node 20.x.
- Package manager: **pnpm 9.x**. Tests: Vitest + Testing Library.
- Lint/format: ESLint + Prettier.

## Project Structure

- `src/` — components, hooks, and the typed API client in `src/api/`.
- `src/main.tsx` / `index.html` — Vite entry point and HTML shell.
- `*.test.tsx` — tests co-located next to the code they cover.
- `vite.config.ts`, `tsconfig.json` — build and type config.
- `.env.example` — template for `VITE_`-prefixed client vars.

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

- Always use function components + hooks; class components are not allowed.
- Keep components pure; side effects go in `useEffect` or event handlers.
- Only `VITE_`-prefixed env vars reach the client, so always keep secrets
  out of any env var the bundle can read.

Example — a small, testable component:

```tsx
type Props = { items: string[] };

export function ItemList({ items }: Props) {
  if (items.length === 0) return <p>Empty list</p>;
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

- Always: edit code under `src/**` and call backends through the typed API
  client in `src/api/`.
- Always: keep secrets server-side and fix lint failures at the source.
- Always: run `pnpm lint && pnpm typecheck && pnpm test` before pushing.
- Ask first: before adding a runtime dependency or changing `vite.config.ts`,
  `tsconfig.json`, or other build config.
- Never: ship an API secret in a `VITE_*` var or disable ESLint inline to
  pass CI.
- Never commit secrets, including `.env`.

## More

- Component & state conventions: `docs/architecture.md`.
