export interface FixResult {
  content: string;
  changed: boolean;
  /** Names of the fixes that were applied. */
  applied: string[];
}

/** A line is a bare command if it alone looks like a runnable shell command. */
const BARE_COMMAND =
  /^(npx|bunx|bun|npm|pnpm|yarn|node|deno|python|python3|pip|pip3|uv|uvx|poetry|pytest|go|cargo|make|mvn|gradle|docker|git|tsc|eslint|prettier|ruff|black|mypy|jest|vitest)\b.*$/;

function stripTrailingWhitespace(content: string): { out: string; changed: boolean } {
  const lines = content.split("\n");
  const fixed = lines.map((l) => l.replace(/[ \t]+$/, ""));
  const changed = fixed.some((l, i) => l !== lines[i]);
  return { out: fixed.join("\n"), changed };
}

function normalizeFinalNewline(content: string): { out: string; changed: boolean } {
  const out = content.replace(/\n*$/, "\n");
  return { out, changed: out !== content };
}

/**
 * Wrap standalone bare command lines (surrounded by blank lines / boundaries
 * and not already inside a fence) in a ```bash fence. Conservative: only acts
 * on a line that is, by itself, an obvious command.
 */
function wrapBareCommands(content: string): { out: string; changed: boolean } {
  const lines = content.split("\n");
  const result: string[] = [];
  let inFence = false;
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      result.push(line);
      continue;
    }
    const prev = lines[i - 1];
    const next = lines[i + 1];
    const isolated =
      (prev === undefined || prev.trim() === "") &&
      (next === undefined || next.trim() === "");
    if (!inFence && isolated && BARE_COMMAND.test(line.trim())) {
      result.push("```bash");
      result.push(line.trim());
      result.push("```");
      changed = true;
    } else {
      result.push(line);
    }
  }
  return { out: result.join("\n"), changed };
}

/**
 * Apply only HIGH-confidence, safe autofixes. Filename casing and content
 * rewrites are intentionally NOT autofixed (advisory only).
 */
export function applyFixes(raw: string): FixResult {
  const applied: string[] = [];
  let content = raw;

  const ws = stripTrailingWhitespace(content);
  if (ws.changed) {
    content = ws.out;
    applied.push("trailing-whitespace");
  }

  const wrap = wrapBareCommands(content);
  if (wrap.changed) {
    content = wrap.out;
    applied.push("wrap-bare-command");
  }

  const nl = normalizeFinalNewline(content);
  if (nl.changed) {
    content = nl.out;
    applied.push("final-newline");
  }

  return { content, changed: applied.length > 0, applied };
}
