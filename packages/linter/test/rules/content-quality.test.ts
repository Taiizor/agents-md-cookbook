import { test, expect, describe } from "bun:test";
import { parseDocument } from "../../src/document.ts";
import { vaguePlatitudesRule } from "../../src/rules/vague-platitudes.ts";
import { executableCommandRule } from "../../src/rules/executable-command.ts";
import { versionSpecificsRule } from "../../src/rules/version-specifics.ts";
import { nakedDontsRule } from "../../src/rules/naked-donts.ts";

describe("AMC-PLATITUDE", () => {
  test("warns on each distinct platitude", () => {
    const doc = parseDocument(
      "# P\n\nWrite clean code and follow best practices. Be helpful.\n",
      { filename: "AGENTS.md" },
    );
    const f = vaguePlatitudesRule.check(doc);
    expect(f.length).toBeGreaterThanOrEqual(2);
    expect(f.every((x) => x.ruleId === "AMC-PLATITUDE")).toBe(true);
    expect(f[0]!.severity).toBe("warn");
  });

  test("passes with concrete instructions", () => {
    const doc = parseDocument(
      "# P\n\nRun `bun test` before pushing. Use 2-space indent.\n",
      { filename: "AGENTS.md" },
    );
    expect(vaguePlatitudesRule.check(doc)).toEqual([]);
  });
});

describe("AMC-CMD", () => {
  test("passes when a runnable command exists", () => {
    const doc = parseDocument(
      "# P\n\n## Setup\n```bash\nbun install --frozen-lockfile\n```\n",
      { filename: "AGENTS.md" },
    );
    expect(executableCommandRule.check(doc)).toEqual([]);
  });

  test("warns when there are no runnable commands", () => {
    const doc = parseDocument("# P\n\nThis project is a website.\n", {
      filename: "AGENTS.md",
    });
    const f = executableCommandRule.check(doc);
    expect(f[0]!.ruleId).toBe("AMC-CMD");
    expect(f[0]!.severity).toBe("warn");
  });
});

describe("AMC-VERSION", () => {
  test("info when a known tool has no version pin anywhere", () => {
    const doc = parseDocument(
      "# P\n\nUse node and bun.\n```bash\nbun install\n```\n",
      { filename: "AGENTS.md" },
    );
    const f = versionSpecificsRule.check(doc);
    expect(f[0]!.ruleId).toBe("AMC-VERSION");
    expect(f[0]!.severity).toBe("info");
  });

  test("passes when a version number is present", () => {
    const doc = parseDocument(
      "# P\n\nRequires Node 20.11 and Bun 1.1.\n```bash\nbun install\n```\n",
      { filename: "AGENTS.md" },
    );
    expect(versionSpecificsRule.check(doc)).toEqual([]);
  });
});

describe("AMC-DONTS", () => {
  test("warns when >20 don'ts appear", () => {
    const donts = Array.from({ length: 21 }, (_, i) => `- Never do thing ${i}.`).join("\n");
    const doc = parseDocument(`# P\n\n## Boundaries\n${donts}\n`, {
      filename: "AGENTS.md",
    });
    const f = nakedDontsRule.check(doc);
    expect(f[0]!.ruleId).toBe("AMC-DONTS");
    expect(f[0]!.severity).toBe("warn");
  });

  test("warns when don't:do ratio is high", () => {
    const doc = parseDocument(
      "# P\n\n- Never commit secrets.\n- Do not push to main.\n- Don't skip tests.\n- Always run tests.\n",
      { filename: "AGENTS.md" },
    );
    const f = nakedDontsRule.check(doc);
    expect(f.length).toBe(1);
  });

  test("passes with balanced do/don't", () => {
    const doc = parseDocument(
      "# P\n\n- Always run `bun test`.\n- Do format with prettier.\n- Never commit secrets.\n",
      { filename: "AGENTS.md" },
    );
    expect(nakedDontsRule.check(doc)).toEqual([]);
  });
});
