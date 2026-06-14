import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectWindsurf, convertWindsurf } from "../src/converters/windsurf";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "windsurf-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("windsurf converter", () => {
  test("legacy .windsurfrules becomes an always-on rule", () => {
    writeFileSync(join(dir, ".windsurfrules"), "Prefer composition over inheritance.\n");
    expect(detectWindsurf(dir)).toEqual([".windsurfrules"]);
    const rules = convertWindsurf(dir);
    expect(rules[0]!.scope?.mode).toBe("always");
    expect(rules[0]!.body).toBe("Prefer composition over inheritance.");
  });

  test("trigger always_on maps to always", () => {
    mkdirSync(join(dir, ".windsurf", "rules"), { recursive: true });
    writeFileSync(
      join(dir, ".windsurf", "rules", "core.md"),
      "---\ntrigger: always_on\n---\nNever log secrets.\n",
    );
    expect(convertWindsurf(dir)[0]!.scope?.mode).toBe("always");
  });

  test("trigger glob with globs maps to glob mode", () => {
    mkdirSync(join(dir, ".windsurf", "rules"), { recursive: true });
    writeFileSync(
      join(dir, ".windsurf", "rules", "api.md"),
      "---\ntrigger: glob\nglobs: src/api/**\ndescription: API rules\n---\nValidate inputs.\n",
    );
    const r = convertWindsurf(dir)[0]!;
    expect(r.scope?.mode).toBe("glob");
    expect(r.scope?.globs).toEqual(["src/api/**"]);
  });

  test("trigger model_decision maps to agent mode with description", () => {
    mkdirSync(join(dir, ".windsurf", "rules"), { recursive: true });
    writeFileSync(
      join(dir, ".windsurf", "rules", "perf.md"),
      "---\ntrigger: model_decision\ndescription: Performance tuning\n---\nUse memoization.\n",
    );
    const r = convertWindsurf(dir)[0]!;
    expect(r.scope?.mode).toBe("agent");
    expect(r.scope?.description).toBe("Performance tuning");
  });

  test("trigger manual maps to manual mode", () => {
    mkdirSync(join(dir, ".windsurf", "rules"), { recursive: true });
    writeFileSync(
      join(dir, ".windsurf", "rules", "rel.md"),
      "---\ntrigger: manual\n---\nRelease checklist.\n",
    );
    expect(convertWindsurf(dir)[0]!.scope?.mode).toBe("manual");
  });

  test("also reads .devin/rules/*.md", () => {
    mkdirSync(join(dir, ".devin", "rules"), { recursive: true });
    writeFileSync(
      join(dir, ".devin", "rules", "d.md"),
      "---\ntrigger: always_on\n---\nDevin rule.\n",
    );
    expect(convertWindsurf(dir).some((r) => r.body === "Devin rule.")).toBe(true);
  });

  test("excludes global_rules.md", () => {
    writeFileSync(join(dir, "global_rules.md"), "GLOBAL PERSONAL RULE.\n");
    expect(detectWindsurf(dir)).not.toContain("global_rules.md");
    expect(convertWindsurf(dir).map((r) => r.body).join("\n")).not.toContain("GLOBAL PERSONAL RULE.");
  });
});
