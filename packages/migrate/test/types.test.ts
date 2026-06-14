import { test, expect, describe } from "bun:test";
import { SourceFormat, type ParsedRule, type ConversionResult } from "../src/types";

describe("core types", () => {
  test("SourceFormat enum lists all six formats", () => {
    expect(SourceFormat.Cursor).toBe("cursor");
    expect(SourceFormat.Claude).toBe("claude");
    expect(SourceFormat.Windsurf).toBe("windsurf");
    expect(SourceFormat.Copilot).toBe("copilot");
    expect(SourceFormat.Cline).toBe("cline");
    expect(SourceFormat.Aider).toBe("aider");
  });

  test("a ParsedRule and ConversionResult are structurally usable", () => {
    const rule: ParsedRule = {
      body: "Use tabs.",
      scope: { mode: "always" },
      order: 0,
      sourceFile: ".cursorrules",
      format: SourceFormat.Cursor,
    };
    const result: ConversionResult = {
      rootAgentsMd: "# AGENTS.md\n",
      nestedFiles: [],
      warnings: [],
    };
    expect(rule.scope?.mode).toBe("always");
    expect(result.nestedFiles).toHaveLength(0);
  });
});
