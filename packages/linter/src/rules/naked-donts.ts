import type { Rule, Finding } from "../types.ts";

/** Default thresholds for the don't:do ratio rule. */
export const MAX_DONTS = 20;
export const MAX_DONT_RATIO = 1;

const DONT_PATTERN = /\b(never|do not|don't|do not ever|avoid|no )\b/gi;
// "do " uses a negative lookahead so the "do" in "do not" is not miscounted
// as a positive instruction (that phrase is already a prohibition).
const DO_PATTERN = /\b(always|do(?! not)\s|use |run |prefer |ensure |make sure)\b/gi;

function countMatches(text: string, pattern: RegExp): number {
  const m = text.match(pattern);
  return m ? m.length : 0;
}

/**
 * AMC-DONTS: warn when there are more than MAX_DONTS prohibitions, or when the
 * don't:do ratio exceeds MAX_DONT_RATIO. Excessive naked don'ts slow agents.
 */
export const nakedDontsRule: Rule = {
  id: "AMC-DONTS",
  severity: "warn",
  description: "Flag too many naked don'ts or a high don't:do ratio.",
  check(doc, config): Finding[] {
    const maxDonts = (config?.maxDonts as number | undefined) ?? MAX_DONTS;
    const maxRatio = (config?.maxRatio as number | undefined) ?? MAX_DONT_RATIO;
    const lower = doc.raw.toLowerCase();
    const donts = countMatches(lower, DONT_PATTERN);
    const dos = countMatches(lower, DO_PATTERN);

    if (donts > maxDonts) {
      return [
        {
          ruleId: "AMC-DONTS",
          severity: "warn",
          message: `${donts} prohibitions found (>${maxDonts}). Trim and pair each "never" with a positive "do".`,
          line: 1,
          fix: "Convert don'ts into do-this-instead guidance.",
        },
      ];
    }
    if (donts >= 3 && dos > 0 && donts / dos > maxRatio) {
      return [
        {
          ruleId: "AMC-DONTS",
          severity: "warn",
          message: `High don't:do ratio (${donts} don'ts vs ${dos} dos). Pair prohibitions with positive guidance.`,
          line: 1,
          fix: "Add positive do-this instructions alongside the don'ts.",
        },
      ];
    }
    if (donts >= 3 && dos === 0) {
      return [
        {
          ruleId: "AMC-DONTS",
          severity: "warn",
          message: `${donts} naked don'ts with no positive "do" guidance. Pair each don't with a do.`,
          line: 1,
          fix: "Add positive do-this instructions alongside the don'ts.",
        },
      ];
    }
    return [];
  },
};
