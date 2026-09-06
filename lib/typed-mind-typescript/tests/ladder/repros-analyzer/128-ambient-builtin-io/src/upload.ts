// s3-upload.ts:49,90 shape — DTO fields typed with platform globals.
export interface Upload {
  body: Buffer;
  stream: ReadableStream<Uint8Array>;
  when: Date;
}
