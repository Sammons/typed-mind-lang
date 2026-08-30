// Callgraph increment repro (issue found during real-corpus ladder
// verification) — distilled from the real webhookstorage clone's
// `packages/ingest/src/services/s3-upload.ts`: `PayloadTooLargeError`
// (an exported `Error` subclass) is `new`'d only inside a same-file
// exported function (`uploadPayload`), never from another module.
//
// The module has no OTHER class besides `PayloadTooLargeError` itself, so
// `convertToClassFile`'s primary-class fallback (`module.classes[0]`)
// fuses `PayloadTooLargeError` into THIS module's own ClassFile entity —
// `calls.to`'s legal targets are `['Function', 'Class']` only (never
// `ClassFile`, per valid-references.ts), so a same-file `new
// PayloadTooLargeError(...)` call edge must NOT resolve to the fused
// ClassFile, or the checker fires `checker/reference-to-illegal`
// ("Cannot use 'calls' to reference ClassFile").

export class PayloadTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`Payload exceeds ${maxBytes} bytes`);
    this.name = 'PayloadTooLargeError';
  }
}

export function uploadPayload(maxBytes: number, size: number): string {
  if (size > maxBytes) {
    throw new PayloadTooLargeError(maxBytes);
  }
  return 'uploaded';
}
