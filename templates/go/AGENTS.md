# AGENTS.md

Go module. Replace the bracketed bits with your project's details.

## Stack

- Go 1.22 (modules; module path in `go.mod`).
- Lint: golangci-lint. Format: gofmt + goimports. Tests: standard `go test`.

## Setup

```bash
go mod download         # fetch dependencies
cp .env.example .env    # local config; never commit .env
```

## Commands

```bash
go run ./cmd/app                 # run the main binary
go build ./...                   # build everything
go test ./...                    # run all tests
go test -run TestThing ./pkg/x   # run one test
go test -race -cover ./...       # race detector + coverage
golangci-lint run                # lint
gofmt -l -w . && goimports -w .  # format + fix imports
```

## Code style

- Code must be `gofmt`-clean; CI rejects unformatted code.
- Return errors, don't panic in library code; wrap with `fmt.Errorf("...: %w", err)`.
- Accept interfaces, return concrete types.

Example — idiomatic error wrapping:

```go
func LoadConfig(path string) (*Config, error) {
    b, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("read config %q: %w", path, err)
    }
    var c Config
    if err := json.Unmarshal(b, &c); err != nil {
        return nil, fmt.Errorf("parse config: %w", err)
    }
    return &c, nil
}
```

## Testing

- Table-driven tests in `*_test.go` beside the code.
- A change is done when `golangci-lint run` and `go test -race ./...` pass.
- Add a failing test first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `chore:`).
3. Before pushing: `gofmt -l . && golangci-lint run && go test -race ./...`.
4. PR description: one-line summary + the test command you ran.

## Boundaries

- **Do** read `.env.example`; **never** commit secrets or `.env`.
- **Do** edit package code; **ask first** before running `go get` to add a new
  dependency or before touching `go.mod`/`go.sum` by hand.
- **Do** run `go mod tidy` after dependency changes; **never** hand-edit
  `go.sum`.
- **Never** suppress vet/lint findings with `//nolint` without a reason comment.

## More

- Package layout & design: `docs/architecture.md`.
