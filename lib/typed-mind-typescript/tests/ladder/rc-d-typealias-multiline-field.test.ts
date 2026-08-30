// RC-D (ladder-diagnostic-disposition-2026-08-29.md rank 3, issue #101) —
// `convertTypeAliasToDTO`'s object-like branch routed through the older,
// separate `parseTypeToFields`/`parseObjectProperties`
// (naive `content.split(/[;,\n]/)`, no `isInlineObjectLiteralType` check,
// no nested-literal recursion). Confirmed repro: webhookstorage
// `packages/ingest/src/types.ts`'s `IngestEnv` — a type alias whose sole
// field `Variables` is itself an inline object literal authored across
// multiple lines — emitted a bare, unterminated `{` as the field's type
// text ("Missing `}`"). Fixed by routing `convertTypeAliasToDTO`'s
// object-like branch through `parseInlineObjectLiteralToFields` (the same
// brace-depth-aware, multi-line-safe, recursion-capable parser
// `synthesizeInlineDTO` already uses).
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SyntaxEmitter, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');
const fixturePath = (name: string, ...segments: string[]): string => join(reprosDir, name, ...segments);

const convert = () => {
  const analyzer = new TypeScriptAnalyzer(fixturePath('41-typedef-alias-multiline-field'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('41-typedef-alias-multiline-field', 'src', 'main.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('RC-D: a multi-line-authored inline object-literal field on a TYPEDEF ALIAS synthesizes a real nested DTO', () => {
  it("IngestEnv's Variables field resolves to a synthesized DTO name — not raw multi-line/unterminated text", () => {
    const result = convert();
    assert.equal(result.success, true);

    const ingestEnv = result.entities.find((e) => e.kind === 'DTO' && e.name === 'IngestEnv') as
      | { fields: ReadonlyArray<{ name: string; type: string }> }
      | undefined;
    assert.notEqual(ingestEnv, undefined, 'IngestEnv DTO must exist');

    const variablesField = ingestEnv?.fields.find((f) => f.name === 'Variables');
    assert.notEqual(variablesField, undefined, 'Variables field must exist on IngestEnv');
    assert.ok(
      !variablesField?.type.includes('\n'),
      `Variables field's emitted type must not carry a raw newline, got: ${JSON.stringify(variablesField?.type)}`,
    );
    assert.ok(
      !variablesField?.type.trim().startsWith('{'),
      `Variables field must resolve to a synthesized DTO name, not raw object-literal text, got: ${JSON.stringify(variablesField?.type)}`,
    );
  });

  it('the synthesized Variables DTO carries all six real leaf fields', () => {
    const result = convert();
    assert.equal(result.success, true);

    const ingestEnv = result.entities.find((e) => e.kind === 'DTO' && e.name === 'IngestEnv') as
      | { fields: ReadonlyArray<{ name: string; type: string }> }
      | undefined;
    const variablesField = ingestEnv?.fields.find((f) => f.name === 'Variables');
    assert.notEqual(variablesField, undefined);

    const variablesDto = result.entities.find((e) => e.kind === 'DTO' && e.name === variablesField?.type) as
      | { fields: ReadonlyArray<{ name: string }> }
      | undefined;
    assert.notEqual(variablesDto, undefined, `the synthesized Variables DTO (${variablesField?.type}) must exist as a real entity`);
    assert.deepEqual(variablesDto?.fields.map((f) => f.name).sort(), [
      'endpointId',
      'errorCode',
      'idempotencyHit',
      'payloadSizeBytes',
      'requestId',
      'tenantId',
    ]);
  });

  it('checker verdict: zero syntax/* findings — the emitted .tmd parses clean', async () => {
    const result = convert();
    assert.equal(result.success, true);

    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
    const tm = await TypedMind.create();
    const checkResult = tm.check(longform);

    const syntaxFindings = checkResult.diagnostics.filter((d) => d.code.startsWith('syntax/'));
    assert.deepEqual(
      syntaxFindings,
      [],
      `the multi-line type-alias field must not produce syntax errors: ${JSON.stringify(syntaxFindings)}`,
    );
  });
});
