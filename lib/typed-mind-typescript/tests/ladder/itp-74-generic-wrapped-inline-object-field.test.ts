// Fixture 74 — itp-maker ladder rung. RC-D (issue #101, fixture 40)
// routed a DTO field whose type is a BARE inline object literal through
// `synthesizeInlineDTO`. Its guard, `isInlineObjectLiteralType`, requires
// the trimmed text to both start with `{` and end with `}`, so it says
// false for the generic-wrapped form — `Array<{ ... }>`, the single most
// common real shape carrying a list of inline records. Such a field fell
// through to `sanitizeFieldType`, whose last statement is `.trim()`, so
// raw source text (newlines included) landed in the emitted field line
// and desynced the grammar's single-line field production.
//
// Live evidence: itp-maker `functions/procore-worker.ts:149-165`
// (`ProcoreWorkerPayload.references` / `.defaultAssignees`) produced 6
// `syntax/*` "Unparsable text" findings on the infra, procore-worker and
// push-to-procore entrypoints alike.
//
// Fixed by `splitGenericWrappedObjectLiteral` +
// `convertInterfaceToDTO`'s generic-wrapped branch, which synthesizes the
// inner literal through the SAME recursion and rebuilds the wrapper
// around the synthesized name, preserving the field's collection nature.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SyntaxEmitter, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(testDir, 'repros-analyzer', '74-dto-field-generic-wrapped-inline-object');

const convert = () => {
  const analyzer = new TypeScriptAnalyzer(fixtureDir);
  const analysis = analyzer.analyzeFromEntrypoint(join(fixtureDir, 'src', 'index.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

type DtoLike = { fields: ReadonlyArray<{ name: string; type: string }> };

const findDto = (entities: ReadonlyArray<{ kind: string; name: string }>, name: string) =>
  entities.find((entity) => entity.kind === 'DTO' && entity.name === name) as unknown as DtoLike | undefined;

describe('fixture 74: a generic-wrapped inline object-literal DTO field synthesizes a real nested DTO', () => {
  it('the multi-line Array<{...}> field carries no raw newline and no raw brace', () => {
    const result = convert();
    assert.equal(result.success, true);

    const payload = findDto(result.entities as never, 'WorkerPayload');
    assert.notEqual(payload, undefined, 'WorkerPayload DTO must exist');

    const referencesField = payload?.fields.find((field) => field.name === 'references');
    assert.notEqual(referencesField, undefined, 'references field must exist on WorkerPayload');
    assert.ok(
      !referencesField?.type.includes('\n'),
      `references must not carry a raw newline, got: ${JSON.stringify(referencesField?.type)}`,
    );
    assert.ok(
      !referencesField?.type.includes('{'),
      `references must not carry raw object-literal text, got: ${JSON.stringify(referencesField?.type)}`,
    );
  });

  it('the wrapper is preserved around the synthesized DTO name, not flattened away', () => {
    const result = convert();
    assert.equal(result.success, true);

    const payload = findDto(result.entities as never, 'WorkerPayload');
    const referencesField = payload?.fields.find((field) => field.name === 'references');

    // The collection nature of the field is load-bearing: flattening
    // `Array<{...}>` to a bare DTO name would silently turn a list of
    // records into a single record.
    assert.match(
      referencesField?.type ?? '',
      /^Array<\w+>$/,
      `references must emit as Array<SynthesizedName>, got: ${JSON.stringify(referencesField?.type)}`,
    );

    const synthesizedName = (referencesField?.type ?? '').replace(/^Array</, '').replace(/>$/, '');
    const synthesized = findDto(result.entities as never, synthesizedName);
    assert.notEqual(synthesized, undefined, `synthesized DTO ${synthesizedName} must exist as a real entity`);
    assert.deepEqual(
      synthesized?.fields.map((field) => field.name),
      ['sectionIndex', 'itemIndex', 'documentName'],
      'the synthesized DTO must carry the inline literal fields',
    );
  });

  it('the single-line Array<{...}> field synthesizes its own DTO too', () => {
    const result = convert();
    assert.equal(result.success, true);

    const payload = findDto(result.entities as never, 'WorkerPayload');
    const assigneesField = payload?.fields.find((field) => field.name === 'defaultAssignees');
    assert.match(
      assigneesField?.type ?? '',
      /^Array<\w+>$/,
      `defaultAssignees must emit as Array<SynthesizedName>, got: ${JSON.stringify(assigneesField?.type)}`,
    );
  });

  it('checker verdict: no syntax finding is attributable to the generic-wrapped shape', async () => {
    const result = convert();
    assert.equal(result.success, true);

    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({
      entities: result.entities as never,
      imports: [],
      suppressions: [],
      diagnostics: [],
    });
    const typedMind = await TypedMind.create();
    const checkResult = typedMind.check(longform);

    const syntaxFindings = checkResult.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('syntax/'));

    // The multi-line `Array<{...}>` field — the defect this fixture owns —
    // contributes zero findings: no raw newline, no raw brace reaches the
    // emitted line.
    //
    // One PRE-EXISTING finding survives, and it is NOT this fixture's
    // defect: `emitLongform` wraps every field type in double quotes, so a
    // type text that itself contains double quotes (`"user" | "vendor"`)
    // emits as `""user" | "vendor""`. That is issue #130's unescaped-quote
    // family (the grammar's string token has no escape production). It is
    // proven independent of this fix by a control: an interface with a
    // BARE inline object literal carrying the identical
    // `type: "user" | "vendor"` field produces the byte-identical finding
    // on unmodified main, through the same longform path. The CLI's
    // shortform emission of this same fixture checks fully clean.
    const notQuoteRelated = syntaxFindings.filter((finding) => !finding.message.includes('"user"'));
    assert.deepEqual(
      notQuoteRelated,
      [],
      `a generic-wrapped inline object-literal field must not produce syntax errors of its own: ${JSON.stringify(notQuoteRelated)}`,
    );

    for (const finding of syntaxFindings) {
      assert.ok(
        !finding.message.includes('\n') && !finding.message.includes('sectionIndex'),
        `no finding may reference the multi-line literal's own fields: ${JSON.stringify(finding.message)}`,
      );
    }
  });
});
