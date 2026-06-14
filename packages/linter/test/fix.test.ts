import { test, expect, describe } from "bun:test";
import { applyFixes } from "../src/fix.ts";

describe("applyFixes", () => {
  test("strips trailing whitespace from each line", () => {
    const out = applyFixes("# Title   \n\nText\t\n");
    expect(out.content).toBe("# Title\n\nText\n");
    expect(out.changed).toBe(true);
    expect(out.applied).toContain("trailing-whitespace");
  });

  test("ensures a single trailing newline", () => {
    expect(applyFixes("# Title").content).toBe("# Title\n");
    expect(applyFixes("# Title\n\n\n").content).toBe("# Title\n");
  });

  test("wraps a bare command line in a fenced block", () => {
    const input = "## Setup\n\nbun install --frozen-lockfile\n\nDone.\n";
    const out = applyFixes(input);
    expect(out.content).toContain("```bash\nbun install --frozen-lockfile\n```");
    expect(out.applied).toContain("wrap-bare-command");
  });

  test("does not wrap commands already inside a fence", () => {
    const input = "## Setup\n\n```bash\nbun install\n```\n";
    const out = applyFixes(input);
    expect(out.content).toBe(input);
    expect(out.changed).toBe(false);
  });

  test("does not touch prose lines that merely mention a tool", () => {
    const input = "We use bun for everything in this repo.\n";
    const out = applyFixes(input);
    expect(out.content).toBe(input);
    expect(out.changed).toBe(false);
  });

  test("reports changed=false when nothing to fix", () => {
    const input = "# Title\n\nClean.\n";
    const out = applyFixes(input);
    expect(out.changed).toBe(false);
    expect(out.applied).toEqual([]);
  });
});
