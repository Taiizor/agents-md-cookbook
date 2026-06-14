# AGENTS.md

Rust crate/workspace. Replace the bracketed bits with your project's details.

## Stack

- Rust stable (pinned in `rust-toolchain.toml`), 2021 edition.
- Build/test: Cargo (+ cargo-nextest). Lint: Clippy. Format: rustfmt.

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

- **Do** edit crate source; **ask first** before adding a dependency with
  `cargo add` (it changes `Cargo.toml`/`Cargo.lock`).
- **Do** keep `unsafe` blocks tiny and documented with a `// SAFETY:` comment;
  **never** add `unsafe` to silence the borrow checker.
- **Do** read `.env.example`; **never** commit secrets or `.env`.
- **Never** commit with `#[allow(...)]` added only to pass CI; fix the lint.

## More

- Crate/module layout: `docs/architecture.md`.
