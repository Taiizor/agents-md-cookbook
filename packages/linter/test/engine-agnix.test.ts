import { test, expect, describe } from "bun:test";
import {
  isAgnixAvailable,
  mapAgnixOutput,
  runAgnix,
} from "../src/engine-agnix.ts";

describe("engine-agnix", () => {
  test("mapAgnixOutput converts agnix JSON findings to Finding[]", () => {
    const sample = JSON.stringify({
      findings: [
        { rule: "AGM-001", level: "error", message: "bad md", line: 3 },
        { rule: "AGM-002", level: "warning", message: "missing section" },
      ],
    });
    const findings = mapAgnixOutput(sample);
    expect(findings).toEqual([
      {
        ruleId: "AGM-001",
        severity: "error",
        message: "bad md",
        line: 3,
      },
      {
        ruleId: "AGM-002",
        severity: "warn",
        message: "missing section",
      },
    ]);
  });

  test("mapAgnixOutput returns [] on unparseable output", () => {
    expect(mapAgnixOutput("not json")).toEqual([]);
  });

  test("isAgnixAvailable returns a boolean and does not throw", () => {
    expect(typeof isAgnixAvailable()).toBe("boolean");
  });

  test("runAgnix returns [] when the binary is absent", () => {
    if (isAgnixAvailable()) {
      // If agnix happens to be installed, just assert it returns an array.
      expect(Array.isArray(runAgnix("AGENTS.md"))).toBe(true);
    } else {
      expect(runAgnix("AGENTS.md")).toEqual([]);
    }
  });
});
