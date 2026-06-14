import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const cliPath = join(import.meta.dir, "..", "dist", "cli.js");

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "build-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("built CLI", () => {
  test("dist/cli.js exists after build", () => {
    expect(existsSync(cliPath)).toBe(true);
  });

  test("runs end-to-end and writes AGENTS.md", () => {
    writeFileSync(join(dir, ".cursorrules"), "Built CLI rule.\n");
    const res = spawnSync("node", [cliPath, "--root", dir], { encoding: "utf8" });
    expect(res.status).toBe(0);
    expect(existsSync(join(dir, "AGENTS.md"))).toBe(true);
  });
});
