/**
 * Detect whether a glob is a clean directory prefix (everything under one directory)
 * and, if so, return that directory path. Otherwise return null.
 *
 * Clean prefixes:  "src/**", "src/**\/*", "packages/api/**", "src/", "./src/**"
 * Not clean:       "**\/*.test.ts", "src/**\/*.ts", "*.md", "**", "src/{a,b}/**"
 */
export function globToDirPrefix(glob: string): string | null {
  let g = glob.trim();
  if (g === "") return null;

  // Reject absolute paths and parent traversal — nested AGENTS.md must live under root.
  if (g.startsWith("/") || g.startsWith("../") || g.includes("/../")) return null;

  // Normalize a leading "./". A trailing slash marks an explicit directory
  // (e.g. "src/"), which is itself a clean prefix and needs no recursive suffix.
  if (g.startsWith("./")) g = g.slice(2);
  const trailingSlashDir = g.endsWith("/");
  if (trailingSlashDir) g = g.slice(0, -1);
  if (g === "") return null;

  if (!trailingSlashDir) {
    // Strip a single trailing recursive segment: "/**" or "/**/*".
    if (g.endsWith("/**/*")) g = g.slice(0, -"/**/*".length);
    else if (g.endsWith("/**")) g = g.slice(0, -"/**".length);
    else return null; // No recursive directory suffix => not a clean directory prefix.

    if (g === "") return null;
  }

  // The remaining prefix must contain no glob metacharacters at all.
  if (/[*?{}\[\]!]/.test(g)) return null;

  return g;
}

/**
 * Split a bare comma-separated glob string (Cursor `globs`, Copilot `applyTo`)
 * into trimmed, non-empty patterns.
 */
export function splitCommaGlobs(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
