#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { detect, convert } from "./orchestrator";
import { SourceFormat, type ConvertOptions } from "./types";

interface CliFlags {
  root: string;
  out: string;
  dryRun: boolean;
  nested: boolean;
  dropManual: boolean;
  format: "text" | "json";
  only: SourceFormat[];
}

const KNOWN_FORMATS = new Set<string>(Object.values(SourceFormat));

function parseArgs(argv: string[]): CliFlags {
  const flags: CliFlags = {
    root: ".",
    out: "AGENTS.md",
    dryRun: false,
    nested: true,
    dropManual: false,
    format: "text",
    only: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--root":
        flags.root = argv[++i] ?? ".";
        break;
      case "--out":
        flags.out = argv[++i] ?? "AGENTS.md";
        break;
      case "--dry-run":
        flags.dryRun = true;
        break;
      case "--nested":
        flags.nested = true;
        break;
      case "--no-nested":
        flags.nested = false;
        break;
      case "--drop-manual":
        flags.dropManual = true;
        break;
      case "--format":
        flags.format = argv[++i] === "json" ? "json" : "text";
        break;
      case "--only": {
        const value = argv[++i] ?? "";
        flags.only = value
          .split(",")
          .map((s) => s.trim())
          .filter((s) => KNOWN_FORMATS.has(s)) as SourceFormat[];
        break;
      }
      default:
        // Ignore unknown flags for forward-compat.
        break;
    }
  }
  return flags;
}

/** Run the migrate CLI. Returns a process exit code. */
export async function run(argv: string[]): Promise<number> {
  const flags = parseArgs(argv);

  const detected = detect(flags.root);
  if (detected.length === 0) {
    console.log("No known legacy rule files found. Nothing to convert.");
    return 0;
  }

  const options: ConvertOptions = {
    root: flags.root,
    out: flags.out,
    nested: flags.nested,
    dropManual: flags.dropManual,
    only: flags.only,
  };
  const result = convert(options);

  if (flags.format === "json") {
    console.log(JSON.stringify(result, null, 2));
    if (!flags.dryRun) writeOutputs(flags, result.rootAgentsMd, result.nestedFiles);
    return 0;
  }

  if (flags.dryRun) {
    console.log(`# Dry run — would write ${flags.out}:`);
    console.log(result.rootAgentsMd);
    for (const f of result.nestedFiles) {
      console.log(`\n# Dry run — would write ${f.path}:`);
      console.log(f.content);
    }
  } else {
    writeOutputs(flags, result.rootAgentsMd, result.nestedFiles);
  }

  // Summary.
  const formatList = detected.map((d) => `${d.format} (${d.files.length})`).join(", ");
  console.log(`\nConverted formats: ${formatList}`);
  console.log(`Wrote: ${flags.out}${flags.dryRun ? " (dry run)" : ""}`);
  if (result.nestedFiles.length > 0) {
    console.log(`Nested files: ${result.nestedFiles.map((f) => f.path).join(", ")}`);
  }
  if (result.warnings.length > 0) {
    console.log(`\nWarnings (${result.warnings.length}):`);
    for (const w of result.warnings) console.log(`  - ${w}`);
  }
  return 0;
}

function writeOutputs(
  flags: CliFlags,
  rootContent: string,
  nestedFiles: { path: string; content: string }[],
): void {
  writeFileSync(join(flags.root, flags.out), rootContent, "utf8");
  if (!flags.nested) return;
  for (const f of nestedFiles) {
    const abs = join(flags.root, f.path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, f.content, "utf8");
  }
}

// `import.meta.main` is provided at runtime by Bun and by Node (>=20.11),
// but the standard `@types/node` ImportMeta type does not declare it.
declare global {
  interface ImportMeta {
    main?: boolean;
  }
}

// Self-invoke when run as a binary (not when imported by tests).
if (import.meta.main) {
  run(process.argv.slice(2)).then((code) => process.exit(code));
}
