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

  const newBlocks: string[] = [];
  for (const section of splitSections(additions)) {
    if (section.heading === null) {
      // Preamble in additions is uncommon; append only if non-empty and unseen.
      if (section.body.trim() !== "") newBlocks.push(section.body.trimEnd());
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
