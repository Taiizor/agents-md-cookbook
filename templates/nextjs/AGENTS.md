# AGENTS.md

Next.js app (App Router). Replace the bracketed bits with your details.

## Stack

- Next.js 14 (App Router), React 18, TypeScript strict.
- Package manager: **pnpm 9**. Tests: Vitest (unit) + Playwright (e2e).
- Lint/format: ESLint (next config) + Prettier.

## Setup

```bash
pnpm install
cp .env.example .env.local   # Next reads .env.local; never commit it
```

## Commands

```bash
pnpm dev               # next dev (http://localhost:3000)
pnpm build             # next build (also type-checks)
pnpm start             # serve the production build
pnpm test              # vitest run
pnpm test:e2e          # playwright test
pnpm lint              # next lint
pnpm typecheck         # tsc --noEmit
```

## Code style

- Default to **Server Components**; add `"use client"` only when you need state,
  effects, or browser APIs.
- Fetch data in server components / route handlers; never expose secrets to the
  client bundle (only `NEXT_PUBLIC_*` vars reach the browser).
- Co-locate components with their route segment under `app/`.

Example — a server component fetching data:

```tsx
// app/orders/page.tsx (Server Component by default)
export default async function OrdersPage() {
  const orders = await db.order.findMany({ take: 20 }); // runs on the server
  return <OrderList orders={orders} />;
}
```

## Testing

- Unit tests as `*.test.tsx` beside components; e2e specs under `e2e/`.
- A change is done when `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass;
  run `pnpm test:e2e` for routing/flow changes.
- Add a failing test first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `chore:`).
3. Before pushing: `pnpm lint && pnpm typecheck && pnpm test`.
4. PR description: one-line summary + the test command you ran.

## Boundaries

- **Do** put browser-safe config in `NEXT_PUBLIC_*`; **never** reference a
  server-only secret inside a `"use client"` component.
- **Do** edit `app/**` and `components/**`; **ask first** before changing
  `next.config.js`, middleware, or auth.
- **Do** read `.env.example`; **never** commit `.env.local` or secrets.
- **Never** disable ESLint rules inline to ship; fix the cause.

## More

- Routing & data conventions: `docs/architecture.md`.
