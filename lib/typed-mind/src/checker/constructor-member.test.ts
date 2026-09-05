// RFC-TM-14 §S2 (rfc-tm-14-diamond.md, leaf R1a-lang) — `Owner.constructor` is
// an always-present member of every Class and ClassFile, so a construct edge
// is spelled `~> [Owner.constructor]` for both kinds. The resolver arm order
// for a ClassFile owner is declared member > exported member > `constructor`
// > `methods`; a plain File owner has no constructor.

import assert from 'node:assert/strict';
import { join } from 'node:path';
import { before, it } from 'node:test';
import { ClassFileNode } from '../ast/class-file-node.ts';
import { ClassNode } from '../ast/class-node.ts';
import { QualifiedNameResolver } from '../ast/qualified-name-resolver.ts';
import { computeLinks } from '../pipeline/link-index.ts';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { AstValidator } from './ast-validator.ts';

let parser: TypedMindParser;
before(async () => {
  parser = await TypedMindParser.create({ wasmPath: join(import.meta.dirname, '../../grammar/grammar.wasm') });
});

const parse = (source: string) => {
  const outcome = parser.parse(source);
  assert.deepEqual(outcome.diagnostics, [], source);
  return outcome;
};

const namesFor = (source: string) => {
  const outcome = parse(source);
  const byName = new Map(outcome.entities.map((entity) => [entity.name, entity]));
  return { outcome, byName, names: new QualifiedNameResolver(byName) };
};

const findingsFor = (source: string) => {
  const outcome = parse(source);
  return new AstValidator().validate(outcome, computeLinks(outcome.entities)).findings;
};

const classSource = ['App -> Main', 'Main @ main.ts:', '  -> [walk, Walker]', 'Walker <:', '  => [walk]', 'walk :: () => number', '  ~> [Walker.constructor]'].join(
  '\n',
);

const classFileSource = [
  'App -> Main',
  'Main @ main.ts:',
  '  -> [scan]',
  'Cursor #: cursor.ts',
  '  <- [scan]',
  '  => [advance]',
  'scan :: () => void',
  '  ~> [Cursor.constructor]',
].join('\n');

it('TM14 U2: Owner.constructor resolves as a member for Class and ClassFile', () => {
  const classNames = namesFor(classSource);
  const walker = classNames.byName.get('Walker');
  assert.ok(walker instanceof ClassNode);
  assert.deepEqual(classNames.names.resolve('Walker.constructor'), { kind: 'member', owner: walker, member: 'constructor' });
  assert.equal(classNames.names.target('Walker.constructor'), walker);

  const classFileNames = namesFor(classFileSource);
  const cursor = classFileNames.byName.get('Cursor');
  assert.ok(cursor instanceof ClassFileNode);
  assert.deepEqual(classFileNames.names.resolve('Cursor.constructor'), { kind: 'member', owner: cursor, member: 'constructor' });
  assert.equal(classFileNames.names.target('Cursor.constructor'), cursor);

  // An exported top-level binding literally named `constructor` wins by the
  // arm order (declared > exported > constructor > methods).
  const exported = namesFor('Main @ main.ts:\n  -> [constructor]\nconstructor :: () => void\nCursor #: cursor.ts\n  -> [constructor]\n');
  assert.deepEqual(exported.names.resolve('Cursor.constructor'), { kind: 'entity', entity: exported.byName.get('constructor') });

  // `~> [Owner.constructor]` from a Function passes legality and method-call
  // checks, and the orphan walk credits the owner.
  for (const source of [classSource, classFileSource]) {
    assert.deepEqual(
      findingsFor(source).map((finding) => finding.code),
      [],
      source,
    );
  }
  const withoutEdge = findingsFor(classFileSource.replace('  ~> [Cursor.constructor]', ''));
  assert.deepEqual(
    withoutEdge.map((finding) => [finding.code, finding.message]),
    [['checker/orphaned-entity', "Orphaned entity 'Cursor'"]],
  );
  assert.ok(computeLinks(parse(classSource).entities).referencedBy('Walker').some((link) => link.from === 'walk'));
  assert.ok(computeLinks(parse(classFileSource).entities).referencedBy('Cursor').some((link) => link.from === 'scan'));
});

it('TM14 U2: constructor is the only implicit member and a File owner has none', () => {
  const { names } = namesFor(classSource);
  assert.equal(names.resolve('Walker.constructo').kind, 'unresolved');
  assert.equal(names.resolve('Main.constructor').kind, 'unresolved');
  // An unknown member neither resolves nor credits the owner.
  assert.deepEqual(
    findingsFor(classSource.replace('Walker.constructor', 'Walker.build'))
      .map((finding) => finding.code)
      .toSorted(),
    ['checker/orphaned-entity', 'checker/unknown-method'],
  );
  // The importing-file gate applies to `constructor` as it does to methods.
  const cross = namesFor(classFileSource);
  assert.equal(cross.names.resolve('Cursor.constructor', { importingFile: 'Main' }).kind, 'unresolved');
  assert.equal(cross.names.resolve('Cursor.constructor', { importingFile: 'Cursor' }).kind, 'member');
});
