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
