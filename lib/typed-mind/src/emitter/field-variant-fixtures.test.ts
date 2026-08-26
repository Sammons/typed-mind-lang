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
