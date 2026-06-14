# AGENTS.md

Java + Spring Boot service. Replace the bracketed bits with your details.

## Stack

- Java 21 (LTS), Spring Boot 3.3.
- Build: **Maven** via the wrapper `./mvnw` (use the wrapper, not a global mvn).
- Tests: JUnit 5 + Spring Boot Test. Format: Spotless (google-java-format).

## Setup

```bash
./mvnw -version          # confirm the wrapper + JDK 21
cp .env.example .env     # local config; never commit .env
```

## Commands

```bash
./mvnw spring-boot:run                 # run the app locally
./mvnw clean package                   # build the jar (runs tests)
./mvnw test                            # run all tests
./mvnw -Dtest=OrderServiceTest test    # run one test class
./mvnw spotless:apply                  # format
./mvnw spotless:check verify           # format check + full verify
```

> Gradle variant: swap `./mvnw` for `./gradlew`, `package` for `build`,
> and `-Dtest=X test` for `test --tests X`.

## Code style

- Spotless is the source of truth; run `spotless:apply` before committing.
- Constructor injection only (no field `@Autowired`); keep beans stateless.
- Use DTOs at the web boundary; never expose JPA entities directly in responses.

Example — constructor-injected service:

```java
@Service
public class OrderService {
    private final OrderRepository repo;

    public OrderService(OrderRepository repo) {
        this.repo = repo;
    }

    public Order get(long id) {
        return repo.findById(id)
            .orElseThrow(() -> new OrderNotFoundException(id));
    }
}
```

## Testing

- Unit tests under `src/test/java`, mirroring the main package.
- A change is done when `./mvnw spotless:check verify` passes.
- Add a failing test first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `chore:`).
3. Before pushing: `./mvnw spotless:check verify`.
4. PR description: one-line summary + the test command you ran.

## Boundaries

- **Do** read `.env.example` and `application.yml` for config; **never** commit
  secrets, `.env`, or real credentials.
- **Do** edit application code; **ask first** before changing `pom.xml`
  dependencies or Spring auto-config.
- **Do** add a Flyway migration under `src/main/resources/db/migration` for
  schema changes; **never** edit an applied `V*` migration.
- **Never** disable a failing test with `@Disabled` to make the build green.

## More

- Module/layer boundaries: `docs/architecture.md`.
