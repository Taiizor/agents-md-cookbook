import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { convert } from "../src/orchestrator";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "idem-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("idempotency", () => {
  test("re-running over a written AGENTS.md produces no duplicate content", () => {
    writeFileSync(join(dir, "CONVENTIONS.md"), "## Code style\n\nUse type hints.\n");

    const first = convert({ root: dir, nested: true, dropManual: false });
    writeFileSync(join(dir, "AGENTS.md"), first.rootAgentsMd);

    const second = convert({ root: dir, nested: true, dropManual: false });
    const occurrences = second.rootAgentsMd.split("## Code style").length - 1;
    expect(occurrences).toBe(1);
    expect(second.rootAgentsMd.split("Use type hints.").length - 1).toBe(1);
  });

  test("preserves hand-written sections in an existing AGENTS.md", () => {
    writeFileSync(
      join(dir, "AGENTS.md"),
      "# AGENTS.md\n\n## Hand written\n\nDo not delete me.\n",
    );
    writeFileSync(join(dir, ".cursorrules"), "Cursor rule.\n");
    const result = convert({ root: dir, nested: true, dropManual: false });
    expect(result.rootAgentsMd).toContain("Do not delete me.");
    expect(result.rootAgentsMd).toContain("Cursor rule.");
  });

  test("re-running over a bare headingless rule file produces no duplicates", () => {
    // A plain .cursorrules has no markdown heading -> headingless preamble.
    writeFileSync(join(dir, ".cursorrules"), "Root cursor rule.\n");

    const first = convert({ root: dir, nested: true, dropManual: false });
    writeFileSync(join(dir, "AGENTS.md"), first.rootAgentsMd);

    const second = convert({ root: dir, nested: true, dropManual: false });
    writeFileSync(join(dir, "AGENTS.md"), second.rootAgentsMd);

    const third = convert({ root: dir, nested: true, dropManual: false });
    expect(second.rootAgentsMd.split("Root cursor rule.").length - 1).toBe(1);
    expect(third.rootAgentsMd.split("Root cursor rule.").length - 1).toBe(1);
  });

  test("respects a custom out filename when checking for an existing file", () => {
    writeFileSync(join(dir, "CONVENTIONS.md"), "## Code style\n\nUse type hints.\n");
    const first = convert({ root: dir, out: "GUIDE.md", nested: true, dropManual: false });
    writeFileSync(join(dir, "GUIDE.md"), first.rootAgentsMd);
    const second = convert({ root: dir, out: "GUIDE.md", nested: true, dropManual: false });
    expect(second.rootAgentsMd.split("## Code style").length - 1).toBe(1);
  });
});
