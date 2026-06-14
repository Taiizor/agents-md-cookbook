# agents-md-cookbook — Design Spec

**Date:** 2026-06-14
**Status:** Approved (design), pending implementation plan
**Owner:** Taiizor
**Language:** English (global audience for maximum reach)

---

## 1. Goal

Build a no-code-first, high-star-potential GitHub repository: **the tested, tool-agnostic `AGENTS.md` kit**.

A single `AGENTS.md` that *provably* works across Cursor, Claude Code, Codex, GitHub Copilot, Gemini CLI, Windsurf, Aider, and Jules. This is **not** a link list — it is an *executable kit*: verified templates + a tool-compatibility matrix + a CI linter + migration converters from legacy formats.

### Why this bet

- `AGENTS.md` is a Linux-Foundation-stewarded standard: ~22k stars on the spec repo, 20k+ adopting repos, spanning all major coding agents.
- The official repo deliberately ships **no** templates, linter, or migration tooling — the executable lane is wide open.
- Every existing competitor is single-tool (Codex-only, Copilot-only), localized, or abandoned. **None is tool-agnostic AND executable.**
- Realistic 12-18 month ceiling: **1.5k-4k stars**. A plain link list in this space caps under ~150 ("graveyard tier"); the entire delta to four figures is *execution* — tested artifacts + freshness.

---

## 2. Positioning (one-line promise)

> **The tested, tool-agnostic AGENTS.md kit** — one `AGENTS.md` that provably works across Cursor, Claude Code, Codex, Copilot, Gemini CLI, Windsurf, Aider, and Jules. Verified templates + compatibility matrix + CI linter + migration from legacy formats.

The moat is two things competitors cannot easily copy:
1. **Tool-agnostic neutrality** — a maintained compatibility matrix of which tool honors which section.
2. **Executable artifacts** — load-tested templates, a CI linter, and automated migrators — not links.

---

## 3. Components

| Component | What it is | Code? |
|-----------|------------|-------|
| **Templates** (`/templates`) | 12-15 stack-specific, annotated `AGENTS.md` templates, each verified to load in ≥4 tools. Stacks: TS/Node, Python, Go, Rust, Java/Spring, monorepo, Next.js, Django/FastAPI, React/Vite, data/ML, mobile, minimal starter. | No (markdown) |
| **Compatibility matrix** (`COMPATIBILITY.md`) | Which tool honors which section (project overview, build/test commands, code style, PR instructions, security constraints, nested/monorepo behavior). The citable reference nobody else maintains. | No (markdown) |
| **Linter + GitHub Action** (`packages/linter`) | Validates an `AGENTS.md`: flags missing/recommended sections and anti-patterns, scores against "lessons from real repos." Runs as `bunx agents-md-lint` and as a CI GitHub Action that fails the build on regression. Wraps/endorses the existing `agnix` linter where feasible rather than rebuilding. | Yes |
| **Migration converters** (`packages/migrate`) | Automated conversion from `.cursorrules`, `CLAUDE.md`, `.windsurfrules`, `.github/copilot-instructions.md` → standards-compliant `AGENTS.md`. `bunx agents-md-migrate`. The viral hook: "paste your `.cursorrules`, get an `AGENTS.md`." | Yes |
| **Handbook** (`/docs`) | What `AGENTS.md` is, anatomy of a great one, section-by-section best practices, nesting/monorepo guidance, common mistakes. | No (markdown) |
| **README + contribution flow** | Scannable storefront (hero, value prop, quick start, matrix preview, badges) + PR template enabling a contribution flywheel. | No |

---

## 4. Data flow (user experience)

```
Legacy format (.cursorrules / CLAUDE.md / .windsurfrules / copilot-instructions)
   │   bunx agents-md-migrate
   ▼
AGENTS.md   ◄── starting point from /templates
   │   bunx agents-md-lint   (or the GitHub Action)
   ▼
CI: build fails if AGENTS.md regresses
```

---

## 5. Tech stack

- **Linter + converter:** TypeScript, published to npm so it runs via `bunx` / `npx`. Developed as a **bun workspace** (per global tooling rule: always use `bun`/`bunx`).
- **GitHub Action:** composite action wrapping the CLI.
- **Self-dogfooding:** every template is validated through our own linter in CI, so the repo eats its own dog food.
- **License:** MIT.

---

## 6. Repository structure

```
agents-md-cookbook/
├─ README.md              # storefront
├─ COMPATIBILITY.md       # tool × section matrix
├─ templates/             # 12-15 AGENTS.md templates (one per stack)
├─ docs/                  # anatomy, best-practices, nesting-monorepos, common-mistakes
├─ packages/
│  ├─ linter/             # bun/TS CLI: agents-md-lint
│  └─ migrate/            # bun/TS CLI: agents-md-migrate
├─ action.yml             # GitHub Action wrapping the linter
├─ .github/               # ISSUE_TEMPLATE + pull_request_template
├─ CONTRIBUTING.md
└─ LICENSE                # MIT
```

---

## 7. v1 scope (full kit)

The user chose to ship the full kit in v1 (not a phased content-first launch):

- 12-15 templates
- `COMPATIBILITY.md` matrix
- linter CLI + GitHub Action
- migration converters for ≥3 legacy formats (`.cursorrules`, `CLAUDE.md`, `.github/copilot-instructions.md` minimum)
- handbook docs
- polished README + contribution flow

---

## 8. Launch strategy (first star wave)

1. **PR to `agentsmd/agents.md`** to be linked under a Tools/Templates section — an upstream link from the 22k spec repo is the single highest-leverage growth lever.
2. **Show HN:** "tested AGENTS.md templates + a linter + migrators from `.cursorrules`/`CLAUDE.md`."
3. Cross-post: r/ChatGPTCoding, r/cursor, r/ClaudeAI, r/programming.
4. **X / Bluesky:** the migration converter demo ("paste your `.cursorrules`, get an `AGENTS.md`") as the most shareable hook.
5. Newsletters: TLDR, Pointer, Cursor/Codex community newsletters.

---

## 9. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| GitHub/Linux Foundation ships an official kit and absorbs the slot | Move fast; stay aggressively multi-tool (neutrality is the durable edge). |
| The `*-agents-md` name space is a spam graveyard | Strong README + credible maintainer voice; the name is `agents-md-cookbook`, not `awesome-agents-md`. |
| Maintenance burden (tools change which sections they honor) | This *is* the moat; commit to a monthly freshness cadence. |
| Cross-tool verification is partly manual | Document the verification method honestly; automate what we can via self-dogfooding. |
| Linter overlaps the existing `agnix` project | Wrap/endorse rather than duplicate. |

---

## 10. Facts to verify at build time

Research supports these, but they will be re-confirmed live before/while building:

- (a) Which tools read `AGENTS.md` **natively** vs. require an adapter/symlink (drives the compatibility matrix).
- (b) The `agnix` linter's wrappability and license.
- (c) The exact source of GitHub's "2,500-repo lessons" referenced for the linter's scoring.
- (d) The current, real set of legacy formats worth converting (and their exact filenames/locations).

---

## 11. Success criteria

- v1 repo is share-worthy on day one: a newcomer can copy a template, migrate a legacy file, and add the CI gate in under 5 minutes.
- The compatibility matrix is accurate as of launch and visibly dated.
- Linter and converter run cleanly via `bunx` and as a GitHub Action.
- Repo is structured for a contribution flywheel (clear PR path for new templates).
- Stretch: linked from `agentsmd/agents.md`; reaches 1.5k+ stars within 12 months.
