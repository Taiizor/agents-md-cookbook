import { test, expect, describe } from "bun:test";
import { globToDirPrefix, splitCommaGlobs } from "../src/glob";

describe("globToDirPrefix", () => {
  test("maps a clean directory-prefix glob to its directory", () => {
    expect(globToDirPrefix("src/**")).toBe("src");
    expect(globToDirPrefix("src/**/*")).toBe("src");
    expect(globToDirPrefix("packages/api/**")).toBe("packages/api");
    expect(globToDirPrefix("src/")).toBe("src");
  });

  test("returns null when there is no clean directory prefix", () => {
    expect(globToDirPrefix("**/*.test.ts")).toBeNull();
    expect(globToDirPrefix("src/**/*.ts")).toBeNull();
    expect(globToDirPrefix("*.md")).toBeNull();
    expect(globToDirPrefix("**")).toBeNull();
    expect(globToDirPrefix("src/{a,b}/**")).toBeNull();
  });

  test("rejects absolute, parent-escaping, or empty globs", () => {
    expect(globToDirPrefix("")).toBeNull();
    expect(globToDirPrefix("/etc/**")).toBeNull();
    expect(globToDirPrefix("../shared/**")).toBeNull();
  });

  test("normalizes a leading ./", () => {
    expect(globToDirPrefix("./src/**")).toBe("src");
  });
});

describe("splitCommaGlobs", () => {
  test("splits bare comma-separated globs and trims", () => {
    expect(splitCommaGlobs("src/**, *.ts ,docs/**")).toEqual(["src/**", "*.ts", "docs/**"]);
  });

  test("returns an empty array for empty/whitespace input", () => {
    expect(splitCommaGlobs("")).toEqual([]);
    expect(splitCommaGlobs("   ")).toEqual([]);
  });
});
