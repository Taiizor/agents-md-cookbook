import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const pkgRoot = join(import.meta.dir, "..");

describe("agents-md-lint scaffold", () => {
  const pkg = JSON.parse(
    readFileSync(join(pkgRoot, "package.json"), "utf8"),
  ) as Record<string, unknown>;

  test("package is named agents-md-lint", () => {
    expect(pkg.name).toBe("agents-md-lint");
  });

  test("package is an ESM module", () => {
    expect(pkg.type).toBe("module");
  });

  test("package exposes the agents-md-lint bin", () => {
    expect(pkg.bin).toMatchObject({ "agents-md-lint": "./dist/cli.js" });
  });

  test("package declares the markdown parsing dependencies", () => {
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps["mdast-util-from-markdown"]).toBeDefined();
    expect(deps["yaml"]).toBeDefined();
  });

  test("tsconfig extends the shared base config", () => {
    const tsconfig = JSON.parse(
      readFileSync(join(pkgRoot, "tsconfig.json"), "utf8"),
    ) as { extends?: string };
    expect(tsconfig.extends).toBe("../../tsconfig.base.json");
  });
});
