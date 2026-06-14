import { test, expect, describe } from "bun:test";
import { parseDocument } from "../../src/document.ts";
import { inlineSecretRule } from "../../src/rules/inline-secret.ts";

describe("AMC-SECRET", () => {
  test("detects an AWS access key id", () => {
    const doc = parseDocument("# P\n\nKey: AKIAIOSFODNN7EXAMPLE\n", {
      filename: "AGENTS.md",
    });
    const f = inlineSecretRule.check(doc);
    expect(f[0]!.ruleId).toBe("AMC-SECRET");
    expect(f[0]!.severity).toBe("error");
  });

  test("detects a private key header", () => {
    const doc = parseDocument(
      "# P\n\n```\n-----BEGIN RSA PRIVATE KEY-----\n```\n",
      { filename: "AGENTS.md" },
    );
    expect(inlineSecretRule.check(doc).length).toBeGreaterThan(0);
  });

  test("detects a generic api key assignment", () => {
    const doc = parseDocument(
      '# P\n\napi_key = "sk_live_0123456789abcdef0123456789"\n',
      { filename: "AGENTS.md" },
    );
    const f = inlineSecretRule.check(doc);
    expect(f.length).toBeGreaterThan(0);
  });

  test("reports the line number", () => {
    const doc = parseDocument("# P\n\nline2\nAKIAIOSFODNN7EXAMPLE\n", {
      filename: "AGENTS.md",
    });
    const f = inlineSecretRule.check(doc);
    expect(f[0]!.line).toBe(4);
  });

  test("passes on a clean file with the word 'secret' but no value", () => {
    const doc = parseDocument("# P\n\nNever commit secrets to the repo.\n", {
      filename: "AGENTS.md",
    });
    expect(inlineSecretRule.check(doc)).toEqual([]);
  });
});
