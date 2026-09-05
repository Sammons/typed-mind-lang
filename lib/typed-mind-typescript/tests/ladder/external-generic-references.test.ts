import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it } from 'node:test';
import { DependencyNode } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

it('TM13 B2: external generic base and nested argument exports are emitted', (context) => {
  const project = mkdtempSync(join(tmpdir(), 'tm13-b2-'));
  context.after(() => rmSync(project, { recursive: true, force: true }));
  writeFileSync(join(project, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, noEmit: true } }));
  writeFileSync(
    join(project, 'index.ts'),
    [
      "import type { Generated, ExternalThing, ArrayItem, UnionItem, NestedBase, NestedItem, IntersectionItem, Unused } from 'external-lib';",
      'export interface Table {',
      '  id: Generated<ExternalThing>;',
      '  array: Pick<ArrayItem[], "id">;',
      '  union: Pick<UnionItem | null, "id">;',
      '  intersection: Pick<IntersectionItem & ExternalThing, "id">;',
      '  nested: Generated<NestedBase<ReadonlyArray<NestedItem>>>;',
      '  repeated: Generated<ExternalThing>;',
      '  missing: Promise<Missing>;',
      '}',
      'export const use = (table: Table): string => "ok";',
    ].join('\n'),
  );
  const analysis = new TypeScriptAnalyzer(project).analyzeFromEntrypoint(join(project, 'index.ts'));
  const result = new TypeScriptToTypedMindConverter().convert(analysis);
  assert.equal(result.success, true);
  const dependencies = result.entities.filter((entity) => entity instanceof DependencyNode);
  assert.equal(dependencies.length, 1);
  assert.deepEqual(dependencies[0]?.exports?.toSorted(), [
    'ArrayItem',
    'ExternalThing',
    'Generated',
    'IntersectionItem',
    'NestedBase',
    'NestedItem',
    'UnionItem',
  ]);
});
