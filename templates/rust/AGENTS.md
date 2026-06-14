# AGENTS.md

Rust crate/workspace. Replace the bracketed bits with your project's details.

## Stack

- Rust 1.79 stable (pinned in `rust-toolchain.toml`), 2021 edition.
- Build/test: Cargo 1.79 (+ cargo-nextest 0.9). Lint: Clippy. Format: rustfmt.

## Project Structure

- `src/` — crate source (`main.rs` for binaries, `lib.rs` for libraries).
- `tests/` — integration tests; unit tests live in `#[cfg(test)]` modules.
- `Cargo.toml` / `Cargo.lock` — dependencies and the pinned dependency graph.
- `rust-toolchain.toml` — pinned compiler version for reproducible builds.

## Setup

```bash
rustup show             # confirm the pinned toolchain is installed
cargo fetch             # download dependencies
```

## Commands

```bash
cargo run               # run the default binary
cargo build             # debug build
cargo build --release   # optimized build
cargo nextest run       # run all tests (fast); or: cargo test
cargo test some_test    # run one test by name substring
cargo clippy --all-targets -- -D warnings   # lint, warnings = errors
cargo fmt --all         # format
```

## Code style

- Code must be `cargo fmt`-clean and `clippy`-clean (warnings denied in CI).
- Prefer `Result<T, E>` + `?` over `.unwrap()`/`.expect()` outside tests and
  `main`.
- Use `thiserror` for library error enums; avoid stringly-typed errors.

Example — fallible parsing with `?`:

```rust
use std::path::Path;

pub fn load(path: &Path) -> Result<Config, ConfigError> {
    let text = std::fs::read_to_string(path)?;       // io::Error -> ConfigError
    let cfg: Config = toml::from_str(&text)?;        // de::Error -> ConfigError
    Ok(cfg)
}
```

## Testing

- Unit tests in `#[cfg(test)]` modules; integration tests in `tests/`.
- A change is done when `cargo clippy -- -D warnings`, `cargo fmt --check`,
  and `cargo nextest run` all pass.
- Add a failing test first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `chore:`).
3. Before pushing: `cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo nextest run`.
4. PR description: one-line summary + the test command you ran.

## Boundaries

- Always: edit crate source freely and keep it `fmt`-clean and `clippy`-clean.
- Always: keep `unsafe` blocks tiny and documented with a `// SAFETY:` comment.
- Always: read `.env.example` to discover required configuration.
- Ask first: add or upgrade a dependency via `cargo add` (it edits
  `Cargo.toml`/`Cargo.lock`).
- Ask first: bump the pinned toolchain in `rust-toolchain.toml`.
- Never: add `unsafe` to silence the borrow checker.
- Never: commit a `#[allow(...)]` added only to pass CI; fix the lint instead.
- Never commit secrets or `.env`.

## More

- Crate/module layout: `docs/architecture.md`.
