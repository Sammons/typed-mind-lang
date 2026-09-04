// Corpus: sammons/bens-almanac packages/{nhtsa,usda}-ingestion/src/handler.ts,
// whose `IngestionDeps` declares `checkSupersession` / `createPr` as function
// types authored across several source lines.
//
// `sanitizeFieldType` ended in a bare `fieldType.trim()`, which strips only the
// LEADING and TRAILING whitespace run — every interior newline and indent
// survived into the emitted DTO field. A DTO field line in the grammar is
// single-line (`- name: type`), so those interior newlines split one field
// across several lines: the leading fragments become `syntax/error`s and the
// trailing one an unparsable stray.
//
// `singleLineTarget` is the control: the same shape authored on one line. It
// emitted correctly before the fix and must be unchanged by it, which is what
// isolates the defect to the multi-line form.
export interface PrContent {
  title: string;
}

export interface SupersessionDeps {
  checkSupersession: (
    make: string,
    model: string,
    yearRange: [number, number],
  ) => Promise<{ ruleId: string; severity: string } | null>;
  singleLineTarget: (make: string, model: string) => Promise<number>;
  createPr: (
    content: PrContent,
    files: Array<{ path: string; content: string }>,
  ) => Promise<number>;
}

export const runSupersession = (deps: SupersessionDeps): void => {
  void deps;
};
