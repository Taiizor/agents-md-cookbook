import { test, expect, describe } from "bun:test";
import { parseDocument } from "../../src/document.ts";
import {
  recommendedSectionsRule,
  DEFAULT_REQUIRED_SECTIONS,
} from "../../src/rules/recommended-sections.ts";

const FULL = `# Project

## Setup commands
\`\`\`bash
bun install
\`\`\`

## Testing instructions
Run \`bun test\`.

## Project structure
Monorepo with packages.

## Code style
Use prettier.

## Git workflow
Conventional commits.

## Boundaries
- Always: run tests.
- Ask first: schema changes.
- Never: commit secrets.
`;

describe("AGM-002 recommended-sections", () => {
  test("passes when all default sections are present", () => {
    const doc = parseDocument(FULL, { filename: "AGENTS.md" });
    const f = recommendedSectionsRule.check(doc);
    expect(f.filter((x) => x.severity === "warn")).toEqual([]);
  });

  test("warns once per missing recommended section", () => {
    const doc = parseDocument("# Project\n\n## Setup commands\nbun install\n", {
      filename: "AGENTS.md",
    });
    const f = recommendedSectionsRule.check(doc);
    const warns = f.filter((x) => x.severity === "warn");
    expect(warns.length).toBe(DEFAULT_REQUIRED_SECTIONS.length - 1);
    expect(warns.every((x) => x.ruleId === "AGM-002")).toBe(true);
  });

  test("matches sections by synonym (Build and test commands satisfies Testing)", () => {
    const doc = parseDocument(
      "# P\n\n## Build and test commands\nbun test\n",
      { filename: "AGENTS.md" },
    );
    const f = recommendedSectionsRule.check(doc);
    const missing = f.map((x) => x.message);
    expect(missing.some((m) => m.includes("Testing"))).toBe(false);
  });

  test("honors a configurable required set", () => {
    const doc = parseDocument("# P\n\n## Code style\nprettier\n", {
      filename: "AGENTS.md",
    });
    const f = recommendedSectionsRule.check(doc, { required: ["Code Style"] });
    expect(f.filter((x) => x.severity === "warn")).toEqual([]);
  });

  test("suggests three-tier boundaries (INFO) when boundaries lack all tiers", () => {
    const doc = parseDocument(
      "# P\n\n## Boundaries\n- Never commit secrets.\n",
      { filename: "AGENTS.md" },
    );
    const f = recommendedSectionsRule.check(doc);
    expect(
      f.some((x) => x.severity === "info" && x.message.includes("three-tier")),
    ).toBe(true);
  });
});
