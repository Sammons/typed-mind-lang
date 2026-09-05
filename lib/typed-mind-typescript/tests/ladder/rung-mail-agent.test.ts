// Ladder rung for sammons/mail-agent — a zero-dependency Node 26 project on
// native type stripping, with a hand-rolled `src/http/` server, `node:sqlite`
// repositories, `#private` class members, and `.ts` import specifiers under
// NodeNext. It is the closest corpus to the house style in
// knowledge/pillars/main.md's TypeScript block, so it exercises shapes the
// ladder had not seen: `kind`-discriminated result unions as return types,
// injected-collaborator dependency bags, and `typeof`-typed test seams.
//
// Live baseline (extractor at 264f735, checker via `--check`):
//   src/http/main.ts        18 diagnostics -> 21
//   src/worker/bulk.ts       9 diagnostics -> 20
//   src/harness/factory.ts  12 diagnostics -> 20
//
// The counts RISE, and that is the correct outcome — the same unmasking
// pattern PR #154's fixture 70 and PR #156's parser rung documented. On main a
// multi-line `kind` union converted to a FIELDLESS `X %`: the checker reported
// clean over an entity whose entire body had been silently dropped. Once the
// union carries its members again, the members' string-literal discriminants
// become visible, and those tripped a separate pre-existing language-layer
// gap (fixture 93). Fewer diagnostics over less content is not a better result.
//
// Fixtures 90/91/92 are fix-bound: each fails on main and passes here.
// Fixture 93 is FIXED by PR #163 (grammar: quoted discriminants inside a
// union of object literals) — see the '93' describe block below.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');
const fixturePath = (name: string, ...segments: string[]): string => join(reprosDir, name, ...segments);

