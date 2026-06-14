import { test, expect, describe } from "bun:test";
import { rulesToMarkdown } from "../src/rules";
import { SourceFormat, type ParsedRule } from "../src/types";

function rule(p: Partial<ParsedRule>): ParsedRule {
  return { body: "Body.", sourceFile: "x", format: SourceFormat.Cursor, ...p };
}

describe("rulesToMarkdown", () => {
  test("inlines always-on rules in order", () => {
    const { rootBody, nestedFiles, warnings } = rulesToMarkdown(
      [
        rule({ body: "First rule.", scope: { mode: "always" }, order: 0 }),
        rule({ body: "Second rule.", scope: { mode: "always" }, order: 1 }),
      ],
      { nested: true, dropManual: false },
    );
    expect(rootBody.indexOf("First rule.")).toBeLessThan(rootBody.indexOf("Second rule."));
    expect(nestedFiles).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  test("degrades a non-prefix glob to an 'Applies to' prose prefix and warns", () => {
    const { rootBody, nestedFiles, warnings } = rulesToMarkdown(
      [rule({ body: "Type tests carefully.", scope: { mode: "glob", globs: ["**/*.test.ts"] } })],
      { nested: true, dropManual: false },
    );
    expect(rootBody).toContain("Applies to `**/*.test.ts`:");
    expect(rootBody).toContain("Type tests carefully.");
    expect(nestedFiles).toHaveLength(0);
    expect(warnings.some((w) => w.includes("scoping"))).toBe(true);
  });

  test("routes a clean directory-prefix glob into a nested AGENTS.md", () => {
    const { rootBody, nestedFiles } = rulesToMarkdown(
      [rule({ body: "Frontend rule.", scope: { mode: "glob", globs: ["src/**"] } })],
      { nested: true, dropManual: false },
    );
    expect(nestedFiles).toHaveLength(1);
    expect(nestedFiles[0]!.path).toBe("src/AGENTS.md");
    expect(nestedFiles[0]!.content).toContain("Frontend rule.");
    expect(rootBody).not.toContain("Frontend rule.");
  });

  test("falls back to prose for dir-prefix globs when nested is disabled", () => {
    const { rootBody, nestedFiles } = rulesToMarkdown(
      [rule({ body: "Frontend rule.", scope: { mode: "glob", globs: ["src/**"] } })],
      { nested: false, dropManual: false },
    );
    expect(nestedFiles).toHaveLength(0);
    expect(rootBody).toContain("Applies to `src/**`:");
  });

  test("renders an agent-requested rule with a 'When relevant' lead-in", () => {
    const { rootBody } = rulesToMarkdown(
      [rule({ body: "Use the cache.", scope: { mode: "agent", description: "Performance tuning" } })],
      { nested: true, dropManual: false },
    );
    expect(rootBody).toContain("> When relevant: Performance tuning");
    expect(rootBody).toContain("Use the cache.");
  });

  test("puts manual rules under an Optional section and warns", () => {
    const { rootBody, warnings } = rulesToMarkdown(
      [rule({ body: "Release steps.", scope: { mode: "manual" } })],
      { nested: true, dropManual: false },
    );
    expect(rootBody).toContain("## Optional / on-demand rules");
    expect(rootBody).toContain("Release steps.");
    expect(warnings.some((w) => w.includes("manual"))).toBe(true);
  });

  test("drops manual rules entirely when dropManual is set, with a warning", () => {
    const { rootBody, warnings } = rulesToMarkdown(
      [rule({ body: "Release steps.", scope: { mode: "manual" } })],
      { nested: true, dropManual: true },
    );
    expect(rootBody).not.toContain("Release steps.");
    expect(rootBody).not.toContain("## Optional / on-demand rules");
    expect(warnings.some((w) => w.includes("dropped"))).toBe(true);
  });

  test("emits a '> Rule:' lead-in for glob rules that carry a description", () => {
    const { rootBody } = rulesToMarkdown(
      [rule({ body: "Validate input.", scope: { mode: "glob", globs: ["**/*.test.ts"], description: "API tests" } })],
      { nested: true, dropManual: false },
    );
    expect(rootBody).toContain("> Rule: API tests");
  });
});
