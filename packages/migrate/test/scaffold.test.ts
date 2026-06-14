import { test, expect, describe } from "bun:test";
import pkg from "../package.json";

describe("package scaffold", () => {
  test("declares the published name and bin", () => {
    expect(pkg.name).toBe("agents-md-migrate");
    expect(pkg.type).toBe("module");
    expect(pkg.bin["agents-md-migrate"]).toBe("dist/cli.js");
  });

  test("depends on yaml", () => {
    expect(pkg.dependencies.yaml).toBeDefined();
  });

  test("exports the library entry", () => {
    expect(pkg.exports["."].import).toBe("./dist/index.js");
  });
});
