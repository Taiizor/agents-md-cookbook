import { test, expect, describe } from "bun:test";
import { parseDocument } from "../../src/document.ts";
import { validMarkdownRule } from "../../src/rules/valid-markdown.ts";

describe("AGM-001 valid-markdown", () => {
  test("passes on well-formed markdown", () => {
    const doc = parseDocument("# Title\n\nText.\n", { filename: "AGENTS.md" });
    expect(validMarkdownRule.check(doc)).toEqual([]);
  });

  test("flags an unterminated code fence", () => {
    const doc = parseDocument("# Title\n\n```bash\nbun test\n", {
      filename: "AGENTS.md",
    });
    const findings = validMarkdownRule.check(doc);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]!.ruleId).toBe("AGM-001");
    expect(findings[0]!.severity).toBe("error");
  });

  test("rule metadata is correct", () => {
    expect(validMarkdownRule.id).toBe("AGM-001");
    expect(validMarkdownRule.severity).toBe("error");
  });
});
