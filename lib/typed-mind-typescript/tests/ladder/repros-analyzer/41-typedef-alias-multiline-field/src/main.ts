// RC-D repro (ladder-diagnostic-disposition-2026-08-29.md rank 3, issue
// #101) — distilled verbatim from the real webhookstorage clone's
// `packages/ingest/src/types.ts`: a type alias whose sole field is itself
// an inline object literal authored across multiple source lines.
// `convertTypeAliasToDTO`'s object-like branch used to route through
// `parseTypeToFields`/`parseObjectProperties`, an older field parser with
// no `isInlineObjectLiteralType` check and no nested-literal recursion —
// it emitted a bare, unterminated `{` as the field's type text ("Missing
// `}`").
export type IngestEnv = {
  Variables: {
    requestId: string;
    endpointId: string;
    tenantId: string;
    payloadSizeBytes: number;
    errorCode: string;
    idempotencyHit: boolean;
  };
};
