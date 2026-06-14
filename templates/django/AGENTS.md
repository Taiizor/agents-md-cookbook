# AGENTS.md

Django web application. Replace the bracketed bits with your details.

## Stack

- Python 3.12, Django 5.0.
- Dependency/runner: **uv**. Lint/format: Ruff. Tests: pytest + pytest-django.

## Setup

```bash
uv sync                       # create .venv and install deps
cp .env.example .env          # local config; never commit .env
uv run python manage.py migrate   # apply DB migrations
```

## Commands

```bash
uv run python manage.py runserver        # dev server (http://localhost:8000)
uv run pytest -q                         # run all tests
uv run pytest path/to/test_views.py -v   # one test file
uv run python manage.py makemigrations   # create migrations for model changes
uv run python manage.py migrate          # apply migrations
uv run ruff check . && uv run ruff format .   # lint + format
```

## Code style

- Keep views thin; put business logic in services or model methods, not views.
- Always use the ORM with parameterized queries; never build SQL with f-strings.
- Use `select_related`/`prefetch_related` to avoid N+1 queries.

Example — a thin view delegating to the model layer:

```python
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from .models import Order

def order_detail(request, pk):
    order = get_object_or_404(Order.objects.select_related("customer"), pk=pk)
    return JsonResponse(order.to_dict())
```

## Testing

- Tests live in each app's `tests/` package; use `pytest-django` fixtures.
- A change is done when `uv run ruff check .` and `uv run pytest -q` pass.
- Add a failing test first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `chore:`).
3. Before pushing: `uv run ruff check . && uv run pytest -q`.
4. PR: one-line summary + the test command you ran + any new migrations.

## Boundaries

- **Do** read `.env.example` and `settings.py` for config; **never** commit
  `SECRET_KEY`, `.env`, or real credentials.
- **Do** run `makemigrations` when models change; **never** edit an applied
  migration — add a new one.
- **Do** edit app code; **ask first** before changing `settings.py`,
  middleware, or installed apps.
- **Never** set `DEBUG = True` in committed settings or expose admin without auth.

## More

- App structure & domain layout: `docs/architecture.md`.
