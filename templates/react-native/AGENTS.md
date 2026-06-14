# AGENTS.md

React Native (Expo) mobile app. Replace the bracketed bits with your details.

## Stack

- Expo SDK 51, React Native 0.74, TypeScript strict, Expo Router.
- Package manager: **pnpm 9**. Tests: Jest + React Native Testing Library.
- Lint/format: ESLint + Prettier.

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

- **Do** put public config in `EXPO_PUBLIC_*`; **never** ship an API secret in
  the client bundle or commit `.env`.
- **Do** edit `app/**` and `components/**`; **ask first** before changing
  `app.json`/`app.config.ts`, native modules, or EAS build config.
- **Do** keep `ios/` and `android/` generated; **never** hand-edit native
  folders if the project uses Expo prebuild.
- **Never** disable ESLint inline just to pass CI; fix the cause.

## More

- Navigation & state conventions: `docs/architecture.md`.
