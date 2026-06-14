import { test, expect, describe } from "bun:test";
import { mergeSections, hashBody, extractHeadings } from "../src/merge";

describe("extractHeadings", () => {
  test("collects ATX headings ignoring those inside fenced code blocks", () => {
    const md = "# Title\n\n```\n# not a heading\n```\n\n## Real Section\n";
    expect(extractHeadings(md)).toEqual(["# Title", "## Real Section"]);
  });
});

describe("hashBody", () => {
  test("is stable and ignores leading/trailing whitespace", () => {
    expect(hashBody("  hello\n")).toBe(hashBody("hello"));
    expect(hashBody("a")).not.toBe(hashBody("b"));
  });
});

describe("mergeSections", () => {
  test("appends a new section to existing content", () => {
    const existing = "# AGENTS.md\n\n## Setup\n\nRun bun install.\n";
    const additions = "## Testing\n\nRun bun test.\n";
    const merged = mergeSections(existing, additions);
    expect(merged).toContain("## Setup");
    expect(merged).toContain("## Testing");
    expect(merged.trimEnd().endsWith("Run bun test.")).toBe(true);
  });

  test("does not duplicate a section already present by heading + content", () => {
    const existing = "# AGENTS.md\n\n## Testing\n\nRun bun test.\n";
    const additions = "## Testing\n\nRun bun test.\n";
    const merged = mergeSections(existing, additions);
    const occurrences = merged.split("## Testing").length - 1;
    expect(occurrences).toBe(1);
  });

  test("keeps a same-named heading whose body differs", () => {
    const existing = "## Testing\n\nRun bun test.\n";
    const additions = "## Testing\n\nRun the e2e suite too.\n";
    const merged = mergeSections(existing, additions);
    expect(merged).toContain("Run bun test.");
    expect(merged).toContain("Run the e2e suite too.");
  });

  test("merging into empty existing returns the additions", () => {
    expect(mergeSections("", "## A\n\nbody\n").trim()).toBe("## A\n\nbody");
  });
});
