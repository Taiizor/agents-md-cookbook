import { test, expect, describe } from "bun:test";
import { parseDocument } from "../src/document.ts";

const SAMPLE = `---
description: A demo file
tags:
  - demo
  - test
---
# Project

## Setup commands

Run the installer:

\`\`\`bash
bun install --frozen-lockfile
\`\`\`

Then run \`bun test\` to verify.
`;

describe("parseDocument", () => {
  test("captures raw, lines, byteLength and filename", () => {
    const doc = parseDocument(SAMPLE, { filename: "AGENTS.md" });
    expect(doc.raw).toBe(SAMPLE);
    expect(doc.filename).toBe("AGENTS.md");
    expect(doc.byteLength).toBe(Buffer.byteLength(SAMPLE, "utf8"));
    expect(doc.lines.length).toBe(SAMPLE.split("\n").length);
  });

  test("parses optional frontmatter into an object", () => {
    const doc = parseDocument(SAMPLE, { filename: "AGENTS.md" });
    expect(doc.frontmatter).toEqual({
      description: "A demo file",
      tags: ["demo", "test"],
    });
    expect(doc.frontmatterRaw).toContain("description: A demo file");
  });

  test("returns null frontmatter when absent", () => {
    const doc = parseDocument("# No frontmatter\n", { filename: "AGENTS.md" });
    expect(doc.frontmatter).toBeNull();
    expect(doc.frontmatterRaw).toBeNull();
  });

  test("collects headings with depth/text/line", () => {
    const doc = parseDocument(SAMPLE, { filename: "AGENTS.md" });
    expect(doc.headings.map((h) => [h.depth, h.text])).toEqual([
      [1, "Project"],
      [2, "Setup commands"],
    ]);
    expect(doc.headings[0]!.line).toBeGreaterThan(0);
  });

  test("collects fenced code blocks with language", () => {
    const doc = parseDocument(SAMPLE, { filename: "AGENTS.md" });
    expect(doc.codeBlocks.length).toBe(1);
    expect(doc.codeBlocks[0]!.lang).toBe("bash");
    expect(doc.codeBlocks[0]!.value).toContain("bun install");
  });

  test("collects commands from fenced blocks and inline code", () => {
    const doc = parseDocument(SAMPLE, { filename: "AGENTS.md" });
    const texts = doc.commands.map((c) => c.text);
    expect(texts).toContain("bun install --frozen-lockfile");
    expect(texts).toContain("bun test");
    const fencedCmd = doc.commands.find((c) => c.text.startsWith("bun install"));
    expect(fencedCmd!.fenced).toBe(true);
  });

  test("malformed frontmatter yields null without throwing", () => {
    const bad = "---\ndescription: [unterminated\n---\n# Title\n";
    const doc = parseDocument(bad, { filename: "AGENTS.md" });
    expect(doc.frontmatter).toBeNull();
  });

  test("records repoRoot when supplied", () => {
    const doc = parseDocument("# x\n", { filename: "AGENTS.md", root: "/repo" });
    expect(doc.repoRoot).toBe("/repo");
  });
});
