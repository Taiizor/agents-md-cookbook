import { test, expect, describe } from "bun:test";
import { parseDocument } from "../../src/document.ts";
import { frontmatterRule } from "../../src/rules/frontmatter.ts";

describe("AMC-FRONTMATTER", () => {
  test("passes when there is no frontmatter", () => {
    const doc = parseDocument("# Title\n", { filename: "AGENTS.md" });
    expect(frontmatterRule.check(doc)).toEqual([]);
  });

  test("passes on valid description + tags", () => {
    const doc = parseDocument(
      "---\ndescription: A short summary\ntags:\n  - api\n  - node\n---\n# Title\n",
      { filename: "AGENTS.md" },
    );
    expect(frontmatterRule.check(doc)).toEqual([]);
  });

  test("warns when description is not a string", () => {
    const doc = parseDocument(
      "---\ndescription:\n  - oops\n---\n# Title\n",
      { filename: "AGENTS.md" },
    );
    const f = frontmatterRule.check(doc);
    expect(f.some((x) => x.message.includes("description"))).toBe(true);
    expect(f[0]!.severity).toBe("warn");
  });

  test("warns when description exceeds 200 chars", () => {
    const long = "x".repeat(201);
    const doc = parseDocument(`---\ndescription: ${long}\n---\n# T\n`, {
      filename: "AGENTS.md",
    });
    const f = frontmatterRule.check(doc);
    expect(f.some((x) => x.message.includes("200"))).toBe(true);
  });

  test("warns when tags is not a string array", () => {
    const doc = parseDocument(
      "---\ntags: not-a-list\n---\n# T\n",
      { filename: "AGENTS.md" },
    );
    const f = frontmatterRule.check(doc);
    expect(f.some((x) => x.message.includes("tags"))).toBe(true);
  });

  test("never errors on unknown keys (forward-compat)", () => {
    const doc = parseDocument(
      "---\ndescription: ok\nfuture_key: whatever\nnested:\n  a: 1\n---\n# T\n",
      { filename: "AGENTS.md" },
    );
    const f = frontmatterRule.check(doc);
    expect(f.filter((x) => x.severity === "error")).toEqual([]);
    expect(f).toEqual([]);
  });
});
