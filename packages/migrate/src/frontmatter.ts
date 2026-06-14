import { parse as parseYaml } from "yaml";

export interface Frontmatter {
  data: Record<string, unknown>;
  body: string;
}

/**
 * Split a leading `--- ... ---` YAML frontmatter fence from a markdown document.
 * Returns parsed `data` (empty object when absent or unparseable) and the remaining `body`.
 * Only a fence at the very start of the document (after an optional BOM) is treated as
 * frontmatter; a `---` later in the file is a horizontal rule and left in the body.
 */
export function parseFrontmatter(text: string): Frontmatter {
  // Strip a UTF-8 BOM if present so the fence can be matched at index 0.
  const stripped = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  // Match an opening fence on its own line, the YAML block, then a closing fence.
  // Allow CRLF or LF. The body is everything after the closing fence's line break.
  const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(stripped);
  if (!match) {
    return { data: {}, body: text };
  }

  const yamlSource = match[1] ?? "";
  const body = stripped.slice(match[0].length);

  let data: Record<string, unknown> = {};
  try {
    const parsed = parseYaml(yamlSource);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      data = parsed as Record<string, unknown>;
    }
  } catch {
    // Malformed YAML => treat as no usable metadata, but keep the body intact.
    data = {};
  }

  return { data, body };
}
