# 109-ambient-builtin-io

RFC-TM-13 residual R7/R8. Function parameters and return types that are
ambient platform types (`Date`, `Response`, `Promise<Response>`, `Buffer`,
`Map<string, Thing>`) must not become `input`/`output` DTO edges, and DTO
fields typed `Buffer`/`ReadableStream` must not report an undefined type.

Mirrors the live findings:
- `packages/functions/src/shared/storage-usage.ts:16` `formatUtcDate(date: Date)`
  (webhookstorage api) — `Function input DTO 'Date' not found`;
- `Promise<Response>` handlers in webhookstorage web-main/web-app —
  `Function output DTO 'Response' not found`;
- `s3-upload.ts:49,90` (ingest) — DTO fields `Buffer` / `ReadableStream`
  `references undefined type`.

Expected: zero checker findings; every signature keeps the builtin text;
`fetchThing` gets no `output`; the project's own `interface Headers` in
`local-response.ts` still resolves as a DTO edge (resolve-first control).
