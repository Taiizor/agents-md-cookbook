export {
  SourceFormat,
  type ScopeMode,
  type Scope,
  type ParsedRule,
  type NestedFile,
  type ConversionResult,
  type DetectedSource,
  type ConvertOptions,
} from "./types";

export { detect, convert } from "./orchestrator";

export { detectCursor, convertCursor } from "./converters/cursor";
export { detectClaude, convertClaude } from "./converters/claude";
export { detectWindsurf, convertWindsurf } from "./converters/windsurf";
export { detectCopilot, convertCopilot } from "./converters/copilot";
export { detectCline, convertCline } from "./converters/cline";
export { detectAider, convertAider } from "./converters/aider";

export { parseFrontmatter } from "./frontmatter";
export { globToDirPrefix, splitCommaGlobs } from "./glob";
export { mergeSections, hashBody, extractHeadings } from "./merge";
export { rulesToMarkdown } from "./rules";
