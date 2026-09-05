import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it } from 'node:test';
import * as ts from 'typescript';
import { parseTypeTextOrigins, resolveReferenceOrigin } from './type-reference-origins.ts';

const required = <T>(value: T | undefined): T => {
  assert.notEqual(value, undefined);
  return value as T;
};

it('TM13 A1: mixed-origin type occurrences retain separate identity', () => {
  const root = mkdtempSync(join(tmpdir(), 'tm13-a1-origins-'));
  try {
    const source = `import type { Model as Renamed } from './model';
import type * as namespace from './model';
import type { Model as OtherModel } from './other';
interface Local { value: string }
type Mixed<T> = Map<Local, Renamed[]> | { Renamed: 'Renamed'; callback: <T>(x: T) => Local };
const seed = 1;
type Query = Map<Local,typeof seed>|Local[];
type Qualified = namespace.Model | Renamed | OtherModel;
`;
    writeFileSync(join(root, 'index.ts'), source);
    writeFileSync(join(root, 'model.ts'), 'export interface Model { id: string }');
    writeFileSync(join(root, 'other.ts'), 'export interface Model { other: string }');
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
    const bound = required(info.references[3]).origin;
    assert.equal(bound.kind, 'type-parameter');
    if (bound.kind === 'type-parameter') {
      assert.equal(bound.declaration.start, source.indexOf('<T>(x: T)') + 1, 'the callback binder shadows the alias binder');
    }
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
    const qualifiedNode = required(
      file.statements.find(
        (candidate): candidate is ts.TypeAliasDeclaration => ts.isTypeAliasDeclaration(candidate) && candidate.name.text === 'Qualified',
      ),
    );
    const qualified = parseTypeTextOrigins(qualifiedNode.type, program, checker);
    assert.deepEqual(
      qualified.references.map((reference) => reference.writtenName),
      ['namespace.Model', 'Renamed', 'OtherModel'],
    );
    assert.deepEqual(
      qualified.references[0]?.origin,
      qualified.references[1]?.origin,
      'qualified and renamed imports share one declaration',
    );
    assert.notDeepEqual(
      qualified.references[0]?.origin,
      qualified.references[2]?.origin,
      'equal declaration names in distinct modules remain distinct',
    );
    for (const reference of qualified.references) assert.equal(qualified.text.slice(reference.start, reference.end), reference.writtenName);
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
    assert.deepEqual(info.references[1]?.origin, { kind: 'unresolved', reason: 'missing-declaration' });
    assert.deepEqual(info.references[3]?.origin, { kind: 'unresolved', reason: 'missing-declaration' });
    assert.deepEqual(resolveReferenceOrigin(undefined, program, checker), { kind: 'unresolved', reason: 'missing-symbol' });
    assert.deepEqual(parseTypeTextOrigins(undefined, program, checker), { text: 'any', source: undefined, references: [] });
    const reference = required(alias.type.getChildren().find(ts.isSyntaxList)?.getChildren().find(ts.isTypeReferenceNode));
    const symbol = checker.getSymbolAtLocation(reference.typeName);
    assert.deepEqual(resolveReferenceOrigin(symbol, program, checker, { mapDeclaration: () => null }), {
      kind: 'unresolved',
      reason: 'ambiguous-declaration',
    });
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
