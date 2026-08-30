// Adversarial-review regression fixture, round 2 (PR #115 comment) — a
// top-level union of two GENERICS (`Record<K, A|B> | Map<K, C|D>`), each
// internally containing its own nested union of object literals, was
// still misrouted by round-1's `<`/`>`-tracking fix: the top-level `|`
// BETWEEN the two generics genuinely sits at depth 0, so the old
// "any top-level `|` plus any `{` anywhere" test still fired, routing the
// whole alias into `parseTypeExprText` — which has its OWN pre-existing,
// PR-independent bug in `scanOpaqueRun` (type-expr-from-text.ts) that
// also omits `<`/`>` from its bracket tracker, corrupting this shape's
// output (confirmed present on `main` too, tracked as issue #118 rather
// than fixed here — out of this increment's mechanical-fix scope).
//
// Fixed by narrowing `isUnionOfObjectLiterals` from "any top-level `|`"
// to "every top-level-split member is ITSELF a bare object literal" — a
// generic member (`Record<...>`, `Map<...>`) fails that test, so this
// alias correctly stays on the DTO path, matching `main`'s exact
// pre-#114 behavior (an empty-field DTO, zero diagnostics, wired into
// `input:`).
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
  const analyzer = new TypeScriptAnalyzer(fixturePath('53-union-of-generics'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('53-union-of-generics', 'src', 'index.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('regression: a top-level union of generics (each nesting its own object-literal union) must not trip isUnionOfObjectLiterals', () => {
  it('SideBySideGenerics stays a DTO, referenced via input:, matching pre-#114-fix behavior on main', () => {
    const result = convert();
    assert.equal(result.success, true);
    const entity = result.entities.find((e) => e.name === 'SideBySideGenerics');
    assert.notEqual(entity, undefined, 'SideBySideGenerics must be extracted as a real entity');
    assert.equal(entity?.kind, 'DTO', `expected SideBySideGenerics to stay a DTO, got kind: ${entity?.kind}`);
  });

  it('the emitted .tmd has zero diagnostics (no orphan, no syntax error)', async () => {
    const result = convert();
    assert.equal(result.success, true);
    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
    const tm = await TypedMind.create();
    const checkResult = tm.check(longform);
    assert.deepEqual(checkResult.diagnostics, [], `must have zero diagnostics: ${JSON.stringify(checkResult.diagnostics)}`);
  });
});
