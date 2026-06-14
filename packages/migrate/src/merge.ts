import { createHash } from "node:crypto";

/** Stable content hash, whitespace-insensitive at the edges. */
export function hashBody(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex").slice(0, 16);
}

/** Collect ATX headings ("# ...", "## ...") not inside fenced code blocks. */
export function extractHeadings(markdown: string): string[] {
  const headings: string[] = [];
  let inFence = false;
  for (const line of markdown.split("\n")) {
    const fence = /^(```|~~~)/.test(line.trim());
    if (fence) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (/^#{1,6}\s+\S/.test(line)) {
      headings.push(line.trim());
    }
  }
  return headings;
}

interface Section {
  heading: string | null; // null = preamble before the first heading
  body: string; // includes the heading line; full block text
}

/** The body of a section with its heading line stripped (empty for pure preamble). */
function sectionContent(section: Section): string {
  if (section.heading === null) return section.body;
  const nl = section.body.indexOf("\n");
  return nl === -1 ? "" : section.body.slice(nl + 1);
}

/** Split markdown into sections keyed by their (top-level-or-any) ATX heading. */
function splitSections(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const sections: Section[] = [];
  let current: Section = { heading: null, body: "" };
  let inFence = false;

  const push = () => {
    if (current.body.trim() !== "" || current.heading !== null) {
      sections.push(current);
    }
  };

  for (const line of lines) {
    const fence = /^(```|~~~)/.test(line.trim());
    if (fence) inFence = !inFence;
    const isHeading = !inFence && /^#{1,6}\s+\S/.test(line);
    if (isHeading) {
      push();
      current = { heading: line.trim(), body: line + "\n" };
    } else {
      current.body += line + "\n";
    }
  }
  push();
  return sections;
}

/**
 * Merge `additions` into `existing` markdown, appending only sections that are
 * not already present. A section is considered a duplicate when an existing
 * section shares the same heading AND the same content hash.
 */
export function mergeSections(existing: string, additions: string): string {
  if (existing.trim() === "") return additions;
  if (additions.trim() === "") return existing;

  const existingSections = splitSections(existing);
  const existingKeys = new Set(
    existingSections
      .filter((s) => s.heading !== null)
      .map((s) => `${s.heading}::${hashBody(s.body)}`),
  );
  // Track existing content (heading line stripped) so we never re-append the same
  // bare-rule block (a plain .cursorrules/.windsurfrules with no markdown heading).
  // On a prior run such a block is appended to the root body and ends up nested
  // under the leading "# AGENTS.md" heading, so we must compare against every
  // existing section's content, not just headingless preambles.
  const existingPreambleHashes = new Set(
    existingSections
      .map((s) => sectionContent(s))
      .filter((content) => content.trim() !== "")
      .map((content) => hashBody(content)),
  );

  const newBlocks: string[] = [];
  for (const section of splitSections(additions)) {
    if (section.heading === null) {
      // Headingless preamble (bare rule file). Append only if non-empty and unseen.
      if (section.body.trim() === "") continue;
      const preambleHash = hashBody(section.body);
      if (existingPreambleHashes.has(preambleHash)) continue;
      existingPreambleHashes.add(preambleHash);
      newBlocks.push(section.body.trimEnd());
      continue;
    }
    const key = `${section.heading}::${hashBody(section.body)}`;
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    newBlocks.push(section.body.trimEnd());
  }

  if (newBlocks.length === 0) return existing;

  const base = existing.trimEnd();
  return base + "\n\n" + newBlocks.join("\n\n") + "\n";
}
