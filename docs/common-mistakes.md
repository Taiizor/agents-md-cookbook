# Common AGENTS.md Mistakes

The anti-patterns that make an `AGENTS.md` neutral or harmful. Each entry
states the mistake, why it hurts, and the fix. See
[best-practices.md](./best-practices.md) for the positive version and sources.

## 1. Auto-generating with `/init`

**Mistake:** Running an agent's `/init` (or similar) and committing whatever it
produces.

**Why it hurts:** In ETH Zurich's AGENTbench, LLM-generated files *reduced*
task success ~3% and raised inference cost ~20-23%. The generated content is
mostly inferable codebase description that agents do not need — and because
agents follow the file faithfully, every wrong line is executed.

**Fix:** Write it by hand. Limit content to non-inferable specifics: custom
tooling, unusual build commands, and repo-specific rules.

## 2. Vague platitudes

**Mistake:** "Write clean code," "be helpful," "follow best practices,"
"use good naming."

**Why it hurts:** Zero actionable signal, pure token cost. The agent already
"knows" these and cannot act on them differently.

**Fix:** Replace with concrete, checkable rules: "Run `pnpm lint` before
committing," "Validate request bodies with Zod at the boundary."

## 3. Length bloat

**Mistake:** A 400-line file with a full architecture tour and a file-by-file
directory listing.

**Why it hurts:** Augment found the sweet spot at 100-150 lines with gains
reversing beyond ~300; architecture overload cut completeness ~-25%. ETH Zurich
found detailed overviews do **not** speed file-finding. Tools also truncate:
Codex at 32 KiB, Windsurf at 6,000 chars/file (12,000 total).

**Fix:** Target ~100-150 lines. Cut the architecture essay; link a short
`docs/architecture.md` instead.

## 4. A wall of naked "don'ts"

**Mistake:** 30+ standalone prohibitions with no guidance on what to do.

**Why it hurts:** Excessive warnings made agents ~2x slower in Augment's eval,
and a "never" with no "do" can leave the agent stuck.

**Fix:** Keep boundaries few and **pair each with a "do":** "Never edit an
applied migration — add a new one instead."

## 5. Orphan, unlinked docs

**Mistake:** Putting important guidance in a `docs/` file that nothing links to.

**Why it hurts:** Doc-discovery rates: `AGENTS.md` ~100%, explicitly linked
refs >90%, directory READMEs ~40%, **orphan docs <10%**. Unlinked docs are
effectively invisible to the agent.

**Fix:** Link every reference doc explicitly from `AGENTS.md`, and cap the
number of links to ~10-15.

## 6. Duplicating the README

**Mistake:** Copying the README's intro, install steps, and feature list into
`AGENTS.md`.

**Why it hurts:** Double maintenance and double tokens; the two drift apart and
the agent reads stale duplicates.

**Fix:** Link to the README for human-facing context; keep `AGENTS.md` focused
on agent-actionable commands, rules, and boundaries.

## 7. Describing patterns not yet in the codebase

**Mistake:** Documenting an aspirational architecture ("we use CQRS
everywhere") the code does not actually follow yet.

**Why it hurts:** Agents follow the file faithfully and will implement the
described-but-absent pattern prematurely, creating inconsistency.

**Fix:** Document only what the codebase does today. Update the file when the
pattern actually lands.

## 8. Wrong filename or wrong location

**Mistake:** `agents.md`, `Agents.md`, `AGENT.md`, or burying it in a subfolder
when it should be at the root.

**Why it hurts:** The name must be exactly `AGENTS.md` (uppercase `AGENTS`,
lowercase `.md`) at the repo root; native tools look for that exact name.
Note Zed's first-match order also recognizes a singular `AGENT.md` — but the
portable, standard choice is `AGENTS.md`.

**Fix:** Name it exactly `AGENTS.md` at the repo root; add nested `AGENTS.md`
files per package as needed.

## 9. Stale commands

**Mistake:** Leaving a command in the file after the script was renamed or
removed.

**Why it hurts:** Agents auto-execute listed commands; a stale command fails
the run or does the wrong thing, wasting a whole attempt.

**Fix:** Treat `AGENTS.md` as a living doc. When you change a script, update
the file in the same PR — and lint it (e.g. with `agents-md-lint`) in CI.
