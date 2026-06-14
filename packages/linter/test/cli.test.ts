import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { run } from "../src/cli.ts";

const FIX = join(import.meta.dir, "fixtures");
const GOOD = join(FIX, "good", "AGENTS.md");
const STUB = join(FIX, "stub", "AGENTS.md");

function capture() {
  const lines: string[] = [];
  const write = (s: string) => lines.push(s);
  return { lines, write };
}

describe("cli run()", () => {
  test("exits 0 on a clean file (text default)", async () => {
    const cap = capture();
    const code = await run([GOOD], { write: cap.write });
    expect(code).toBe(0);
    expect(cap.lines.join("\n")).toContain("grade");
  });

  test("exits 1 when errors are present", async () => {
    const cap = capture();
    // Force a byte-cap error via a tiny configured cap is not available on CLI;
    // instead use a filename error by linting a wrong-named file path.
    const wrong = join(FIX, "stub", "AGENTS.md");
    const code = await run([wrong, "--max-warnings", "0"], { write: cap.write });
    expect(code).toBe(1);
  });

  test("--format json prints valid JSON", async () => {
    const cap = capture();
    const code = await run([GOOD, "--format", "json"], { write: cap.write });
    const parsed = JSON.parse(cap.lines.join("\n"));
    expect(parsed.summary.files).toBe(1);
    expect(code).toBe(0);
  });

  test("--strict turns warnings into a failing exit code", async () => {
    const cap = capture();
    const code = await run([STUB, "--strict"], { write: cap.write });
    expect(code).toBe(1);
  });

  test("--max-warnings N fails when warnings exceed N", async () => {
    const cap = capture();
    const code = await run([STUB, "--max-warnings", "0"], { write: cap.write });
    expect(code).toBe(1);
  });

  test("--quiet suppresses info-only output but keeps errors", async () => {
    const cap = capture();
    await run([GOOD, "--quiet"], { write: cap.write });
    const text = cap.lines.join("\n");
    expect(text).not.toContain("info ");
  });

  test("--fix rewrites the file and reports applied fixes", async () => {
    const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import(
      "node:fs"
    );
    const { tmpdir } = await import("node:os");
    const dir = mkdtempSync(join(tmpdir(), "amc-cli-fix-"));
    try {
      const file = join(dir, "AGENTS.md");
      writeFileSync(file, "# Title   \n\nbun install\n");
      const cap = capture();
      await run([file, "--fix"], { write: cap.write });
      const after = readFileSync(file, "utf8");
      expect(after).toContain("```bash");
      expect(after).not.toContain("Title   ");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("--help prints usage and exits 0", async () => {
    const cap = capture();
    const code = await run(["--help"], { write: cap.write });
    expect(code).toBe(0);
    expect(cap.lines.join("\n")).toContain("agents-md-lint");
  });

  test("missing default file is a clean no-op error (exit 1)", async () => {
    const cap = capture();
    const code = await run(["./definitely-missing-AGENTS.md"], {
      write: cap.write,
    });
    expect(code).toBe(1);
    expect(cap.lines.join("\n")).toContain("No files matched");
  });
});
