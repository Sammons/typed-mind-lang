import assert from 'node:assert/strict';
import { it } from 'node:test';
import { DtoNode } from '../ast/dto-node.ts';
import { FunctionNode } from '../ast/function-node.ts';
import { ProgramNode } from '../ast/program-node.ts';
import { computeLinks } from '../pipeline/link-index.ts';
import { CheckContext } from './check-context.ts';
import { checkOrphans } from './check-orphans.ts';

const orphanNames = (signature: string, names: readonly string[], io: { input?: string; output?: string } = {}) => {
  const common = { span: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }, raw: '', sourceForm: 'shortform' as const };
  const entities = [
    new ProgramNode({ ...common, name: 'App', entry: 'go', exports: ['go'] }),
    new FunctionNode({ ...common, name: 'go', signature, calls: [], pendingDependencies: [], ...io }),
    ...names.map((name) => new DtoNode({ ...common, name, fields: [] })),
  ];
  const context = new CheckContext({ entities, links: computeLinks(entities), parseDiagnostics: [] });
  checkOrphans(context);
  return context.findings.map((finding) => finding.message).toSorted();
};

it('TM13 B1: signature-only references consume DTO leaves', () => {
  assert.deepEqual(orphanNames('async go(boxes: Map<string, Boxed>) => Promise<Wrapped[]>', ['Wrapped', 'Boxed', 'Unused']), [
    "Orphaned entity 'Unused'",
  ]);
  assert.deepEqual(orphanNames('go(callback: (input: Store) => Lease | Failure) => void', ['Store', 'Lease', 'Failure']), []);
  assert.deepEqual(orphanNames('go(callback: Map<string, (input: Store) => Lease | Failure>) => void', ['Store', 'Lease', 'Failure']), []);
});

it('TM13 B1/G: builtin wrappers and opaque text create no false uses; constraints are real references', () => {
  assert.deepEqual(orphanNames('go<T>(value: T) => void', ['Constraint']), ["Orphaned entity 'Constraint'"]);
  assert.deepEqual(
    orphanNames('go<T extends Constraint>(callback: <U>(input: T, other: U) => Wrapped, value: Boxed = DefaultValue) => Promise<Wrapped>', [
      'T',
      'U',
      'Constraint',
      'Promise',
      'Wrapped',
      'Boxed',
      'DefaultValue',
      'callback',
    ]),
    ['DefaultValue', 'Promise', 'T', 'U', 'callback'].map((name) => `Orphaned entity '${name}'`).toSorted(),
  );
  assert.deepEqual(
    orphanNames('go(value: "Literal", object: { secret: Opaque }) => Map<string, Wrapped>', ['Literal', 'Opaque', 'Map', 'Wrapped']),
    ["Orphaned entity 'Literal'", "Orphaned entity 'Map'", "Orphaned entity 'Opaque'"],
  );
  assert.deepEqual(orphanNames('go(value: Promise) => Map', ['Promise', 'Map']), []);
});

it('TM13 B1: existing signatures and direct IO retain their reference verdicts', () => {
  assert.deepEqual(orphanNames('invalid trailing junk', ['Input', 'Output', 'Unused'], { input: 'Input', output: 'Output' }), [
    "Orphaned entity 'Unused'",
  ]);
  for (const signature of [
    'Wrapped trailing junk',
    'go(value: Wrapped trailing) => void',
    'go(value: Wrapped) =>',
    'go(value: Wrapped => void',
    'go(value: Wrapped, callback: (input: Store) => Lease trailing) => void',
  ]) {
    assert.deepEqual(orphanNames(signature, ['Wrapped']), ["Orphaned entity 'Wrapped'"], signature);
  }
});
