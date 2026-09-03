// Distilled from itp-maker `functions/procore-worker.ts:149-165`
// (`ProcoreWorkerPayload`). RC-D (issue #101, fixture 40) routed a DTO
// field whose type is a BARE inline object literal through
// `synthesizeInlineDTO`. The guard it added is
// `isInlineObjectLiteralType`, which requires the trimmed type text to
// both start with `{` and end with `}`. A field whose object literal is
// WRAPPED in a generic — `Array<{ ... }>`, the single most common way a
// real interface carries a list of inline records — starts with `A`, so
// the guard says false and the field falls through to
// `sanitizeFieldType`, whose final statement is `fieldType.trim()`.
// The raw source text, newlines and all, lands in the emitted DTO field
// line and the grammar's single-line field production desyncs.
//
// `references` below reproduces the multi-line form (4 unparsable lines
// on the real target); `defaultAssignees` reproduces the single-line
// form, which fails differently — no newline, but the inner `{ type:
// "user" | "vendor"; id: number }` is still raw object-literal text in a
// position the grammar reads as an entity name.

export interface WorkerPayload {
  jobId: string;
  references: Array<{
    sectionIndex: number;
    itemIndex: number;
    documentName: string;
  }>;
  defaultAssignees: Array<{ type: "user" | "vendor"; id: number }>;
}

export const runWorker = (payload: WorkerPayload): number => {
  return payload.references.length + payload.defaultAssignees.length;
};
