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

## Project Structure

- `app/` — application package: `main.py` (ASGI app), `routers/`, `models/`.
- `app/deps.py` — shared `Depends` providers (db sessions, clients).
- `tests/` — pytest suites, mirroring `app/`.
- `migrations/` — Alembic migration scripts.
- `pyproject.toml` — deps, tool config (Ruff, mypy, pytest).

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

- Always: read `.env.example` for required config and use env vars for secrets.
- Always: edit `app/**` and add a new Alembic migration for schema changes.
- Always: validate input with Pydantic models at the edge; run the test suite
  before pushing.
- Ask first: changing dependency-injection wiring, `pyproject.toml` deps, or
  CI workflows.
- Ask first: editing an already-applied migration — prefer adding a new one.
- Never: commit secrets, `.env`, or real credentials.
- Never: disable Pydantic validation or accept raw `dict` request bodies.

## More

- Service layout & dependencies: `docs/architecture.md`.
