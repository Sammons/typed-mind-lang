// RFC-TM-13 residual R7 — ambient builtins in Function input/output slots.
import { fetchThing, formatUtcDate, readBody, byId } from './io.ts';
import { makeLocalHeaders } from './local-response.ts';
import type { Upload } from './upload.ts';

export const run = async (): Promise<string> => {
  const upload: Upload = { body: Buffer.from(''), stream: new ReadableStream<Uint8Array>(), when: new Date() };
  const response = await fetchThing();
  const text = await readBody(response);
  const local = makeLocalHeaders(text);
  return `${formatUtcDate(upload.when)} ${local.contentType} ${byId(new Map()).size}`;
};
