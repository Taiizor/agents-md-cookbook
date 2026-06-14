import type { ParsedRule, NestedFile } from "./types";
import { globToDirPrefix } from "./glob";

export interface RenderOptions {
  nested: boolean;
  dropManual: boolean;
}

export interface RenderResult {
  rootBody: string;
  nestedFiles: NestedFile[];
  warnings: string[];
}

/** Stable sort by (order ?? 0) then sourceFile, preserving input order on ties. */
function sortRules(rules: ParsedRule[]): ParsedRule[] {
  return rules
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const oa = a.r.order ?? 0;
      const ob = b.r.order ?? 0;
      if (oa !== ob) return oa - ob;
      if (a.r.sourceFile !== b.r.sourceFile) return a.r.sourceFile < b.r.sourceFile ? -1 : 1;
      return a.i - b.i;
    })
    .map((x) => x.r);
}

/** Render a single rule's body, with any description lead-in, as a markdown block. */
function renderRuleBlock(rule: ParsedRule, leadIn?: string): string {
  const parts: string[] = [];
  if (rule.heading) parts.push(rule.heading);
  if (leadIn) parts.push(leadIn);
  parts.push(rule.body.trim());
  return parts.join("\n\n");
}

/** Note any excluded agents inline (Copilot excludeAgent). */
function excludeNote(rule: ParsedRule): string | null {
  const ex = rule.scope?.excludeAgent;
  if (!ex || ex.length === 0) return null;
  return `> (excluded for: ${ex.join(", ")})`;
}

/**
 * Render ordered rules into a root markdown body and nested AGENTS.md files,
 * degrading scoping metadata to prose / nested files and collecting warnings.
 */
export function rulesToMarkdown(rules: ParsedRule[], options: RenderOptions): RenderResult {
  const warnings: string[] = [];
  const inlineBlocks: string[] = [];
  const optionalBlocks: string[] = [];
  // dir prefix -> accumulated nested-file blocks
  const nestedByDir = new Map<string, string[]>();

  const ordered = sortRules(rules);
  // Always-on first, then everything else; preserve relative order within each group.
  const always = ordered.filter((r) => (r.scope?.mode ?? "always") === "always");
  const rest = ordered.filter((r) => (r.scope?.mode ?? "always") !== "always");

  for (const rule of always) {
    const block = renderRuleBlock(rule);
    const ex = excludeNote(rule);
    inlineBlocks.push(ex ? `${block}\n\n${ex}` : block);
  }

  for (const rule of rest) {
    const mode = rule.scope?.mode ?? "always";
    const ex = excludeNote(rule);

    if (mode === "glob") {
      const globs = rule.scope?.globs ?? [];
      const dir = options.nested && globs.length === 1 ? globToDirPrefix(globs[0]!) : null;
      if (dir) {
        // Route into a nested AGENTS.md under the directory prefix.
        const desc = rule.scope?.description ? `> Rule: ${rule.scope.description}` : undefined;
        const block = renderRuleBlock(rule, desc);
        const arr = nestedByDir.get(dir) ?? [];
        arr.push(ex ? `${block}\n\n${ex}` : block);
        nestedByDir.set(dir, arr);
        warnings.push(
          `Rule from ${rule.sourceFile} scoped to "${globs[0]}" moved to nested ${dir}/AGENTS.md.`,
        );
      } else {
        // Degrade to an "Applies to" prose prefix in the root body.
        const globText = globs.length > 0 ? globs.join(", ") : "(unspecified)";
        const lead = rule.scope?.description ? `> Rule: ${rule.scope.description}` : undefined;
        const applies = `Applies to \`${globText}\`:`;
        const block = renderRuleBlock(rule, lead ? `${lead}\n\n${applies}` : applies);
        inlineBlocks.push(ex ? `${block}\n\n${ex}` : block);
        warnings.push(
          `Lossy: glob scoping for ${rule.sourceFile} ("${globText}") degraded to prose; AGENTS.md has no scoping field.`,
        );
      }
      continue;
    }

    if (mode === "agent") {
      const desc = rule.scope?.description ?? "see below";
      const block = renderRuleBlock(rule, `> When relevant: ${desc}`);
      inlineBlocks.push(ex ? `${block}\n\n${ex}` : block);
      warnings.push(
        `Lossy: agent-requested activation for ${rule.sourceFile} rendered as a "When relevant" note (no equivalent in AGENTS.md).`,
      );
      continue;
    }

    // mode === "manual"
    if (options.dropManual) {
      warnings.push(`Manual/on-demand rule from ${rule.sourceFile} dropped (--drop-manual).`);
      continue;
    }
    const block = renderRuleBlock(rule);
    optionalBlocks.push(ex ? `${block}\n\n${ex}` : block);
    warnings.push(
      `Lossy: manual/on-demand rule from ${rule.sourceFile} moved under "Optional / on-demand rules".`,
    );
  }

  const sections: string[] = [];
  if (inlineBlocks.length > 0) sections.push(inlineBlocks.join("\n\n"));
  if (optionalBlocks.length > 0) {
    sections.push(`## Optional / on-demand rules\n\n${optionalBlocks.join("\n\n")}`);
  }

  const nestedFiles: NestedFile[] = [];
  for (const [dir, blocks] of [...nestedByDir.entries()].sort()) {
    nestedFiles.push({
      path: `${dir}/AGENTS.md`,
      content: `# AGENTS.md\n\n${blocks.join("\n\n")}\n`,
    });
  }

  return { rootBody: sections.join("\n\n"), nestedFiles, warnings };
}
