# AGENTS.md

[One sentence: what this project is and what stack it uses.]

## Commands

```bash
<install-command>     # e.g. pnpm install / uv sync / bundle install
<run-command>         # start the app locally
<test-command>        # run the test suite
<lint-command>        # lint + format
```

## Code style

- [Point to the linter/formatter; let it be the source of truth.]
- [One or two project-specific rules an agent could not infer.]

## Testing

- A change is done when `<lint-command>` and `<test-command>` both pass.
- Add a failing test first, then make it pass.

## Boundaries

- **Do** read `.env.example` for required config; **never** commit secrets or `.env`.
- **Do** edit source code; **ask first** before changing dependencies or CI.
- **Never** disable lint/type errors to make CI pass — fix the cause.
