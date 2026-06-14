import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detect, convert } from "../src/orchestrator";
import { SourceFormat } from "../src/types";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "orch-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("orchestrator", () => {
  test("detect finds multiple formats", () => {
    writeFileSync(join(dir, ".cursorrules"), "Cursor rule.\n");
    writeFileSync(join(dir, "CLAUDE.md"), "Claude rule.\n");
    const detected = detect(dir);
    const formats = detected.map((d) => d.format).sort();
    expect(formats).toContain(SourceFormat.Cursor);
    expect(formats).toContain(SourceFormat.Claude);
  });

  test("convert merges always-on rules from multiple formats into one root", () => {
    writeFileSync(join(dir, ".cursorrules"), "Cursor always rule.\n");
    writeFileSync(join(dir, "CONVENTIONS.md"), "Aider convention.\n");
    const result = convert({ root: dir, nested: true, dropManual: false });
    expect(result.rootAgentsMd).toContain("# AGENTS.md");
    expect(result.rootAgentsMd).toContain("Cursor always rule.");
    expect(result.rootAgentsMd).toContain("Aider convention.");
  });

  test("convert emits nested AGENTS.md for clean dir-prefix globs", () => {
    mkdirSync(join(dir, ".cursor", "rules"), { recursive: true });
    writeFileSync(
      join(dir, ".cursor", "rules", "fe.mdc"),
      "---\nglobs: frontend/**\n---\nFrontend only.\n",
    );
    const result = convert({ root: dir, nested: true, dropManual: false });
    expect(result.nestedFiles.some((f) => f.path === "frontend/AGENTS.md")).toBe(true);
  });

  test("convert collects warnings for lossy degradations", () => {
    mkdirSync(join(dir, ".cursor", "rules"), { recursive: true });
    writeFileSync(
      join(dir, ".cursor", "rules", "t.mdc"),
      "---\nglobs: '**/*.test.ts'\n---\nTest rule.\n",
    );
    const result = convert({ root: dir, nested: true, dropManual: false });
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test("only option restricts to listed formats", () => {
    writeFileSync(join(dir, ".cursorrules"), "Cursor rule.\n");
    writeFileSync(join(dir, "CLAUDE.md"), "Claude rule.\n");
    const result = convert({ root: dir, only: [SourceFormat.Cursor], nested: true, dropManual: false });
    expect(result.rootAgentsMd).toContain("Cursor rule.");
    expect(result.rootAgentsMd).not.toContain("Claude rule.");
  });

  test("always-on rules render before conditional ones", () => {
    mkdirSync(join(dir, ".cursor", "rules"), { recursive: true });
    writeFileSync(join(dir, ".cursorrules"), "ALWAYS RULE.\n");
    writeFileSync(
      join(dir, ".cursor", "rules", "c.mdc"),
      "---\nglobs: '**/*.test.ts'\n---\nCONDITIONAL RULE.\n",
    );
    const result = convert({ root: dir, nested: true, dropManual: false });
    expect(result.rootAgentsMd.indexOf("ALWAYS RULE.")).toBeLessThan(
      result.rootAgentsMd.indexOf("CONDITIONAL RULE."),
    );
  });
});
