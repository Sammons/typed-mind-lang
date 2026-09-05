// RFC-TM-13 residual R7/R8 — the single ambient-type allowlist
// (pipeline/type-builtins.ts) and its resolve-first rule, exercised through
// the DTO-field and generic-declaration checks.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { it } from 'node:test';
import { computeLinks } from '../pipeline/link-index.ts';
import { AMBIENT_PLATFORM_TYPES, isAmbientPlatformType } from '../pipeline/type-builtins.ts';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { CheckContext } from './check-context.ts';
import { checkDtoFieldTypes } from './check-dto-fields.ts';
import { checkGenericDeclarations } from './check-generic-declarations.ts';
import { checkOrphans } from './check-orphans.ts';

const inspect = async (source: string) => {
  const parser = await TypedMindParser.create({ wasmPath: join(import.meta.dirname, '../../grammar/grammar.wasm') });
  const outcome = parser.parse(source);
  assert.deepEqual(outcome.diagnostics, [], source);
  const context = new CheckContext({ entities: outcome.entities, links: computeLinks(outcome.entities), parseDiagnostics: [] });
  checkGenericDeclarations(context);
  checkDtoFieldTypes(context);
  checkOrphans(context);
  return context;
};
const codes = (context: CheckContext) =>
  context.findings
    .filter((finding) => finding.code !== 'checker/orphaned-entity')
    .map((finding) => `${finding.code}: ${finding.message}`)
    .sort();

it('the ambient allowlist is one alphabetised, duplicate-free table', () => {
  const sorted = [...AMBIENT_PLATFORM_TYPES].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
  assert.deepEqual([...AMBIENT_PLATFORM_TYPES], sorted);
  assert.equal(new Set(AMBIENT_PLATFORM_TYPES).size, AMBIENT_PLATFORM_TYPES.length);
  for (const name of ['AbortSignal', 'Buffer', 'Date', 'ReadableStream', 'Response', 'URL', 'string', 'unknown']) {
    assert.equal(isAmbientPlatformType(name), true, name);
  }
  assert.equal(isAmbientPlatformType('Bufer'), false);
});

it('R8: DTO fields typed with platform globals carry no finding', async () => {
  const context = await inspect(`Upload %
  - body: Buffer
  - stream: ReadableStream<Uint8Array>
  - sink: WritableStream
  - when: Date
  - form: FormData
  - headers: Headers
  - target: URL
  - query: URLSearchParams
  - blob: Blob
  - raw: ArrayBuffer
  - failure: Error
  - signal: AbortSignal
  - request: Request
  - response: Promise<Response>
`);
  assert.deepEqual(codes(context), []);
});

it('R8 control: a misspelled builtin is still an undefined type', async () => {
  const context = await inspect('Upload %\n  - body: Bufer\n  - stream: ReadableStrem<Uint8Array>\n');
  assert.deepEqual(codes(context), [
    "checker/dto-field-unknown-type: DTO 'Upload' field 'body' references undefined type 'Bufer'",
    "checker/dto-field-unknown-type: DTO 'Upload' field 'stream' references undefined type 'ReadableStrem'",
  ]);
});

it('resolve-first: a project DTO named Response owns the name', async () => {
  const declared = await inspect('Response %\n  - status: number\nReply %\n  - inner: Response\n');
  assert.deepEqual(codes(declared), []);
  assert.deepEqual(
    declared.links.referencedBy('Response').map((reference) => reference.from),
    ['Reply'],
  );
});

it('resolve-first: a project declaration of the wrong kind named Date still fails the kind check', async () => {
  const wrongKind = await inspect(`Date :: () => string
Stamp %
  - when: Date
class Clock {
  method: "now() => Date"
}
`);
  assert.deepEqual(codes(wrongKind), [
    "checker/dto-field-non-data-type: DTO 'Stamp' field 'when' references 'Date' which is a Function, not a DTO or Class",
    "checker/generic-non-data-type: Generic declaration 'Clock' references Function 'Date' as a type",
  ]);
});

it('generic declarations accept platform globals in every slot', async () => {
  const context = await inspect(`class Fetcher {
  typeParameter: "T extends Response = Response"
  constructor: "(signal: AbortSignal, body: Buffer)"
  method: "fetch(url: URL, headers: Headers) => Promise<Response>"
  method: "stream() => ReadableStream<Uint8Array>"
}
`);
  assert.deepEqual(codes(context), []);
});
