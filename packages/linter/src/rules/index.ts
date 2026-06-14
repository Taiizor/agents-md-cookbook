import type { Rule } from "../types.ts";
import { validMarkdownRule } from "./valid-markdown.ts";
import { filenameRule } from "./filename.ts";
import { nonEmptyRule } from "./non-empty.ts";
import { headingsRule } from "./headings.ts";
import { recommendedSectionsRule } from "./recommended-sections.ts";
import { byteCapRule } from "./byte-cap.ts";
import { windsurfCharsRule } from "./windsurf-chars.ts";
import { lineBudgetRule } from "./line-budget.ts";
import { vaguePlatitudesRule } from "./vague-platitudes.ts";
import { executableCommandRule } from "./executable-command.ts";
import { versionSpecificsRule } from "./version-specifics.ts";
import { nakedDontsRule } from "./naked-donts.ts";
import { inlineSecretRule } from "./inline-secret.ts";
import { frontmatterRule } from "./frontmatter.ts";
import {
  referencedPathsRule,
  referencedScriptsRule,
  staleMarkersRule,
} from "./freshness.ts";

/** Every rule the linter ships. */
export const allRules: Rule[] = [
  validMarkdownRule,
  filenameRule,
  nonEmptyRule,
  headingsRule,
  recommendedSectionsRule,
  byteCapRule,
  windsurfCharsRule,
  lineBudgetRule,
  vaguePlatitudesRule,
  executableCommandRule,
  versionSpecificsRule,
  nakedDontsRule,
  inlineSecretRule,
  frontmatterRule,
  referencedPathsRule,
  referencedScriptsRule,
  staleMarkersRule,
];

/** Rules requiring repo context (freshness). */
export const freshnessRules: Rule[] = allRules.filter(
  (r) => r.requiresRepo === true,
);

/** Rules that run without repo context. */
export const standaloneRules: Rule[] = allRules.filter(
  (r) => r.requiresRepo !== true,
);
