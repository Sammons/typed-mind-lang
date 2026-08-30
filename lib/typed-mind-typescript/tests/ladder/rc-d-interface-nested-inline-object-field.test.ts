// RC-D (ladder-diagnostic-disposition-2026-08-29.md rank 3, issue #101) —
// issue #72's fix (PR #84) wired `isInlineObjectLiteralType`/
// `synthesizeInlineDTO` recursion, and issue #86's fix (PR #94) wired
// `collapseSignatureType`'s newline-collapse — but both touched only the
// function-parameter/return-type call sites (`extractInputDTO`/
// `extractOutputDTO`, `buildFunctionSignature`). `convertInterfaceToDTO`'s
// field-building loop never checked `isInlineObjectLiteralType` on
// `prop.type` — it emitted `prop.type` sanitized only by `.trim()`,
// preserving source newlines verbatim. Confirmed repro:
// `NotionPropertySchema.relation` (claude-home
// `.claude/skills/notion/scripts/notion-client.ts:41-50`), a two-level-
// nested inline object literal authored across 10 source lines, produced
// 9 `syntax/*` "Unparsable text" findings. Fixed by routing an interface
// property's inline-object-literal type through the SAME
// `synthesizeInlineDTO` recursion the function-signature call sites
// already use.
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
  const analyzer = new TypeScriptAnalyzer(fixturePath('40-dto-field-nested-inline-object'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('40-dto-field-nested-inline-object', 'src', 'main.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('RC-D: a two-level-nested, multi-line-authored inline object-literal INTERFACE property synthesizes real nested DTOs', () => {
  it('the relation field on PropertySchema resolves to a synthesized, named DTO — not raw multi-line text', () => {
    const result = convert();
    assert.equal(result.success, true);

    const propertySchema = result.entities.find((e) => e.kind === 'DTO' && e.name === 'PropertySchema') as
      | { fields: ReadonlyArray<{ name: string; type: string }> }
      | undefined;
    assert.notEqual(propertySchema, undefined, 'PropertySchema DTO must exist');

    const relationField = propertySchema?.fields.find((f) => f.name === 'relation');
    assert.notEqual(relationField, undefined, 'relation field must exist on PropertySchema');
    assert.ok(
      !relationField?.type.includes('\n'),
      `relation field's emitted type must not carry a raw newline, got: ${JSON.stringify(relationField?.type)}`,
    );
    assert.ok(
      !relationField?.type.trim().startsWith('{'),
      `relation field must resolve to a synthesized DTO name, not raw object-literal text, got: ${JSON.stringify(relationField?.type)}`,
    );
  });

  it('the doubly-nested dual_property field also synthesizes its own DTO (recursion, not one level only)', () => {
    const result = convert();
    assert.equal(result.success, true);

    const dtoNames = result.entities.filter((e) => e.kind === 'DTO').map((e) => e.name);
    // The synthesized DTO for `relation` must itself carry a `dual_property`
    // field that ALSO resolved to a nested synthesized DTO name, not raw
    // text — confirming the recursion goes two levels deep, matching the
    // real NotionPropertySchema.relation shape.
    const relationDto = result.entities.find(
      (e) =>
        e.kind === 'DTO' &&
        dtoNames.includes(e.name) &&
        (e as { fields: ReadonlyArray<{ name: string }> }).fields.some((f) => f.name === 'dual_property'),
    ) as { fields: ReadonlyArray<{ name: string; type: string }> } | undefined;
    assert.notEqual(relationDto, undefined, 'a synthesized DTO carrying dual_property must exist');

    const dualPropertyField = relationDto?.fields.find((f) => f.name === 'dual_property');
    assert.ok(
      !dualPropertyField?.type.trim().startsWith('{'),
      `dual_property must also resolve to a synthesized nested DTO, got: ${JSON.stringify(dualPropertyField?.type)}`,
    );
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
      `the nested inline object-literal field must not produce syntax errors: ${JSON.stringify(syntaxFindings)}`,
    );
  });
});
