// Corpus: sammons/mail-agent `src/harness/singleton.ts:338` (`HarnessDeps`'s
// `executeMutation`) and `src/store/revert.ts:143` (`Reverters`'s
// `modifyLabels`) — an injected-collaborator dependency bag, the house style
// for constructor injection (knowledge/pillars/main.md
// `inject_interfaces_not_implementations`). Such a field's function type is
// authored across lines once it carries more than two parameters.
//
// `sanitizeFieldType`'s fallthrough was a bare `.trim()`: it trims the ends and
// leaves every interior newline and indent intact, so the raw source text
// landed verbatim in the emitted field line and desynced the grammar's
// single-line `- name: Type` production. The checker reported
// `Unparsable text: '=> Promise<void>'` on the continuation lines.
//
// Two sibling paths already collapse the same shape and prove this one is the
// gap: a multi-line inline OBJECT literal field routes to `synthesizeInlineDTO`
// (issue #101 / fixture RC-D), and a multi-line function SIGNATURE is collapsed
// by the analyzer's `buildFunctionSignature` (issue #86). A multi-line function
// type in a DTO FIELD was the third authoring surface and the only one left.
//
// `AliasForm` covers the same defect reached through the type-alias lane rather
// than the DTO-field lane; the trailing comma after the last parameter is legal
// multi-line TypeScript but illegal once collapsed onto one line.
//
// `singleLineControl` is the control: authored on one line, it already emitted
// correctly and must be byte-identical to the collapsed multi-line form.
export type HarnessDeps = {
  executeMutation: (
    messageId: string,
    add: string[],
    remove: string[],
  ) => Promise<void>;
  singleLineControl: (messageId: string, add: string[], remove: string[]) => Promise<void>;
  assertRendered: AliasForm;
};

export type AliasForm = (
  messageId: string,
  renderedIds: ReadonlySet<string>,
) => void;

export const run = (deps: HarnessDeps, assert: AliasForm): boolean => {
  return Boolean(deps && assert);
};