const convertSimple = (name: string) => {
  const analyzer = new TypeScriptAnalyzer(fixturePath(name, 'tsconfig.json'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analyzer.analyzeFromEntrypoint(fixturePath(name, 'src', 'index.ts')));
};

const checkTmd = async (tmdContent: string) => {
  const typedMind = await TypedMind.create();
  return typedMind.check(tmdContent);
};

const syntaxErrors = (result: { diagnostics: readonly { code: string; message: string }[] }): string[] =>
  result.diagnostics.filter((diagnostic) => diagnostic.code === 'syntax/error').map((diagnostic) => diagnostic.message);

describe('90 — a multi-line union alias with a leading `|` drops every member', () => {
  // Corpus: mail-agent src/harness/envelope.ts:266 (`DispatchResult`) and
  // src/store/revert.ts:47 (`RevertOutcome`). TypeScript's optional leading
  // `|` produced an empty first member from `splitTopLevelUnionMembers`, so
  // `isUnionOfObjectLiterals` returned false and `isObjectLikeType`'s naive
  // `includes('{')` fallback routed the union down the DTO path — where the
  // brace-slice found no fields and emitted a FIELDLESS `DispatchResult %`.
  it('keeps every union member instead of emitting a fieldless DTO', () => {
    const result = convertSimple('90-multiline-union-alias-leading-bar');
    assert.equal(result.success, true);
    assert.equal(
      /^DispatchResult %$/m.test(result.tmdContent),
      false,
      `a fieldless \`DispatchResult %\` means every union member was dropped. Got:\n${result.tmdContent}`,
    );
    assert.match(result.tmdContent, /DispatchResult = \{ kind: "none"; reason: string \} \| \{ kind: "reply"; text: string \}/);
  });

  it('strips a `//` comment interleaved between union members', () => {
    // envelope.ts:269 and :271-273 both carry a comment between members. Once
    // the newline terminating it is collapsed away, an unstripped comment
    // swallows the rest of the union.
    const result = convertSimple('90-multiline-union-alias-leading-bar');
    assert.match(result.tmdContent, /Interleaved = \{ kind: "first"; a: string \} \| \{ kind: "second"; b: number \}/);
    assert.equal(result.tmdContent.includes('RFC-2 Addendum'), false, 'source commentary must not leak into the emitted type');
  });

  it('emits each alias on a single line', () => {
    const result = convertSimple('90-multiline-union-alias-leading-bar');
    const aliasLines = result.tmdContent.split('\n').filter((line) => line.startsWith('DispatchResult'));
    assert.equal(aliasLines.length, 1, 'every text-carrying grammar token in this family excludes newlines');
  });

  it('control: the single-line sibling was already correct and stays correct', () => {
    // `SingleLine` is the same union authored on one line. It converted
    // correctly before this fix and must be byte-identical to the multi-line
    // form afterwards — this is what isolates the defect to the leading `|`.
    const result = convertSimple('90-multiline-union-alias-leading-bar');
    const single = /^SingleLine = (.*)$/m.exec(result.tmdContent)?.[1];
    const interleaved = /^Interleaved = (.*)$/m.exec(result.tmdContent)?.[1];
    assert.equal(single, interleaved, 'authoring style must not change the emitted type');
  });
});

describe('91 — a multi-line function type in a DTO field keeps its newlines', () => {
  // Corpus: mail-agent src/harness/singleton.ts:338 (`HarnessDeps`) and
  // src/store/revert.ts:143 (`Reverters`). `sanitizeFieldType`'s fallthrough
  // was a bare `.trim()`, so interior newlines survived into the field line
  // and desynced the grammar's single-line `- name: Type` production.
  it('collapses the field type onto one line', () => {
    const result = convertSimple('91-multiline-function-type-dto-field');
    assert.equal(result.success, true);
    assert.match(result.tmdContent, /- executeMutation: \(messageId: string, add: string\[\], remove: string\[\]\) => Promise<void>/);
  });

  it('strips the trailing comma that is legal only in the multi-line form', () => {
    // `remove: string[],` before the closing paren is legal TypeScript across
    // lines and illegal once collapsed. Collapse alone does not remove it,
    // because a comma is not whitespace.
    const result = convertSimple('91-multiline-function-type-dto-field');
    assert.equal(
      result.tmdContent.includes(',)'),
      false,
      `a dangling comma before a closer survived the collapse. Got:\n${result.tmdContent}`,
    );
    assert.equal(result.tmdContent.includes(', )'), false);
  });

  it('applies the same collapse to the type-alias lane', () => {
    // The alias lane reaches the identical defect from the other direction, so
    // the two paths must agree on the normalization.
    const result = convertSimple('91-multiline-function-type-dto-field');
    assert.match(result.tmdContent, /AliasForm = \(messageId: string, renderedIds: ReadonlySet<string>\) => void/);
  });

  it('control: the single-line sibling field is byte-identical to the collapsed one', () => {
    const result = convertSimple('91-multiline-function-type-dto-field');
    const multi = /- executeMutation: (.*)$/m.exec(result.tmdContent)?.[1];
    const single = /- singleLineControl: (.*)$/m.exec(result.tmdContent)?.[1];
    assert.equal(multi, single, 'the collapsed multi-line form must match the same type authored on one line');
  });

  it('checks clean end to end', async () => {
    const result = convertSimple('91-multiline-function-type-dto-field');
    const checkResult = await checkTmd(result.tmdContent);
    assert.deepEqual(
      checkResult.diagnostics.map((diagnostic) => diagnostic.message),
      [],
    );
    assert.equal(checkResult.valid, true);
  });
});

describe('92 — a `typeof` type query reaches the emitted document unparenthesized', () => {
  // Corpus: mail-agent src/model/client.ts:19 (`ModelDeps.fetchImpl`) and
  // src/http/routes-activity.ts:40 (`ActivityRouteDeps.revert`). The grammar's
  // `typeof` production requires a leading `(` (grammar.js
  // `_typeof_opaque_open`, issue #83), so a bare `typeof fetch` matched
  // `entity_name` as an identifier and the checker choked on the next token.
  it('parenthesizes a bare type query so the grammar accepts it', () => {
    const result = convertSimple('92-typeof-type-query-dto-field');
    assert.equal(result.success, true);
    assert.match(result.tmdContent, /- fetchImpl: \(typeof fetch\)/);
  });

  it('parenthesizes a type query nested in a generic argument', () => {
    // The same defect one level deeper: the argument parsed as a named type
    // literally called `typeof`, which also fed the external-stub walker a
    // stub for a keyword.
    const result = convertSimple('92-typeof-type-query-dto-field');
    assert.match(result.tmdContent, /- revert: Array<\(typeof makeRevert\)>/);
  });

  it('never emits a stub for a type literally named `typeof`', () => {
    const result = convertSimple('92-typeof-type-query-dto-field');
    assert.equal(
      result.entities.some((entity) => entity.name === 'typeof'),
      false,
      '`typeof` is a keyword, never an external type needing a Dependency stub',
    );
  });

  it('is idempotent: an already-parenthesized query is not double-wrapped', () => {
    // Issue #83's own corpus shape. Double-wrapping would be a regression
    // against the production that already handles it.
    const result = convertSimple('92-typeof-type-query-dto-field');
    assert.match(result.tmdContent, /- alreadyParenthesized: \(typeof CHECK_CODES\)\[number\]/);
    assert.equal(result.tmdContent.includes('((typeof'), false);
  });

  it('control: a field with no type query is untouched', () => {
    const result = convertSimple('92-typeof-type-query-dto-field');
    assert.match(result.tmdContent, /- plainControl: string/);
  });

  it('checks clean end to end', async () => {
    const result = convertSimple('92-typeof-type-query-dto-field');
    const checkResult = await checkTmd(result.tmdContent);
    assert.deepEqual(
      checkResult.diagnostics.map((diagnostic) => diagnostic.message),
      [],
    );
    assert.equal(checkResult.valid, true);
  });
});

describe('93 — fixed: a string-literal discriminant in a union of object literals', () => {
  // What fixture 90's converter fix UNMASKED, now CLOSED at the language layer
  // by PR #163. The union reaches the alias lane carrying its members, and the
  // grammar parses the quoted discriminants.
  //
  // Fixture 51 (`51-union-of-object-literals`, issue #114) DOES `--check` its
  // output (union-of-object-literals.test.ts:69) and passed all along — its
  // discriminants are BOOLEANS (`{ tagged: false }`), a bare token the grammar
  // always accepted. A QUOTED discriminant was not. That is why the shape
  // looked covered until this rung ran a corpus whose discriminants are
  // strings.
  //
  // Root cause (narrower than this fixture's original write-up, corrected
  // after the fix): there is no "union-member production" — the whole type is
  // one `type_opaque` leaf, and the UNION IS NOT THE TRIGGER. A single
  // `{ kind: "none"; reason: string }` reproduced it identically. The real
  // cause was `_opaque_piece`'s fallback chunk token `/[^ \t\n"(){}\[\]]+/`,
  // which excludes `"`, combined with the choice having no `$.string`
  // alternative — so a quoted value ANYWHERE inside a balanced group was
  // structurally unrepresentable. Fixed by giving the brace and bracket
  // opaque-group bodies the `$.string` alternative (PR #163); the top-level
  // run deliberately does NOT get it, because there a `"` opens the DTO
  // field's description slot.
  it('converts and emits the union text correctly — the converter side is right', () => {
    const result = convertSimple('93-string-literal-discriminant-union');
    assert.equal(result.success, true);
    assert.match(result.tmdContent, /DispatchResult = \{ kind: "none"; reason: string \} \| \{ kind: "reply"; text: string \}/);
  });

  it('the checker parses the quoted discriminants — zero syntax diagnostics', async () => {
    const result = convertSimple('93-string-literal-discriminant-union');
    const checkResult = await checkTmd(result.tmdContent);

    // Was the `PINS THE GAP` assertion, inverted when PR #163 taught the
    // grammar this shape. Before that change this returned two diagnostics:
    // `Unparsable text: `"none"`` and `Unparsable text: `"reply"``.
    assert.deepEqual(
      syntaxErrors(checkResult),
      [],
      `the grammar accepts a quoted discriminant inside a union of object literals. A syntax diagnostic here is a REGRESSION of PR #163, not a knownGap to re-pin. Got: ${JSON.stringify(syntaxErrors(checkResult))}`,
    );
  });
});
