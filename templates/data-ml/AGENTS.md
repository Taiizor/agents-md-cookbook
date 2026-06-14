# AGENTS.md

Data science / ML project. Replace the bracketed bits with your details.

## Stack

- Python 3.12, pandas/polars + scikit-learn/PyTorch.
- Dependency/runner: **uv**. Lint/format: Ruff. Tests: pytest.
- Experiment tracking: MLflow. Notebooks live in `notebooks/`.

## Project Structure

- `src/` — reusable pipeline, training, and feature code (imported by notebooks).
- `notebooks/` — exploratory analysis; `configs/*.yaml` — experiment configs.
- `tests/` — pytest suite for transforms/features; `data/` — local data (gitignored).
- `pyproject.toml` — deps and tooling; `docs/architecture.md` — data lineage.

## Setup

```bash
uv sync                 # create .venv and install deps
cp .env.example .env    # API keys / data paths; never commit .env
```

## Commands

```bash
uv run jupyter lab                       # exploratory notebooks
uv run python -m src.train --config configs/baseline.yaml   # train a model
uv run python -m src.evaluate --run-id <id>                 # evaluate a run
uv run pytest -q                         # run all tests
uv run ruff check . && uv run ruff format .   # lint + format
uv run nbstripout notebooks/*.ipynb      # strip notebook outputs before commit
```

## Code style

- Put reusable logic in `src/` modules; notebooks should import from `src`,
  not redefine pipeline code.
- Set and log random seeds for reproducibility; pin data versions.
- Keep configs in `configs/*.yaml`; do not hardcode hyperparameters in code.

Example — a seeded, reproducible split:

```python
from sklearn.model_selection import train_test_split

def split(df, *, seed: int = 42):
    return train_test_split(df, test_size=0.2, random_state=seed, shuffle=True)
```

## Testing

- Test data transforms and feature code in `tests/`; assert on shapes/dtypes.
- A change is done when `uv run ruff check .` and `uv run pytest -q` pass and
  notebook outputs are stripped.
- Add a failing test first for any reusable transform (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c exp/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `exp:`).
3. Before pushing: `uv run nbstripout notebooks/*.ipynb && uv run ruff check . && uv run pytest -q`.
4. PR: one-line summary + metrics + the config/run id you used.

## Boundaries

- Always: keep large data out of git via the configured data store/DVC, and
  reference datasets/weights by path or version id instead of committing them.
- Always: strip notebook outputs before committing and edit `src/**` and
  `configs/**` freely.
- Always: split train/val/test before fitting and fit transforms on the train
  split only, so target columns never leak into features.
- Ask first: before changing the data schema or deleting an MLflow experiment.
- Never: commit secrets (`.env`, API keys), raw datasets, model weights, or a
  notebook with PII in cell output.
- Never: train on the test split or leak target columns into features.

## More

- Pipeline & data lineage: `docs/architecture.md`.
