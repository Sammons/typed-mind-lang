// RFC-TM-13 residual R7/R8 (fixture 109) — ambient platform types in Function
// input/output slots and DTO fields.
//
// R7: `formatUtcDate(date: Date)` and `fetchThing(): Promise<Response>` used
// to get `input: Date` / `output: Response` edges from `extractInputDTO` /
// `extractOutputDTO`'s DTO-like-by-elimination branch, and the checker then
// reported `Function input DTO 'Date' not found`. Nothing declares `Date`, so
// the edge can never resolve; the converter now drops it and keeps the type
// text in the signature. R8: DTO fields typed `Buffer` / `ReadableStream`
// reported `references undefined type`; the checker's ambient allowlist now
// covers them (resolve-first: a project declaration with the same name wins,
// which the `local-response.ts` `interface Headers` control pins).
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { FunctionNode, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const fixture = join(testDir, 'repros-analyzer', '128-ambient-builtin-io');

const convertFixture = () => {
  const analyzer = new TypeScriptAnalyzer(fixture);
  const analysis = analyzer.analyzeFromEntrypoint(join(fixture, 'src', 'main.ts'));
  return new TypeScriptToTypedMindConverter().convert(analysis);
};

const functionByName = (result: ReturnType<typeof convertFixture>, name: string): FunctionNode => {
  const entity = result.entities.find((candidate) => candidate instanceof FunctionNode && candidate.name === name);
  assert.ok(entity instanceof FunctionNode, `Function '${name}' must be emitted`);
  return entity;
};

describe('128-ambient-builtin-io', () => {
  it('emits no input/output edge for ambient builtin parameter and return types', () => {
    const result = convertFixture();
    const slots = ['formatUtcDate', 'fetchThing', 'readBody', 'byId'].map((name) => {
      const fn = functionByName(result, name);
      return { name, input: fn.input, output: fn.output, signature: fn.signature };
    });
    assert.deepEqual(slots, [
      { name: 'formatUtcDate', input: undefined, output: undefined, signature: 'formatUtcDate(date: Date) => string' },
      { name: 'fetchThing', input: undefined, output: undefined, signature: 'fetchThing() => Promise<Response>' },
      { name: 'readBody', input: undefined, output: undefined, signature: 'readBody(response: Response) => Promise<string>' },
      {
        name: 'byId',
        input: undefined,
        output: undefined,
        signature: 'byId(things: Map<string, Thing>) => Map<string, Thing>',
      },
    ]);
  });

  it('resolve-first: a project interface named Headers still gets its output edge', () => {
    const result = convertFixture();
    const fn = functionByName(result, 'makeLocalHeaders');
    assert.deepEqual({ input: fn.input, output: fn.output }, { input: undefined, output: 'Headers' });
  });

  it('the emitted .tmd carries zero checker findings and keeps the builtin text', async () => {
    const result = convertFixture();
    const typedMind = await TypedMind.create();
    const checkResult = typedMind.check(result.tmdContent);
    assert.deepEqual(
      checkResult.diagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`),
      [],
      result.tmdContent,
    );
    for (const text of [
      'formatUtcDate(date: Date) => string',
      'fetchThing() => Promise<Response>',
      'body: Buffer',
      'stream: ReadableStream<Uint8Array>',
    ]) {
      assert.ok(result.tmdContent.includes(text), `emitted .tmd must keep '${text}':\n${result.tmdContent}`);
    }
  });
});
