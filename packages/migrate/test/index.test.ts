import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  detect,
  convert,
  convertCursor,
  convertClaude,
  convertWindsurf,
  convertCopilot,
  convertCline,
  convertAider,
  SourceFormat,
} from "../src/index";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "api-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("public API", () => {
  test("re-exports detect, convert, the enum, and all per-format converters", () => {
    expect(typeof detect).toBe("function");
    expect(typeof convert).toBe("function");
    expect(typeof convertCursor).toBe("function");
    expect(typeof convertClaude).toBe("function");
    expect(typeof convertWindsurf).toBe("function");
    expect(typeof convertCopilot).toBe("function");
    expect(typeof convertCline).toBe("function");
    expect(typeof convertAider).toBe("function");
    expect(SourceFormat.Cursor).toBe("cursor");
  });

  test("convert works end-to-end via the public entry", () => {
    writeFileSync(join(dir, ".cursorrules"), "Public API rule.\n");
    const result = convert({ root: dir, nested: true, dropManual: false });
    expect(result.rootAgentsMd).toContain("Public API rule.");
  });
});
