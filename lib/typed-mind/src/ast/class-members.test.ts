import assert from 'node:assert/strict';
import { it } from 'node:test';
import { parseSignatureText } from '../pipeline/parse-signature-text.ts';
import { ClassFileNode } from './class-file-node.ts';
import { type ClassMembers, legacyMethodNames } from './class-members.ts';
import { ClassNode } from './class-node.ts';
import type { EntityNodeArgs } from './entity-node.ts';

const base: EntityNodeArgs = {
  name: 'Store',
  raw: '',
  sourceForm: 'longform',
  span: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } },
};

it('TM13 B3a: member AST preserves ordered overloads and separates legacy global references', () => {
  const members: ClassMembers = {
    methods: [
      { name: 'legacy', signature: undefined, span: base.span },
      { name: 'run', signature: parseSignatureText('run(value: Request) => Result'), span: base.span },
      { name: 'run', signature: parseSignatureText('run(value: Other) => Result'), span: base.span },
      { name: undefined, signature: parseSignatureText('not a method'), span: base.span },
    ],
    constructors: [{ signature: parseSignatureText('(config: Config)', { allowMissingReturnType: true }), span: base.span }],
  };
  for (const entity of [
    new ClassNode({ ...base, implements: [], members }),
    new ClassFileNode({ ...base, implements: [], members, path: 'store.ts', imports: [], exports: [] }),
  ]) {
    assert.equal(entity.members, members);
    assert.deepEqual(entity.methods, ['legacy', 'run', 'run']);
    assert.deepEqual(legacyMethodNames(entity), ['legacy']);
    assert.equal(entity.methods.includes('constructor'), false);
    assert.deepEqual(JSON.parse(JSON.stringify(entity)).members, JSON.parse(JSON.stringify(members)));
  }
});

it('TM13 B3a: legacy class construction omits canonical members from serialized output', () => {
  const methods = ['run', 'stop'];
  for (const entity of [
    new ClassNode({ ...base, implements: [], methods }),
    new ClassFileNode({ ...base, implements: [], methods, path: 'store.ts', imports: [], exports: [] }),
  ]) {
    assert.equal(entity.members, undefined);
    assert.equal(entity.methods, methods);
    assert.equal(legacyMethodNames(entity), methods);
    assert.equal(Object.hasOwn(JSON.parse(JSON.stringify(entity)), 'members'), false);
  }
});
