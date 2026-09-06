// RFC-TM-14 (rfc-tm-14-diamond.md) §S1 "one body-reference substrate" and §S2
// "construct edges are spelled Owner.constructor" — Quantum U1's converter-side
// checks: leaves R1a-conv (fixture 126), R1b (fixture 127), R2a (fixture 115)
// and the D-16 pin R16-pin (fixture 125). The analyzer-side leaf R1c-analyzer
// (fixture 114) lives in src/typescript-analyzer.test.ts. U3b adds the Class
// `calls`/`consumes` checks (R1c-conv, R2b) to this file.
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it, type TestContext } from 'node:test';
import { ClassFileNode, ClassNode, FunctionNode, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const reprosDir = join(import.meta.dirname, 'repros-analyzer');

interface Edit {
  readonly file: string;
  readonly from: string;
  readonly to: string;
}

// Converts a fixture in place, or a tmpdir copy with `edits` applied (the
// doc's "removing the `new` restores the orphan" controls).
const convert = (context: TestContext, fixture: string, edits: readonly Edit[] = [], entry: readonly string[] = ['src', 'main.ts']) => {
  let project = join(reprosDir, fixture);
  if (edits.length > 0) {
    project = mkdtempSync(join(tmpdir(), `tm14-u1-${fixture}-`));
    context.after(() => rmSync(project, { recursive: true, force: true }));
    cpSync(join(reprosDir, fixture), project, { recursive: true });
    for (const edit of edits) {
      const file = join(project, edit.file);
      const before = readFileSync(file, 'utf8');
      assert.ok(before.includes(edit.from), `edit target '${edit.from}' must exist in ${edit.file}`);
      writeFileSync(file, before.replace(edit.from, edit.to));
    }
  }
  const analysis = new TypeScriptAnalyzer(project).analyzeFromEntrypoint(join(project, ...entry));
  const converted = new TypeScriptToTypedMindConverter().convert(analysis);
  assert.equal(converted.success, true, JSON.stringify(converted.errors));
  return { analysis, converted };
};

const check = async (tmdContent: string) => (await TypedMind.create()).check(tmdContent);

const findingsOf = async (tmdContent: string, code: string) =>
  (await check(tmdContent)).diagnostics.filter((finding) => finding.code === code).map((finding) => finding.message);

const functionNamed = (converted: ReturnType<typeof convert>['converted'], name: string): FunctionNode => {
  const entity = converted.entities.find((candidate) => candidate.name === name);
  assert.ok(entity instanceof FunctionNode, `${name} is a Function`);
  return entity;
};

const classEntity = (converted: ReturnType<typeof convert>['converted'], name: string): ClassNode | ClassFileNode => {
  const entity = converted.entities.find((candidate) => candidate.name === name);
  assert.ok(entity instanceof ClassNode || entity instanceof ClassFileNode, `${name} is a Class or ClassFile`);
  return entity;
};

it('TM14 U1: construct edge to a ClassFile is emitted and credits the class', async (context) => {
  const { converted } = convert(context, '126-same-file-construct-classfile');
  assert.ok(converted.entities.find((entity) => entity.name === 'Walker') instanceof ClassFileNode, 'Walker fused into a ClassFile');
  assert.ok(converted.entities.find((entity) => entity.name === 'Cursor') instanceof ClassFileNode, 'Cursor fused into a ClassFile');
  assert.deepEqual(functionNamed(converted, 'walk').calls, ['Walker.constructor']);
  assert.deepEqual(functionNamed(converted, 'scan').calls, ['Cursor.constructor']);
  assert.ok(converted.tmdContent.includes('~> [Walker.constructor]'), converted.tmdContent);
  assert.ok(converted.tmdContent.includes('~> [Cursor.constructor]'), converted.tmdContent);
  const checked = await check(converted.tmdContent);
  assert.deepEqual(checked.diagnostics, []);

  // Removal controls: dropping either `new` restores exactly that class's orphan.
  const withoutWalker = convert(context, '126-same-file-construct-classfile', [
    { file: join('src', 'walker.ts'), from: 'new Walker(root).walk()', to: 'root.length' },
  ]);
  assert.deepEqual(functionNamed(withoutWalker.converted, 'walk').calls, []);
  assert.deepEqual(await findingsOf(withoutWalker.converted.tmdContent, 'checker/orphaned-entity'), ["Orphaned entity 'Walker'"]);

  const withoutCursor = convert(context, '126-same-file-construct-classfile', [
    { file: join('src', 'cursor.ts'), from: 'new Cursor()', to: 'undefined' },
  ]);
  assert.deepEqual(functionNamed(withoutCursor.converted, 'scan').calls, []);
  assert.deepEqual(await findingsOf(withoutCursor.converted.tmdContent, 'checker/orphaned-entity'), ["Orphaned entity 'Cursor'"]);
});

it('TM14 U1: a private same-file class constructed in a function is referenced', async (context) => {
  const { converted } = convert(context, '127-same-file-construct-private-class');
  assert.ok(converted.entities.find((entity) => entity.name === 'Registry') instanceof ClassNode, 'Registry is a plain Class');
  assert.deepEqual(functionNamed(converted, 'make').calls, ['Registry.constructor']);
  assert.deepEqual(converted.suppressionCounts, { 'generated-single-file-scope': 1 });
  assert.ok(converted.tmdContent.includes('suppress Registry checker/class-not-exported "generated-single-file-scope"'));
  assert.equal(converted.tmdContent.includes('checker/orphaned-entity'), false, 'no orphan pre-suppression for a construct target');
  const checked = await check(converted.tmdContent);
  assert.deepEqual(
    checked.diagnostics.map((finding) => [finding.code, finding.suppression?.reason]),
    [['checker/class-not-exported', 'generated-single-file-scope']],
  );
  assert.equal(checked.valid, true);
});

it('TM14 U1: function-body Constants reads emit consumes', async (context) => {
  const { converted, analysis } = convert(context, '115-body-constants-read');
  assert.deepEqual(functionNamed(converted, 'apply').consumes, ['LIMIT', 'TABLE']);
  assert.deepEqual(functionNamed(converted, 'apply').calls, []);
  assert.deepEqual(functionNamed(converted, 'pack').consumes, ['LIMIT'], 'a shorthand property is a read (A-10)');
  assert.equal(functionNamed(converted, 'shadow').consumes, undefined);
  assert.equal(functionNamed(converted, 'local').consumes, undefined);
  assert.ok(converted.tmdContent.includes('$< [LIMIT, TABLE]'), converted.tmdContent);
  // The shadowing controls resolve to their own declarations at the analyzer.
  const functions = analysis.modules.flatMap((module) => module.functions);
  const readsOf = (name: string) =>
    functions
      .find((fn) => fn.name === name)
      ?.bodyReferences.filter((reference) => reference.kind === 'read')
      .map((reference) => reference.writtenName);
  assert.deepEqual(readsOf('apply'), ['LIMIT', 'TABLE']);
  assert.deepEqual(readsOf('pack'), ['LIMIT']);
  assert.deepEqual(readsOf('shadow'), []);
  assert.deepEqual(readsOf('local'), []);
  const checked = await check(converted.tmdContent);
  assert.deepEqual(checked.diagnostics, []);
});

it('D-16: a class constructed inside a private function is credited transitively through the caller', async (context) => {
  const { converted } = convert(context, '125-private-helper-chain');
  assert.ok(converted.entities.find((entity) => entity.name === 'Source') instanceof ClassFileNode, 'Source fused into a ClassFile');
  assert.equal(
    converted.entities.some((entity) => entity.name === 'parse'),
    false,
    'the private function has no entity (P8)',
  );
  assert.deepEqual(functionNamed(converted, 'parseText').calls, ['Source.constructor'], 'transitive construct edge through private parse');
  assert.deepEqual(await findingsOf(converted.tmdContent, 'checker/orphaned-entity'), []);
  const checked = await check(converted.tmdContent);
  assert.equal(checked.valid, true);

  // Removal control: dropping the `new Source()` in parse restores the orphan.
  const withoutConstruct = convert(context, '125-private-helper-chain', [
    { file: join('src', 'source.ts'), from: 'new Source()', to: 'undefined' },
  ]);
  assert.deepEqual(functionNamed(withoutConstruct.converted, 'parseText').calls, []);
  assert.deepEqual(await findingsOf(withoutConstruct.converted.tmdContent, 'checker/orphaned-entity'), ["Orphaned entity 'Source'"]);
});

it('TM14 U3b: class member bodies emit calls and construct edges (R1c-conv)', async (context) => {
  const { converted } = convert(context, '114-member-body-edges');
  const store = classEntity(converted, 'Store');
  assert.ok(store instanceof ClassFileNode, 'Store is fused into a ClassFile');
  assert.deepEqual(store.calls.toSorted(), ['Cache.constructor', 'helper']);
  assert.deepEqual([...(store.consumes ?? [])].sort(), ['ErrorTable', 'LIMIT']);
  assert.ok(converted.tmdContent.includes('calls: [helper, Cache.constructor]'), 'calls emitted in tmd');
  assert.ok(converted.tmdContent.includes('consumes: [ErrorTable, LIMIT]'), 'consumes emitted in tmd');
  const orphans = await findingsOf(converted.tmdContent, 'checker/orphaned-entity');
  for (const name of ['helper', 'Cache', 'LIMIT', 'ErrorTable']) {
    assert.equal(orphans.includes(`Orphaned entity '${name}'`), false, `${name} is not orphaned`);
  }

  // S2-8 control: Self.make() calls new Self() but the self target is skipped.
  const self = classEntity(converted, 'Self');
  assert.deepEqual(self.calls, []);
  assert.deepEqual(await findingsOf(converted.tmdContent, 'checker/orphaned-entity'), ["Orphaned entity 'Self'"]);
});

it('TM14 U3b: class member bodies emit consumes for Constants roots (R2b)', async (context) => {
  const { converted } = convert(context, '114-member-body-edges');
  const store = classEntity(converted, 'Store');
  assert.deepEqual([...(store.consumes ?? [])].sort(), ['ErrorTable', 'LIMIT']);
  // Cache is referenced via construct, not read — it does not appear in consumes.
  assert.equal(store.consumes?.includes('Cache'), false);
});
