import { test, expect, describe } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const ACTION = join(import.meta.dir, "..", "..", "..", "action.yml");

describe("action.yml", () => {
  test("declares a composite action with the documented inputs", () => {
    const doc = parse(readFileSync(ACTION, "utf8"));
    expect(doc.name).toBe("agents-md-lint");
    expect(doc.runs.using).toBe("composite");
    expect(Object.keys(doc.inputs).sort()).toEqual(
      ["format", "max-warnings", "path", "strict"].sort(),
    );
  });

  test("invokes the published CLI via npx/bunx in a run step", () => {
    const raw = readFileSync(ACTION, "utf8");
    expect(raw).toContain("agents-md-lint");
    expect(raw).toMatch(/npx|bunx/);
  });
});
