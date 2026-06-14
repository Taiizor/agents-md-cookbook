# AGENTS.md

[One sentence: what this project is and what stack it uses.]

## Stack

- Node.js 20.x LTS (swap in your runtime, e.g. Python 3.12 / Go 1.22).
- Use the lockfile's package manager; do not switch managers mid-project.

## Commands

Run these from the repo root. Agents may execute them, so they must work as-is.

```bash
npm install          # install dependencies
npm run dev          # start the app locally
npm test             # run the test suite
npm run lint         # lint + format
```

## Code style

- Point to the linter/formatter and let it be the source of truth.
- Add one or two project-specific rules an agent could not infer.

## Testing

- A change is done when `npm run lint` and `npm test` both pass.
- Add a failing test first, then make it pass.

## Project Structure

- `src/` — application source code.
- `tests/` — test suite, mirrors `src/`.
- `package.json` — scripts and dependencies.
- `.env.example` — required config keys (copy to `.env` locally).

## Git Workflow

- Branch from `main`: `git switch -c feat/<short-name>`.
- Keep commits small and use a clear, imperative subject line.
- Before pushing, run `npm run lint && npm test`.

## Boundaries

- Always: read `.env.example` for required config and edit source under `src/`.
- Always: run `npm run lint && npm test` before opening a pull request.
- Ask first: before adding/removing dependencies or changing CI config.
- Never: commit secrets or `.env` — use `.env.example` for shared keys instead.
- Never: disable lint/type errors to make CI pass — fix the cause instead.
