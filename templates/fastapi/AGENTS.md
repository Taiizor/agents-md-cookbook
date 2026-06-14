# AGENTS.md

FastAPI service. Replace the bracketed bits with your project's details.

## Stack

- Python 3.12, FastAPI + Uvicorn, Pydantic v2.
- Dependency/runner: **uv**. Lint: Ruff. Type check: mypy. Tests: pytest.

## Setup

```bash
uv sync                 # create .venv and install deps
cp .env.example .env    # local config; never commit .env
```

## Commands

```bash
uv run uvicorn app.main:app --reload     # dev server (http://localhost:8000)
uv run pytest -q                         # run all tests
uv run pytest tests/test_orders.py -v    # one test file
uv run ruff check . && uv run ruff format .   # lint + format
uv run mypy app                          # type check
```

Interactive docs are served at `/docs` when the app is running.

## Code style

- Define request/response models with Pydantic; let FastAPI validate at the edge.
- Inject shared resources (db sessions, clients) with `Depends`, not globals.
- Use `async def` handlers and async DB drivers consistently.

Example — a typed, validated endpoint:

```python
from fastapi import APIRouter, Depends
from pydantic import BaseModel

router = APIRouter()

class OrderIn(BaseModel):
    sku: str
    qty: int

@router.post("/orders")
async def create_order(body: OrderIn, db=Depends(get_db)):
    return await db.create_order(body.sku, body.qty)
```

## Testing

- Tests in `tests/`; use `httpx.AsyncClient` against the ASGI app.
- A change is done when `uv run ruff check .`, `uv run mypy app`, and
  `uv run pytest -q` all pass.
- Add a failing test first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `chore:`).
3. Before pushing: `uv run ruff check . && uv run mypy app && uv run pytest -q`.
4. PR description: one-line summary + the test command you ran.

## Boundaries

- **Do** read `.env.example` for config; **never** commit secrets or `.env`.
- **Do** add an Alembic migration for schema changes; **never** edit an applied
  migration.
- **Do** edit `app/**`; **ask first** before changing dependency injection
  wiring or `pyproject.toml` deps.
- **Never** disable Pydantic validation or accept raw `dict` request bodies to
  "save time."

## More

- Service layout & dependencies: `docs/architecture.md`.
