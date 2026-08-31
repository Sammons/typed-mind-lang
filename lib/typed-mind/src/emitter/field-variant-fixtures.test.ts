// RFC-TM-4 §2 / Diamond DAG Q2 (rfc-tm-4-diamond.md) — S-CORE-2b per-variant
// optionalityMarker fixtures: `?` emits `?`, `(optional)` emits `(optional)`,
// `none` emits neither, one fixture per variant, shortform and longform.
// Also: the comment-survival fixture (S-CORE-2a per the frozen scope —
// "comment preservation belongs to this clause") and the sigil-header
// classification fixture (`Name #: path {` => longform, per FID-6).

import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ClassFileNode } from '../ast/class-file-node.ts';
import { DtoNode } from '../ast/dto-node.ts';
import { ProgramNode } from '../ast/program-node.ts';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { SyntaxEmitter } from './syntax-emitter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..', '..');
const wasmPath = join(packageDir, 'grammar', 'grammar.wasm');

describe('S-CORE-2b: optionalityMarker round-trips per variant (shortform)', () => {
  let parser: TypedMindParser;
  const emitter = new SyntaxEmitter();

  before(async () => {
    parser = await TypedMindParser.create({ wasmPath });
  });

  it("'question' marker emits `?` and round-trips", () => {
    const source = 'UserDTO %\n  - name?: string "The name"\n';
    const outcome = parser.parse(source);
    const emitted = emitter.emit(outcome);
    assert.match(emitted, /- name\?: string "The name"/);
    const reparsed = parser.parse(emitted);
    const dto = reparsed.entities.find((entity): entity is DtoNode => entity instanceof DtoNode);
    assert.deepEqual(dto?.fields.at(0)?.optionalityMarker, 'question');
  });

  it("'parenthesized' marker emits `(optional)` and round-trips", () => {
    const source = 'UserDTO %\n  - name: string "The name" (optional)\n';
    const outcome = parser.parse(source);
    const emitted = emitter.emit(outcome);
    assert.match(emitted, /- name: string "The name" \(optional\)/);
    assert.doesNotMatch(emitted, /name\?/);
    const reparsed = parser.parse(emitted);
    const dto = reparsed.entities.find((entity): entity is DtoNode => entity instanceof DtoNode);
    assert.deepEqual(dto?.fields.at(0)?.optionalityMarker, 'parenthesized');
  });

  it("'none' marker emits neither `?` nor `(optional)` and round-trips", () => {
    const source = 'UserDTO %\n  - name: string "The name"\n';
    const outcome = parser.parse(source);
    const emitted = emitter.emit(outcome);
    assert.match(emitted, /- name: string "The name"$/m);
    assert.doesNotMatch(emitted, /name\?/);
    assert.doesNotMatch(emitted, /\(optional\)/);
    const reparsed = parser.parse(emitted);
    const dto = reparsed.entities.find((entity): entity is DtoNode => entity instanceof DtoNode);
    assert.deepEqual(dto?.fields.at(0)?.optionalityMarker, 'none');
  });
});

describe('S-CORE-2b: optionalityMarker round-trips per variant (longform)', () => {
  let parser: TypedMindParser;
  const emitter = new SyntaxEmitter();

  before(async () => {
    parser = await TypedMindParser.create({ wasmPath });
  });

  it("a longform-sourced 'parenthesized' field emits `optional: true` and round-trips", () => {
    const source = 'dto UserDTO {\n  fields: {\n    name: {\n      type: "string"\n      optional: true\n    }\n  }\n}\n';
    const outcome = parser.parse(source);
    const emitted = emitter.emit(outcome);
    assert.match(emitted, /optional: true/);
    const reparsed = parser.parse(emitted);
    const dto = reparsed.entities.find((entity): entity is DtoNode => entity instanceof DtoNode);
    assert.deepEqual(dto?.fields.at(0)?.optionalityMarker, 'parenthesized');
  });

  it("a longform-sourced 'none' field emits no optional key and round-trips", () => {
    const source = 'dto UserDTO {\n  fields: {\n    name: {\n      type: "string"\n    }\n  }\n}\n';
    const outcome = parser.parse(source);
    const emitted = emitter.emit(outcome);
    assert.doesNotMatch(emitted, /optional/);
    const reparsed = parser.parse(emitted);
    const dto = reparsed.entities.find((entity): entity is DtoNode => entity instanceof DtoNode);
    assert.deepEqual(dto?.fields.at(0)?.optionalityMarker, 'none');
  });
});

