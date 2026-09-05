// Ladder rung for sammons/slat — a pnpm workspace whose single package
// (`products/slat`, 215 TypeScript files) is a `node:http` service built to
// this repo's own TypeScript stance: `readonly` on every DTO field, local
// tagged-union failure types, and `Record<string, Handler>` route tables.
// That stance is what makes it a sharp probe: the three idioms it uses most
// are the three the extractor handled worst.
//
// Live baseline (extractor at 786b433, checker via `--check`):
//
//   target        entrypoint                ERROR before -> after   field-less DTOs
//   index         src/index.ts                   95 -> 58            139 -> 6
//   vault-rotate  scripts/vault-rotate.ts        75 ->  7             79 -> 1
//   vault-key     scripts/vault-key.ts           12 ->  2              4 -> 0
//   types         src/types.ts                    1 ->  1              2 -> 0
//   backup        scripts/backup.ts               0 ->  9              5 -> 0
//   coverage-gate scripts/coverage-gate.ts        0 ->  0              4 -> 0
//
// Field-less DTOs across the corpus fell from 139/140 to 6/141: the emitted
// documents went from structurally hollow to carrying real field lists.
//
// backup's 0 -> 9 is an UNMASKING, not a regression — the same pattern PRs
// #152 and #154 documented. Its `RestoreFailure %` previously emitted as an
// empty DTO, silently discarding all 7 variants the source declares, so the
// target reported a FALSE clean. At the time this baseline was measured, the
// 9 findings were issue #130's alias-quoting limit, reached because the
// structure was finally present.
//
// At the time this baseline was measured, the residual on every target was
// dominated by two tracked gaps, both since FIXED by RFC-TM-13: issue #130
// (inner quotes in a shortform `type:` value, unit CP,
// https://git.tail4ea214.ts.net/sammons/typed-mind-lang/pulls/181) and the
// fixture-84/85 family (the checker did not descend into generic arguments
// or method signatures, so a type reachable only there read as an orphan;
// units B1 and B3). This baseline is historical measurement, not a live
// re-check against the current checker.
//
// Fixtures 98/99/100/101 are all fix-bound: each fails before its fix and
// passes here. See each fixture's README.md for the root cause.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SyntaxEmitter } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');
const fixturePath = (name: string, ...segments: string[]): string => join(reprosDir, name, ...segments);

