import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { run } from "../src/cli";

let dir: string;
let logs: string[];
let origLog: typeof console.log;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cli-"));
  logs = [];
  origLog = console.log;
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };
});
afterEach(() => {
  console.log = origLog;
  rmSync(dir, { recursive: true, force: true });
});

describe("cli run", () => {
  test("writes AGENTS.md and reports a summary", async () => {
    writeFileSync(join(dir, ".cursorrules"), "Cursor rule.\n");
    const code = await run(["--root", dir]);
    expect(code).toBe(0);
    const out = join(dir, "AGENTS.md");
    expect(existsSync(out)).toBe(true);
    expect(readFileSync(out, "utf8")).toContain("Cursor rule.");
    expect(logs.join("\n")).toContain("AGENTS.md");
  });

  test("--dry-run prints output but does not write a file", async () => {
    writeFileSync(join(dir, ".cursorrules"), "Cursor rule.\n");
    const code = await run(["--root", dir, "--dry-run"]);
    expect(code).toBe(0);
    expect(existsSync(join(dir, "AGENTS.md"))).toBe(false);
    expect(logs.join("\n")).toContain("Cursor rule.");
  });

  test("--format json emits parseable JSON with warnings", async () => {
    // create the nested file properly
    const { mkdirSync } = await import("node:fs");
    mkdirSync(join(dir, ".cursor", "rules"), { recursive: true });
    writeFileSync(
      join(dir, ".cursor", "rules", "x.mdc"),
      "---\nglobs: '**/*.test.ts'\n---\nTest rule.\n",
    );
    const code = await run(["--root", dir, "--dry-run", "--format", "json"]);
    expect(code).toBe(0);
    const printed = logs.join("\n");
    const parsed = JSON.parse(printed);
    expect(parsed.rootAgentsMd).toContain("Test rule.");
    expect(Array.isArray(parsed.warnings)).toBe(true);
  });

  test("--out writes to a custom filename", async () => {
    writeFileSync(join(dir, ".cursorrules"), "Cursor rule.\n");
    const code = await run(["--root", dir, "--out", "GUIDE.md"]);
    expect(code).toBe(0);
    expect(existsSync(join(dir, "GUIDE.md"))).toBe(true);
  });

  test("--only restricts formats", async () => {
    writeFileSync(join(dir, ".cursorrules"), "Cursor rule.\n");
    writeFileSync(join(dir, "CLAUDE.md"), "Claude rule.\n");
    await run(["--root", dir, "--only", "cursor", "--dry-run"]);
    const printed = logs.join("\n");
    expect(printed).toContain("Cursor rule.");
    expect(printed).not.toContain("Claude rule.");
  });

  test("reports exit code 0 and a 'no sources' note when nothing is found", async () => {
    const code = await run(["--root", dir]);
    expect(code).toBe(0);
    expect(logs.join("\n").toLowerCase()).toContain("no ");
  });

  test("writes nested AGENTS.md files unless --no-nested", async () => {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(join(dir, ".cursor", "rules"), { recursive: true });
    writeFileSync(
      join(dir, ".cursor", "rules", "fe.mdc"),
      "---\nglobs: frontend/**\n---\nFrontend rule.\n",
    );
    await run(["--root", dir]);
    expect(existsSync(join(dir, "frontend", "AGENTS.md"))).toBe(true);
  });
});
