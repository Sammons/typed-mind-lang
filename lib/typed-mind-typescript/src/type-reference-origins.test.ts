import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it } from 'node:test';
import * as ts from 'typescript';
import { parseTypeTextOrigins } from './type-reference-origins.ts';

const required = <T>(value: T | undefined): T => {
  assert.notEqual(value, undefined);
  return value as T;
};

it('TM13 A1: mixed-origin type occurrences retain separate identity', () => {
  const root = mkdtempSync(join(tmpdir(), 'tm13-a1-origins-'));
  try {
    const source = `import type { Model as Renamed } from './model';
interface Local { value: string }
type Mixed<T> = Map<Local, Renamed[]> | { Renamed: 'Renamed'; callback: <T>(x: T) => Local };
const seed = 1;
type Query = Map<Local,typeof seed>|Local[];
`;
    writeFileSync(join(root, 'index.ts'), source);
    writeFileSync(join(root, 'model.ts'), 'export interface Model { id: string }');
    const program = ts.createProgram([join(root, 'index.ts')], {
      target: ts.ScriptTarget.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      module: ts.ModuleKind.ESNext,
    });
    const checker = program.getTypeChecker();
    const file = required(program.getSourceFile(join(root, 'index.ts')));
    const mixed = required(
      file.statements.find((node): node is ts.TypeAliasDeclaration => ts.isTypeAliasDeclaration(node) && node.name.text === 'Mixed'),
    );
    const info = parseTypeTextOrigins(mixed.type, program, checker);
    assert.deepEqual(
      info.references.map((reference) => reference.writtenName),
      ['Map', 'Local', 'Renamed', 'T', 'Local'],
    );
    assert.deepEqual(
      info.references.map((reference) => reference.origin.kind),
      ['typescript-lib', 'project', 'project', 'type-parameter', 'project'],
    );
    const alias = required(info.references[2]);
    assert.equal(alias.origin.kind === 'project' && alias.origin.declaration.name, 'Model');
    assert.equal(alias.origin.kind === 'project' && alias.origin.declaration.filePath, join(root, 'model.ts'));
    for (const reference of info.references) {
      assert.equal(info.text.slice(reference.start, reference.end), reference.writtenName);
      assert.equal(
        readFileSync(reference.source.filePath, 'utf8').slice(reference.source.start, reference.source.end),
        reference.writtenName,
      );
    }
    const query = required(
      file.statements.find((node): node is ts.TypeAliasDeclaration => ts.isTypeAliasDeclaration(node) && node.name.text === 'Query'),
    );
    const normalized = parseTypeTextOrigins(query.type, program, checker);
    assert.equal(normalized.text, 'Map<Local, (typeof seed)> | Local[]');
    for (const reference of normalized.references)
      assert.equal(normalized.text.slice(reference.start, reference.end), reference.writtenName);
    assert.deepEqual(
      normalized.references.map((reference) => reference.writtenName),
      ['Map', 'Local', 'seed', 'Local'],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

it('TM13 A1: origins distinguish alias project external unresolved and local parameter', () => {
  const root = mkdtempSync(join(tmpdir(), 'tm13-a1-kinds-'));
  try {
    mkdirSync(join(root, 'node_modules', 'fixture-external'), { recursive: true });
    writeFileSync(
      join(root, 'node_modules', 'fixture-external', 'package.json'),
      JSON.stringify({ name: 'fixture-external', types: 'index.d.ts' }),
    );
    writeFileSync(join(root, 'node_modules', 'fixture-external', 'index.d.ts'), 'export interface External { value: string }');
    writeFileSync(
      join(root, 'index.ts'),
      `import type { External } from 'fixture-external'; import type { Missing } from 'missing-package'; type Test<T> = [External, Missing, T, Unknown];`,
    );
    const program = ts.createProgram([join(root, 'index.ts')], {
      target: ts.ScriptTarget.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      module: ts.ModuleKind.ESNext,
    });
    const checker = program.getTypeChecker();
    const file = required(program.getSourceFile(join(root, 'index.ts')));
    const alias = required(file.statements.find(ts.isTypeAliasDeclaration));
    const info = parseTypeTextOrigins(alias.type, program, checker);
    assert.deepEqual(
      info.references.map((reference) => reference.origin.kind),
      ['external-package', 'unresolved', 'type-parameter', 'unresolved'],
    );
    const external = required(info.references[0]).origin;
    assert.equal(external.kind === 'external-package' && external.packageName, 'fixture-external');
    const standalone = ts.createSourceFile(join(root, 'standalone.ts'), 'type Alone = External;', ts.ScriptTarget.Latest, true);
    const alone = required(standalone.statements.find(ts.isTypeAliasDeclaration));
    assert.deepEqual(parseTypeTextOrigins(alone.type, program, checker).references[0]?.origin, {
      kind: 'unresolved',
      reason: 'checker-unavailable',
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
