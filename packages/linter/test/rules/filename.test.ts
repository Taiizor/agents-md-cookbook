import { test, expect, describe } from "bun:test";
import { parseDocument } from "../../src/document.ts";
import { filenameRule } from "../../src/rules/filename.ts";

function check(filename: string) {
  const doc = parseDocument("# x\n", { filename });
  return filenameRule.check(doc);
}

describe("AMC-FILENAME", () => {
  test("accepts exactly AGENTS.md", () => {
    expect(check("AGENTS.md")).toEqual([]);
  });

  test("accepts AGENTS.md inside a nested path", () => {
    expect(check("packages/api/AGENTS.md")).toEqual([]);
  });

  test("rejects lowercase agents.md", () => {
    const f = check("agents.md");
    expect(f.length).toBe(1);
    expect(f[0]!.ruleId).toBe("AMC-FILENAME");
    expect(f[0]!.severity).toBe("error");
  });

  test("rejects Agents.MD and AGENT.md and AGENTS.markdown", () => {
    expect(check("Agents.MD").length).toBe(1);
    expect(check("AGENT.md").length).toBe(1);
    expect(check("AGENTS.markdown").length).toBe(1);
  });
});
