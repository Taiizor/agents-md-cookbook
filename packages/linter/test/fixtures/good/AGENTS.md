# Project Overview

Small TypeScript service. Node 20.11, Bun 1.1.

## Setup commands
```bash
bun install --frozen-lockfile
```

## Build and test commands
```bash
bun test
bun run build
```

## Code style
Formatted by prettier; run `bun run lint` before committing.

## Git workflow
Conventional commits; open a PR against develop.

## Boundaries
- Always: run `bun test` before pushing.
- Ask first: changing the database schema.
- Never: commit secrets — use environment variables instead.