describe('S-CORE-2a: comment-survival fixture', () => {
  let parser: TypedMindParser;
  const emitter = new SyntaxEmitter();

  before(async () => {
    parser = await TypedMindParser.create({ wasmPath });
  });

  it('an inline comment on a shortform declaration survives a round-trip', () => {
    const source = 'TodoApp -> AppEntry v1.0.0  # main program\n';
    const outcome = parser.parse(source);
    assert.deepEqual(outcome.entities.at(0)?.comment, 'main program');
    const emitted = emitter.emit(outcome);
    // A shortform comment is an INLINE trailing comment on the declaration's
    // own line (grammar.js inline_comment), not a preceding standalone line.
    assert.match(emitted, /^TodoApp -> AppEntry v1\.0\.0 # main program$/m);
    const reparsed = parser.parse(emitted);
    assert.deepEqual(reparsed.entities.at(0)?.comment, 'main program');
  });

  it('a longform description-as-comment survives a round-trip', () => {
    const source = 'program TodoApp {\n  entry: AppEntry\n  description: "root program"\n}\n';
    const outcome = parser.parse(source);
    assert.deepEqual(
      { comment: outcome.entities.at(0)?.comment, purpose: (outcome.entities.at(0) as { purpose?: string })?.purpose },
      { comment: 'root program', purpose: 'root program' },
    );
    const emitted = emitter.emit(outcome);
    const reparsed = parser.parse(emitted);
    assert.deepEqual(
      { comment: reparsed.entities.at(0)?.comment, purpose: (reparsed.entities.at(0) as { purpose?: string })?.purpose },
      { comment: 'root program', purpose: 'root program' },
    );
  });
});

describe('FID-6: sigil-header classification fixture (`Name #: path {` => longform)', () => {
  let parser: TypedMindParser;
  const emitter = new SyntaxEmitter();

  before(async () => {
    parser = await TypedMindParser.create({ wasmPath });
  });

  it('classifies the sigil-with-brace ClassFile header as longform and round-trips through the canonical keyword form', () => {
    const source = 'UserService #: src/services/user.ts {\n  methods: [findById]\n}\n';
    const outcome = parser.parse(source);
    const classFile = outcome.entities.find((entity): entity is ClassFileNode => entity instanceof ClassFileNode);
    assert.deepEqual(classFile?.sourceForm, 'longform');
    const emitted = emitter.emit(outcome);
    assert.match(emitted, /^classfile UserService \{/m);
    const reparsed = parser.parse(emitted);
    const reparsedClassFile = reparsed.entities.find((entity): entity is ClassFileNode => entity instanceof ClassFileNode);
    assert.deepEqual(
      {
        name: reparsedClassFile?.name,
        path: reparsedClassFile?.path,
        methods: reparsedClassFile?.methods,
        sourceForm: reparsedClassFile?.sourceForm,
      },
      { name: 'UserService', path: 'src/services/user.ts', methods: ['findById'], sourceForm: 'longform' },
    );
  });

  it('classifies a plain shortform `#:` declaration (no brace) as shortform', () => {
    const source = 'UserService #: src/services/user.ts <: BaseService\n  => [findById]\n';
    const outcome = parser.parse(source);
    const classFile = outcome.entities.find((entity): entity is ClassFileNode => entity instanceof ClassFileNode);
    assert.deepEqual(classFile?.sourceForm, 'shortform');
  });
});

// RC-C (issue #102) — shortform's grammar/attachment-rules.ts legality table
// gives Program no exports continuation and a declared ClassFile no
// description-line slot for `purpose` (attachment-rules.ts:144,240-243).
// Both fields are unreachable from shortform SOURCE TEXT at all (that's the
// legality gap itself) — they are populated by the TypeScript-to-TypedMind
// converter (typescript-to-typedmind-converter.ts), which synthesizes
// ProgramNode/ClassFileNode instances directly (never through the parser)
// and, before this fix, hardcoded `sourceForm: 'shortform'` regardless.
// These fixtures reproduce that synthesis path directly: build the entities
// by hand (SYNTHETIC_SPAN-equivalent, `sourceForm: 'shortform'`, matching
// the converter's own construction) and assert `emitShortform()` promotes
// just these two kinds to a legal longform block instead of the illegal
// continuation attachment-rules.ts rejects. Fail-before/pass-after: before
// the fix, `emitShortform()` on this exact shape emitted `-> [handler]`
// under the Program declaration and a bare `"..."` line under the declared
// `#:` ClassFile; reparsing that output produced exactly the two
// `semantics/illegal-continuation` diagnostics this fixture asserts are now
// absent (confirmed via a manual pre-fix repro during this Quantum's own
// authoring — see PR body).
describe('RC-C: Program.exports and declared-ClassFile.purpose promote to longform under forced shortform', () => {
  let parser: TypedMindParser;
  const emitter = new SyntaxEmitter();
  const zeroSpan = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };

  before(async () => {
    parser = await TypedMindParser.create({ wasmPath });
  });

  it('a synthesized Program with cross-module exports emits as a legal longform block under emitShortform() and round-trips clean', () => {
    const program = new ProgramNode({
      name: 'TodoApp',
      span: zeroSpan,
      raw: 'TodoApp -> AppEntry',
      sourceForm: 'shortform',
      entry: 'AppEntry',
      exports: ['handler'],
    });
    const emitted = emitter.emit({ entities: [program], imports: [], suppressions: [], diagnostics: [] }, { forceForm: 'shortform' });

    // Promoted to the longform keyword block — never the illegal
    // `-> [...]` continuation a Program's shortform declaration line has no
    // slot for.
    assert.match(emitted, /^program TodoApp \{/m);
    assert.match(emitted, /^\s+exports: \[handler\]$/m);
    assert.doesNotMatch(emitted, /^\s*-> \[handler\]$/m);

    const reparsed = parser.parse(emitted);
    assert.deepEqual(
      reparsed.diagnostics.filter((diagnostic) => diagnostic.code === 'semantics/illegal-continuation'),
      [],
    );
    const reparsedProgram = reparsed.entities.find((entity): entity is ProgramNode => entity instanceof ProgramNode);
    assert.deepEqual(reparsedProgram?.exports, ['handler']);
  });

  it('a synthesized Program with no exports still emits shortform under emitShortform() (no unwarranted promotion)', () => {
    const program = new ProgramNode({
      name: 'TodoApp',
      span: zeroSpan,
      raw: 'TodoApp -> AppEntry v1.0.0',
      sourceForm: 'shortform',
      entry: 'AppEntry',
      version: '1.0.0',
    });
    const emitted = emitter.emit({ entities: [program], imports: [], suppressions: [], diagnostics: [] }, { forceForm: 'shortform' });
    assert.match(emitted, /^TodoApp -> AppEntry v1\.0\.0$/m);
    assert.doesNotMatch(emitted, /^program TodoApp \{/m);
  });

  it('a synthesized declared ClassFile with a purpose emits as a legal longform block under emitShortform() and round-trips clean', () => {
    const classFile = new ClassFileNode({
      name: 'SecretLimitError',
      span: zeroSpan,
      raw: 'SecretLimitError #: src/api/db/endpoint-secrets.ts',
      sourceForm: 'shortform',
      path: 'src/api/db/endpoint-secrets.ts',
      implements: [],
      methods: [],
      imports: [],
      exports: [],
      purpose: 'Custom error for secret limit exceeded',
    });
    const emitted = emitter.emit({ entities: [classFile], imports: [], suppressions: [], diagnostics: [] }, { forceForm: 'shortform' });

    // Promoted to the longform keyword block — never a bare description
    // line under a declared `#:` ClassFile, which attachment-rules.ts
    // rejects outright (only a lookahead-converted ClassFile ever accepted
    // one).
    //
    // toggle-fidelity audit (2026-08-31, claude-home knowledge/projects/
    // typedmind/toggle-fidelity-audit-2026-08-31.md) — this synthesized
    // ClassFile has `purpose` set but no `comment` (never parsed from real
    // source). descriptionAndPurposeLines (emit-longform.ts) now emits
    // `description: "..."` rather than `purpose: "..."` for this shape: a
    // `purpose:`-only spelling reparses to `comment: undefined`, which used
    // to silently diverge from a longform-authored entity's `comment ===
    // purpose` invariant on a toggle round-trip (found via the toggle
    // round-trip harness — a longform-sourced entity bounced through a
    // shortform intermediate form lost its `comment` on the way back).
    // `description:` sets BOTH comment and purpose identically, matching
    // what an author who typed one `description:` line would produce. The
    // reparsed-purpose assertion below is what this test actually cares
    // about (RC-C promotion recovers the field); the exact property NAME
    // emitted is an implementation detail this test no longer pins.
    assert.match(emitted, /^classfile SecretLimitError \{/m);
    assert.match(emitted, /^\s+description: "Custom error for secret limit exceeded"$/m);
    assert.doesNotMatch(emitted, /^\s*"Custom error for secret limit exceeded"$/m);

    const reparsed = parser.parse(emitted);
    assert.deepEqual(
      reparsed.diagnostics.filter((diagnostic) => diagnostic.code === 'semantics/illegal-continuation'),
      [],
    );
    const reparsedClassFile = reparsed.entities.find((entity): entity is ClassFileNode => entity instanceof ClassFileNode);
    assert.deepEqual(reparsedClassFile?.purpose, 'Custom error for secret limit exceeded');
  });

  it('a synthesized declared ClassFile with no purpose still emits shortform under emitShortform() (no unwarranted promotion)', () => {
    const classFile = new ClassFileNode({
      name: 'UserService',
      span: zeroSpan,
      raw: 'UserService #: src/services/user.ts',
      sourceForm: 'shortform',
      path: 'src/services/user.ts',
      implements: [],
      methods: ['findById'],
      imports: [],
      exports: [],
    });
    const emitted = emitter.emit({ entities: [classFile], imports: [], suppressions: [], diagnostics: [] }, { forceForm: 'shortform' });
    assert.match(emitted, /^UserService #: src\/services\/user\.ts$/m);
    assert.doesNotMatch(emitted, /^classfile UserService \{/m);
  });

  it('a document mixing an exports-bearing Program with an otherwise-plain entity keeps the plain entity in shortform', () => {
    const program = new ProgramNode({
      name: 'TodoApp',
      span: zeroSpan,
      raw: 'TodoApp -> AppEntry',
      sourceForm: 'shortform',
      entry: 'AppEntry',
      exports: ['handler'],
    });
    const outcome = parser.parse('AppEntry :: () -> void\n');
    const appEntry = outcome.entities.at(0);
    assert.notEqual(appEntry, undefined);
    const emitted = emitter.emit(
      { entities: [program, ...(appEntry ? [appEntry] : [])], imports: [], suppressions: [], diagnostics: [] },
      { forceForm: 'shortform' },
    );
    assert.match(emitted, /^program TodoApp \{/m);
    assert.match(emitted, /^AppEntry :: \(\) -> void$/m);
  });
});
