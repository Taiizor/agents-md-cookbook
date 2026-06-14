# AGENTS.md

React Native (Expo) mobile app. Replace the bracketed bits with your details.

## Stack

- Expo SDK 51, React Native 0.74, TypeScript strict, Expo Router.
- Package manager: **pnpm 9**. Tests: Jest + React Native Testing Library.
- Lint/format: ESLint + Prettier.

## Project Structure

- `app/` — Expo Router routes (file-based navigation).
- `components/` — reusable UI components.
- `assets/` — images, fonts, and static files.
- `app.config.ts` — Expo app config; `package.json` — scripts & deps.
- `ios/`, `android/` — generated native projects (Expo prebuild).

## Setup

```bash
pnpm install
cp .env.example .env     # EXPO_PUBLIC_* vars only on the client; never commit .env
```

## Commands

```bash
pnpm start               # expo start (Metro bundler + dev menu)
pnpm ios                 # run on the iOS simulator
pnpm android             # run on an Android emulator
pnpm test                # jest
pnpm lint                # eslint . --max-warnings=0
pnpm typecheck           # tsc --noEmit
```

## Code style

- Function components + hooks; route files live under `app/` (Expo Router).
- Only `EXPO_PUBLIC_*` env vars are exposed to the app bundle — keep real
  secrets on the backend, never in the client.
- Use `StyleSheet.create` or the project's styling lib; avoid inline style soup.

Example — a typed screen component:

```tsx
import { View, Text } from "react-native";

type Props = { name: string };

export default function Greeting({ name }: Props) {
  return (
    <View>
      <Text>Hello, {name}</Text>
    </View>
  );
}
```

## Testing

- Co-locate tests as `*.test.tsx`; query by accessibility role/label.
- A change is done when `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- Add a failing test first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `chore:`).
3. Before pushing: `pnpm lint && pnpm typecheck && pnpm test`.
4. PR: one-line summary + the test command + which platforms you smoke-tested.

## Boundaries

- Always: edit `app/**` and `components/**`, and put public config in
  `EXPO_PUBLIC_*` so secrets stay on the backend.
- Always: regenerate `ios/`/`android/` via Expo prebuild instead of editing them.
- Always: fix the underlying lint error rather than suppressing it.
- Always: run `pnpm lint && pnpm typecheck && pnpm test` before opening a PR.
- Ask first: before changing `app.config.ts`, native modules, or EAS build config.
- Ask first: before adding a dependency that requires a native rebuild.
- Never: ship an API secret in the client bundle or hand-edit native folders.
- Never: disable ESLint inline just to pass CI.
- Never commit secrets.

## More

- Navigation & state conventions: `docs/architecture.md`.
