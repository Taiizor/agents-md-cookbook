# AGENTS.md

Generic Python project. Replace the bracketed bits with your project's details.

## Stack

- Python 3.12.
- Dependency/runner: **uv** (use `uv`, never bare `pip` in the project venv).
- Lint + format: Ruff. Type check: mypy. Tests: pytest.

## Setup

```bash
uv sync                 # create .venv and install deps from uv.lock
cp .env.example .env    # local config; never commit .env
```

## Commands

Run from the repo root via `uv run` so the project venv is used.

```bash
uv run python -m app          # run the app
uv run pytest -q              # run all tests, quiet
uv run pytest -v path/to/test_x.py::test_case   # one test, verbose
uv run ruff check .           # lint
uv run ruff format .          # format
uv run mypy src               # type check
```

## Code style

- Ruff is the source of truth; do not hand-format around it.
- Full type hints on public functions; prefer dataclasses over loose dicts.
- Raise specific exceptions; never `except:` bare.

Example — a typed, defensible function:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Item:
    id: str
    qty: int

def total_qty(items: list[Item]) -> int:
    if any(i.qty < 0 for i in items):
        raise ValueError("qty must be non-negative")
    return sum(i.qty for i in items)
```

## Testing

- Tests live in `tests/`, named `test_*.py`.
- A change is done when `uv run ruff check .`, `uv run mypy src`, and
  `uv run pytest -q` all pass.
- Add a failing test first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `chore:`); keep commits small.
3. Before pushing: `uv run ruff check . && uv run mypy src && uv run pytest -q`.
4. PR description: one-line summary + the exact test command you ran.

## Boundaries

- **Do** read `.env.example` for required config; **never** commit secrets,
  `.env`, or credentials.
- **Do** edit `src/**` and `tests/**`; **ask first** before changing
  `pyproject.toml` dependencies or CI workflows.
- **Do** add a new Alembic migration for schema changes; **never** edit an
  already-applied migration.
- **Never** silence type/lint errors with blanket `# type: ignore` or
  `# noqa`; fix the underlying issue.

## More

- Architecture notes: `docs/architecture.md`.
- Runbook: `docs/runbook.md`.
