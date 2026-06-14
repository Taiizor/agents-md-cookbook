# AGENTS.md Best Practices

Evidence-based rules for writing an `AGENTS.md` that actually helps agents.
Citations point to the studies behind each rule; read the
[caveats](#caveats-on-the-evidence) before treating any single source as proof.

## DO

- **Lead with runnable commands and flags.** Put build/test/lint commands
  early with exact flags (`pnpm test`, `pytest -v`, `go test -race ./...`).
  Agents auto-execute them, so they must be copy-pasteable. *(GitHub 2,500-repo
  study; Augment AuggieBench.)*
- **Add file-scoped verify commands.** Give a fast way to check one file/test
  so the agent can validate its own change cheaply. *(GitHub study.)*
- **Use a few short real code snippets.** 3-10 line examples from your codebase
  beat explanations; they raised code-reuse ~+20%. *(Augment.)*
- **Pair every boundary with a "do."** "Never edit an applied migration —
  add a new one." Pairing keeps the agent unblocked. *(GitHub study.)*
- **Write numbered workflows.** Step-by-step PR/release flows improved
  correctness ~+25%. *(Augment.)*
- **Use decision tables.** Small "if X, do Y" tables improved best-practice
  adherence ~+25%. *(Augment.)*
- **State the stack with versions.** Naming a tool (e.g. `uv`) makes agents use
  it ~1.6x more — so name the *right* one explicitly. *(ETH Zurich.)*
- **Use progressive disclosure with linked refs.** Keep the file short and link
  deeper docs; AGENTS.md itself is discovered ~100% of the time and linked refs
  >90%, but dir READMEs only ~40% and orphan docs <10%. Cap links ~10-15.
  *(Augment.)*
- **Nest per package in monorepos.** One `AGENTS.md` per package; the nearest
  file wins. See [nesting-monorepos.md](./nesting-monorepos.md).
- **Treat it as a living doc.** Update it when commands change; a stale command
  gets executed and wastes a run. *(ETH Zurich.)*
- **Always include "never commit secrets."** It is the most common helpful
  constraint across repos. *(GitHub study.)*

## DON'T

- **Don't auto-generate via `/init`.** LLM-generated files *reduced* task
  success ~3% and raised inference cost ~20-23%. Write it by hand. *(ETH
  Zurich.)*
- **Don't write vague platitudes.** "Write clean code," "be helpful," "follow
  best practices" add tokens and zero signal. *(GitHub study; philschmid.)*
- **Don't include long architecture/file-tour prose.** Detailed codebase
  overviews did **not** speed up file-finding, and architecture overload cut
  completeness ~-25%. *(ETH Zurich; Augment.)*
- **Don't exceed length budgets.** Aim 100-150 lines (some <60); gains reverse
  beyond ~300 lines. Target <300 lines hard. *(Augment; philschmid.)*
- **Don't stack 30+ naked "don'ts."** Excessive warnings made agents ~2x
  slower; pair each with a "do" instead. *(Augment.)*
- **Don't duplicate the README.** Link to it; don't restate it. *(philschmid.)*
- **Don't leave orphan, unlinked docs.** They are discovered <10% of the time —
  link every reference explicitly. *(Augment.)*
- **Don't introduce patterns not yet in the codebase.** Agents follow the file
  faithfully, so describing an aspirational pattern makes them implement it
  prematurely. *(ETH Zurich.)*
- **Don't add inferable detail.** Limit content to non-inferable specifics:
  custom tooling, unusual build commands, repo-specific rules. *(ETH Zurich.)*

## Length & byte budgets enforced by tools

- **OpenAI Codex** truncates `AGENTS.md` at **32 KiB (32768 bytes)** by default
  (`project_doc_max_bytes`).
- **Windsurf / Cascade** caps **6,000 chars per file** and **12,000 chars
  total**.

Keeping files to ~100-150 lines stays comfortably under all of these.

## Caveats on the evidence

- The **GitHub 2,500-repo blog** is a pattern piece, not a controlled study —
  cite it for patterns, not proof.
- **ETH Zurich's AGENTbench** (arXiv:2602.11988, 138 issues across 12 repos)
  is a benchmark; human-written files helped only ~+4%, so the realistic goal
  is "don't hurt" more than "big win." The strongest finding is that agents
  follow files literally, which is why accuracy matters more than volume.
- **Augment's AuggieBench** is a golden-PR eval; treat the percentage deltas as
  directional, stack-dependent signals.

## The one-paragraph version

Lead with exact commands and flags, add a couple of short real code snippets,
pair every "never" with a "do," keep it to ~100-150 non-inferable lines, link
(don't inline) deeper docs, nest per package, never auto-generate, and never
commit secrets.