const convertFixture = (name: string) => {
  const analyzer = new TypeScriptAnalyzer(fixturePath(name));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath(name, 'src', 'index.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

const emitLongform = (name: string): string => {
  const result = convertFixture(name);
  assert.equal(result.success, true, 'conversion must succeed');
  const emitter = new SyntaxEmitter();
  return emitter.emitLongform({
    entities: result.entities as never,
    imports: [],
    suppressions: [],
    diagnostics: [],
  });
};

const findEntity = (name: string, entityName: string) => {
  const result = convertFixture(name);
  assert.equal(result.success, true, 'conversion must succeed');
  return result.entities.find((entity) => entity.name === entityName);
};

// A DTO's field names, whatever the emitter spells them as. Reading the field
// list off the entity (rather than off the emitted text) keeps these
// assertions independent of longform-vs-shortform spelling changes.
const fieldNames = (entity: unknown): string[] => {
  const fields = (entity as { fields?: readonly { name: string }[] } | undefined)?.fields;
  return fields === undefined ? [] : fields.map((field) => field.name);
};

describe('fixture 98: `readonly` property modifiers must not drop a type-alias DTO field list', () => {
  const FIXTURE = '98-readonly-type-alias-fields';

  it('a readonly-spelled type alias keeps every field', () => {
    // Pre-fix this was `[]`: the `^(\w+)` anchor in parseObjectLiteralProperty
    // rejected `readonly edition: Edition`, and the field was skipped silently.
    assert.deepEqual(fieldNames(findEntity(FIXTURE, 'AliasConfig')), ['edition', 'port']);
  });

  it('the interface spelling of the same shape is unchanged', () => {
    assert.deepEqual(fieldNames(findEntity(FIXTURE, 'IfaceConfig')), ['edition', 'port']);
  });

  it('a property NAMED readonly still parses as a field called readonly', () => {
    // Guards the fix against over-stripping: `{ readonly: boolean }` is a
    // field named `readonly`, not a modifier on a nameless field.
    assert.deepEqual(fieldNames(findEntity(FIXTURE, 'NamedReadonly')), ['readonly', 'edition']);
  });

  it('optionality survives the modifier strip', () => {
    const entity = findEntity(FIXTURE, 'OptionalReadonly');
    assert.deepEqual(fieldNames(entity), ['edition']);
    const emitted = emitLongform(FIXTURE);
    // Longform spells optionality as an `optional: true` property on the
    // field, not as a `?` suffix on the name.
    assert.match(emitted, /optional: true/, 'the optionality marker must survive stripping the readonly modifier');
  });

  it('a type reachable only through a readonly field is not orphaned', () => {
    // `Edition` and `Port` are referenced ONLY as field types of AliasConfig.
    // With the fields dropped they had no referent at all.
    const emitted = emitLongform(FIXTURE);
    assert.match(emitted, /"Edition"/, 'Edition must remain referenced by a field type');
    assert.match(emitted, /"Port"/, 'Port must remain referenced by a field type');
  });
});

// Fixture 99 is a REGRESSION PIN, not a fix this branch ships. PR #158's
// fixture 90 fixed the same defect from the mail-agent corpus while this rung
// was in review, so this branch's duplicate implementation was dropped (PR
// #165 review, comment 22273) and the fixture now passes via #158's
// `normalizeUnionAliasText`.
//
// It is a real pin, not a vacuous one: verified to FAIL on e461e24 (main
// immediately before #158) and PASS on c9af608 (#158's merge) with none of
// this branch's source changes applied.
describe('fixture 99: a leading `|` must not defeat the union-of-object-literals guard', () => {
  const FIXTURE = '99-leading-bar-union-of-object-literals';

  it('a leading-bar union of object literals converts as a TypeDef, not a field-less DTO', () => {
    // Pre-fix: kind 'DTO' with zero fields — every variant discarded.
    const entity = findEntity(FIXTURE, 'RestoreFailure');
    assert.notEqual(entity, undefined, 'RestoreFailure must be extracted');
    assert.equal(entity?.kind, 'TypeDef', `expected TypeDef, got ${entity?.kind}`);
  });

  it('the single-line spelling keeps its existing issue #114 routing', () => {
    const entity = findEntity(FIXTURE, 'SingleLineUnion');
    assert.equal(entity?.kind, 'TypeDef', `expected TypeDef, got ${entity?.kind}`);
  });

  it('the emitted alias does not begin with a bare leading bar', () => {
    // Pre-fix the emitter printed a truncated `RestoreFailure = |`, because
    // getText() preserves the leading bar the source spells.
    const emitted = emitLongform(FIXTURE);
    const truncated = emitted.split('\n').find((line) => /^\s*RestoreFailure\s*=\s*\|\s*$/.test(line));
    assert.equal(truncated, undefined, `must not emit a truncated leading-bar alias, got: ${JSON.stringify(truncated)}`);
  });

  it('both union variants survive into the emitted type text', () => {
    const emitted = emitLongform(FIXTURE);
    assert.match(emitted, /restore_db_exists/, 'first variant must survive');
    assert.match(emitted, /restore_hash_mismatch/, 'second variant must survive');
  });
});

describe('fixture 100: a bare Record/Map alias must not emit a field-less DTO', () => {
  const FIXTURE = '100-record-alias-value-type';

  it('a bare Record alias converts as a TypeDef that keeps its value type', () => {
    // Pre-fix: kind 'DTO' with zero fields — `RouteHandler` was discarded and
    // then reported as an orphan.
    const entity = findEntity(FIXTURE, 'ExactRoutes');
    assert.equal(entity?.kind, 'TypeDef', `expected TypeDef, got ${entity?.kind}`);
    const emitted = emitLongform(FIXTURE);
    assert.match(emitted, /"Record<string, RouteHandler>"/, 'the value type must survive');
  });

  it('a bare Map alias takes the same path', () => {
    const entity = findEntity(FIXTURE, 'HandlerIndex');
    assert.equal(entity?.kind, 'TypeDef', `expected TypeDef, got ${entity?.kind}`);
  });

  it('a Record whose value IS an inline object literal still splits into fields', () => {
    // The fix narrows object-likeness to "contains a `{`", so this shape must
    // keep its existing DTO routing — the guard against over-correcting.
    const entity = findEntity(FIXTURE, 'NestedRoutes');
    assert.notEqual(entity, undefined, 'NestedRoutes must be extracted');
    assert.notEqual(entity?.kind, undefined);
    const emitted = emitLongform(FIXTURE);
    assert.match(emitted, /NestedRoutes/, 'NestedRoutes must be emitted');
  });
});

describe('fixture 101: a comment inside a union member must not break the TypeDef across lines', () => {
  const FIXTURE = '101-comment-in-union-member-breaks-typedef';

  it('the emitted alias occupies exactly one line', () => {
    // This is the load-bearing assertion of the rung's highest-severity gap:
    // a multi-line TypeDef corrupts every entity after it, not just itself.
    const emitted = emitLongform(FIXTURE);
    // Longform spells an alias as `typedef X {` + a `type: "..."` line. The
    // whole union must sit on that ONE type line; pre-fix the comment's own
    // newlines split it across six.
    const aliasLine = emitted.split('\n').find((line) => line.includes('not_an_object'));
    assert.notEqual(aliasLine, undefined, 'the ParseFailure union must be emitted on one line');
    assert.match(aliasLine ?? '', /invalid_header_octets/, 'both variants must share the single type line');
    assert.doesNotMatch(aliasLine ?? '', /\/\*|\*\//, 'no comment delimiter may survive into the emitted type');
  });

  it('no comment text leaks into any emitted line', () => {
    const emitted = emitLongform(FIXTURE);
    assert.doesNotMatch(emitted, /BLOCKER|doc comment attached|a line comment inside/, 'comment prose must be stripped');
  });

  it('every union variant survives the comment strip', () => {
    const emitted = emitLongform(FIXTURE);
    assert.match(emitted, /not_an_object/, 'first variant must survive');
    assert.match(emitted, /invalid_header_octets/, 'the commented variant must survive');
  });

  it('a line comment inside a member is stripped too', () => {
    const emitted = emitLongform(FIXTURE);
    const aliasLine = emitted.split('\n').find((line) => line.includes("'ok'"));
    assert.notEqual(aliasLine, undefined, 'the LineCommentFailure union must be emitted on one line');
    assert.doesNotMatch(aliasLine ?? '', /\/\//, 'no line-comment delimiter may survive');
    assert.match(aliasLine ?? '', /'bad'/, 'the commented variant must survive on the same line');
  });
});
