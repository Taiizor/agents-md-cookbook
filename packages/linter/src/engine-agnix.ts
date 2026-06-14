import { spawnSync } from "node:child_process";
import type { Finding, Severity } from "./types.ts";

/** Map agnix severity strings onto our Severity union. */
function mapSeverity(level: string): Severity {
  const l = level.toLowerCase();
  if (l === "error" || l === "err") return "error";
  if (l === "warning" || l === "warn") return "warn";
  return "info";
}

/** Is the `agnix` binary on PATH? */
export function isAgnixAvailable(): boolean {
  try {
    const probe = spawnSync("agnix", ["--version"], { stdio: "ignore" });
    return probe.status === 0 || probe.status === null
      ? probe.error == null
      : false;
  } catch {
    return false;
  }
}

/** Convert agnix JSON stdout into our Finding[] shape. */
export function mapAgnixOutput(stdout: string): Finding[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return [];
  }
  const raw = (parsed as { findings?: unknown }).findings;
  if (!Array.isArray(raw)) return [];
  const findings: Finding[] = [];
  for (const item of raw) {
    const obj = item as Record<string, unknown>;
    const ruleId = typeof obj.rule === "string" ? obj.rule : "AGNIX";
    const message = typeof obj.message === "string" ? obj.message : "";
    const level = typeof obj.level === "string" ? obj.level : "info";
    const finding: Finding = {
      ruleId,
      severity: mapSeverity(level),
      message,
    };
    if (typeof obj.line === "number") finding.line = obj.line;
    if (typeof obj.column === "number") finding.column = obj.column;
    findings.push(finding);
  }
  return findings;
}

/** Run agnix on a file and return mapped findings; [] if unavailable/errored. */
export function runAgnix(file: string): Finding[] {
  if (!isAgnixAvailable()) return [];
  try {
    const proc = spawnSync("agnix", ["--format", "json", file], {
      encoding: "utf8",
    });
    if (proc.error || typeof proc.stdout !== "string") return [];
    return mapAgnixOutput(proc.stdout);
  } catch {
    return [];
  }
}
