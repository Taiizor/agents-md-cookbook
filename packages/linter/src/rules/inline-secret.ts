import type { Rule, Finding } from "../types.ts";

interface SecretPattern {
  name: string;
  pattern: RegExp;
}

/** High-signal secret patterns; deliberately conservative to avoid noise. */
const SECRET_PATTERNS: SecretPattern[] = [
  { name: "AWS access key id", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    name: "private key header",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/,
  },
  {
    name: "Stripe/live API key",
    pattern: /\bsk_(?:live|test)_[0-9a-zA-Z]{16,}\b/,
  },
  {
    name: "GitHub token",
    pattern: /\bgh[pousr]_[0-9A-Za-z]{36,}\b/,
  },
  {
    name: "generic API key assignment",
    pattern:
      /\b(?:api[_-]?key|secret|token|password|passwd|access[_-]?token)\b\s*[:=]\s*["']?[0-9A-Za-z._\-]{16,}["']?/i,
  },
];

/**
 * AMC-SECRET: error when an inlined credential is detected. Anything in
 * AGENTS.md is read (and may be echoed) by agents, so secrets must never live
 * here. Plain prose like "never commit secrets" (no value) does not match.
 */
export const inlineSecretRule: Rule = {
  id: "AMC-SECRET",
  severity: "error",
  description: "Detect inlined secrets (AWS keys, private keys, API tokens).",
  check(doc): Finding[] {
    const findings: Finding[] = [];
    doc.lines.forEach((lineText, idx) => {
      for (const { name, pattern } of SECRET_PATTERNS) {
        if (pattern.test(lineText)) {
          findings.push({
            ruleId: "AMC-SECRET",
            severity: "error",
            message: `Possible inlined secret (${name}) on this line. Remove it; AGENTS.md is read verbatim by agents.`,
            line: idx + 1,
            fix: "Delete the secret and reference an env var or secret manager instead.",
          });
          break;
        }
      }
    });
    return findings;
  },
};
