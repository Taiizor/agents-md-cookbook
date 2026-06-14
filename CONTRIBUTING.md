# Contributing to agents-md-cookbook

Thanks for helping make `AGENTS.md` better for everyone. The two highest-value
contributions are **new templates** and **compatibility-matrix corrections**.

## Ground rules

- The default branch is `main`; open PRs against it.
- This is a **bun workspace**. Use `bun` / `bunx` for development. (Published
  CLIs also work via `npx` for end users.)
- Every Markdown file is content-linted and link-checked in CI. Run the checks
  locally before pushing (see below).

## Local setup

```bash
git clone https://github.com/Taiizor/agents-md-cookbook.git
cd agents-md-cookbook
bun install
bun run lint:md           # markdownlint over all Markdown
bun run lint:md:fix       # auto-fix what is fixable
```

## Adding a template

1. Create a directory under `templates/<stack>/` and a single file named exactly
   `AGENTS.md` inside it (uppercase `AGENTS`, lowercase `.md`).
2. Follow the **template style bar** below.
3. Add a row to the Templates table in [README.md](./README.md).
4. Run `bun run lint:md` and fix any issues.
5. Open a PR using the [new-template issue](./.github/ISSUE_TEMPLATE/new-template.md)
   as the basis for your description.

### Template style bar (required)

Every template must:

- [ ] Be **60-150 lines** (the `minimal` template may be shorter).
- [ ] Put **commands early**, with real flags, that work copy-pasted.
- [ ] Use the **correct package manager / test runner** for the ecosystem
      (e.g. `uv` for Python, `cargo nextest` for Rust, `./mvnw` for Maven).
- [ ] Include **1-2 short real code snippets** (3-10 lines), not prose essays.
- [ ] Have a **Security / Boundaries** section that includes
      **"never commit secrets"** and pairs each "never" with a "do."
- [ ] State the **stack with versions**.
- [ ] **Avoid** vague platitudes and long architecture/file-tour prose.

These rules come from the evidence in
[docs/best-practices.md](./docs/best-practices.md). When `agents-md-lint`
lands, it will enforce most of them automatically; until then, reviewers check
by hand.

## Updating the compatibility matrix

1. Edit [COMPATIBILITY.md](./COMPATIBILITY.md).
2. Keep the column structure (Tool | Reads AGENTS.md? | Mechanism | Own/primary
   file | Nested/monorepo | Notes | Source).
3. **Cite a primary source** (official docs, changelog, or issue) in the Source
   column.
4. Bump the "Last verified" date at the top.
5. Open a PR using the
   [compatibility-update issue](./.github/ISSUE_TEMPLATE/compatibility-update.md).

## Editing the handbook

`docs/*.md` should stay evidence-backed. If you add a claim, cite the source
(GitHub study, ETH Zurich AGENTbench, Augment AuggieBench, philschmid, or
official tool docs). Keep examples short and runnable.

## Commit & PR conventions

- Use **Conventional Commits**: `feat(templates): add svelte AGENTS.md`,
  `fix(compat): correct Zed priority order`, `docs(handbook): ...`.
- Keep commits small and focused (one template or one logical change per PR).
- Fill in the [pull request template](./.github/pull_request_template.md).
- A PR is mergeable when CI (link check + content lint) is green and a
  maintainer approves.

## Code of conduct

Be respectful and constructive. Assume good faith; review the work, not the
person.
