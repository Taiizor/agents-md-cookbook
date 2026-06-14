# AGENTS.md

.NET / C# solution. Replace the bracketed bits with your project's details.

## Stack

- .NET 8 (LTS), C# 12, nullable reference types enabled.
- Build/test: `dotnet` CLI. Tests: xUnit. Format: `dotnet format`.

## Setup

```bash
dotnet restore           # restore NuGet packages
cp .env.example .env     # local config; never commit .env
```

## Commands

```bash
dotnet run --project src/Api            # run the API project
dotnet build -c Release                 # build
dotnet test                             # run all tests
dotnet test --filter FullyQualifiedName~OrderServiceTests   # one test class
dotnet format                           # apply formatting + analyzers
dotnet format --verify-no-changes       # format check (used in CI)
```

## Code style

- Nullable is on: treat warnings as errors; do not sprinkle `!` null-forgiving.
- Use `async`/`await` end-to-end; suffix async methods with `Async`.
- Prefer records for DTOs; keep services injected via the DI container.

Example — an async service method:

```csharp
public sealed class OrderService(IOrderRepository repo)
{
    public async Task<Order> GetAsync(long id, CancellationToken ct)
    {
        return await repo.FindAsync(id, ct)
            ?? throw new OrderNotFoundException(id);
    }
}
```

## Testing

- Test projects named `*.Tests`; mirror the namespace under test.
- A change is done when `dotnet format --verify-no-changes` and `dotnet test`
  pass.
- Add a failing test first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `chore:`).
3. Before pushing: `dotnet format --verify-no-changes && dotnet build -c Release && dotnet test`.
4. PR description: one-line summary + the test command you ran.

## Boundaries

- **Do** read `.env.example` and `appsettings.json`; **never** commit secrets,
  `.env`, or `appsettings.*.json` with real values.
- **Do** edit project code; **ask first** before adding NuGet packages or
  editing `.csproj` `TargetFramework`.
- **Do** add an EF Core migration (`dotnet ef migrations add`) for schema
  changes; **never** edit an applied migration's `Up`/`Down`.
- **Never** suppress analyzer warnings with `#pragma warning disable` to pass CI.

## More

- Project/layer layout: `docs/architecture.md`.
