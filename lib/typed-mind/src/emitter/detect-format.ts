// RFC-TM-4 §2 (rfc-tm-4-diamond.md) — detectFormat "ports as-is, scoring
// brace-block headers (both keyword and sigil forms) as longform markers."
// Line-classification duplicated locally (not imported from the legacy
// parser-patterns.ts TM-4 deletes, matching the cst-to-ast.ts precedent) with
// one addition beyond the legacy LONGFORM_DECLARATION regex
// (parser-patterns.ts, missing a `classfile` arm): the sigil-with-brace
// ClassFile header (`Name #: path {`, ending the line in an opening brace)
// scores as longform too — this is the fix for the TM-2-era round-trip break
// the RFC names (legacy's regex-only detector had no classfile longform arm
// at all, keyword or sigil).

export type SyntaxFormat = 'shortform' | 'longform' | 'mixed';

export interface FormatDetectionResult {
  readonly format: SyntaxFormat;
  readonly shortformLines: number;
  readonly longformLines: number;
  readonly totalLines: number;
  readonly confidence: number;
}

// Verbatim duplicate of the legacy GENERAL_PATTERNS.ENTITY_DECLARATION /
// CONTINUATION probes (parser-patterns.ts) — the pipeline/emitter never
// imports the legacy parser modules TM-4 deletes.
const ENTITY_DECLARATION_PATTERN = /^[@\w\-/]+\s*(->|@|<:|#:|!|::|%|~|&|\$|\^|\s*:)/;
const CONTINUATION_PATTERN = /^\s+(->|<-|~>|=>|>>|>|<|~|"|#|-|=|\$<)/;

// Legacy LONGFORM_DECLARATION keyword set plus `classfile` (the keyword the
// legacy regex omitted — longform-builder.ts's LONGFORM_KIND_BY_KEYWORD has
// carried it since TM-3) plus `typedef` (X-TYPE-7, rfc-tm-8-diamond.md §5 —
// added to LONGFORM_KIND_BY_KEYWORD when TypeDef shipped, but never added
// here; toggle-fidelity audit 2026-08-31, claude-home knowledge/projects/
// typedmind/toggle-fidelity-audit-2026-08-31.md, found a pure-`typedef`
// longform document undercounted to zero longform lines and misdetected as
// shortform — same class of gap this file's own header comment already
// documents fixing once for `classfile`). Keep this pattern's keyword set a
// superset of longform-builder.ts's LONGFORM_KIND_BY_KEYWORD keys (`import`
// is the one exception: it has its own statement grammar, not an entity
// kind, so it is not a LONGFORM_KIND_BY_KEYWORD member but IS still a
// longform-only keyword worth detecting here).
const LONGFORM_KEYWORD_PATTERN =
  /^(program|file|function|class|classfile|dto|component|asset|constants|parameter|import|dependency|typedef)\s+/;

// The sigil-with-brace ClassFile header (`Name #: path {`, optionally with
// `<: inherit_list`), ending the line in an opening brace: a longform marker
// with no keyword at all (classfile_block_sigil, grammar.js).
const SIGIL_BLOCK_HEADER_PATTERN = /^[@\w\-/]+\s*#:\s*\S+.*\{\s*$/;

// Verbatim duplicate of the legacy per-entity shortform probes
// (parser-patterns.ts ENTITY_PATTERNS), used only to disambiguate a line that
// matched ENTITY_DECLARATION but might actually be a shortform sigil line vs.
// noise.
const SHORTFORM_ENTITY_PATTERNS: readonly RegExp[] = [
  /^[@\w\-/]+\s*->/, // Program
  /^[@\w\-/]+\s*@/, // File
  /^[@\w\-/]+\s*::/, // Function
  /^[@\w\-/]+\s*<:/, // Class
  /^[@\w\-/]+\s*#:/, // ClassFile
  /^[@\w\-/]+\s*!/, // Constants
  /^[@\w\-/]+\s*%/, // DTO
  /^[@\w\-/]+\s*~/, // Asset
  /^[@\w\-/]+\s*&/, // UIComponent
  /^[@\w\-/]+\s*\$/, // RunParameter
  /^[@\w\-/]+\s*\^/, // Dependency
];

const isShortformEntityLine = (line: string): boolean => {
  return SHORTFORM_ENTITY_PATTERNS.some((pattern) => pattern.test(line));
};

export const detectFormat = (content: string): FormatDetectionResult => {
  const lines = content.split('\n');
  let shortformLines = 0;
  let longformLines = 0;
  let totalSignificantLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }
    totalSignificantLines++;
    if (LONGFORM_KEYWORD_PATTERN.test(trimmed) || SIGIL_BLOCK_HEADER_PATTERN.test(trimmed)) {
      longformLines++;
      continue;
    }
    if (ENTITY_DECLARATION_PATTERN.test(trimmed) && isShortformEntityLine(trimmed)) {
      shortformLines++;
      continue;
    }
    // Continuation lines are neutral (either format); anything else falls
    // through uncounted, matching the legacy detector.
    if (CONTINUATION_PATTERN.test(line)) {
    }
  }

  const shortformRatio = totalSignificantLines > 0 ? shortformLines / totalSignificantLines : 0;
  const longformRatio = totalSignificantLines > 0 ? longformLines / totalSignificantLines : 0;

  let format: SyntaxFormat;
  let confidence: number;
  if (shortformLines === 0 && longformLines === 0) {
    format = 'shortform';
    confidence = 0.5;
  } else if (longformLines === 0 && shortformLines > 0) {
    format = 'shortform';
    confidence = 1.0;
  } else if (shortformLines === 0 && longformLines > 0) {
    format = 'longform';
    confidence = 1.0;
  } else if (shortformRatio > 0.6) {
    format = 'shortform';
    confidence = shortformRatio;
  } else if (longformRatio > 0.6) {
    format = 'longform';
    confidence = longformRatio;
  } else {
    format = 'mixed';
    confidence = 1.0 - Math.abs(shortformRatio - longformRatio);
  }

  return { format, shortformLines, longformLines, totalLines: totalSignificantLines, confidence };
};
