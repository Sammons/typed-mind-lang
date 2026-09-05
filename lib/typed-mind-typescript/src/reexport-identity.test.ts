import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { it, type TestContext } from 'node:test';
import { FileNode, FunctionNode, TypedMind } from '@sammons/typed-mind';
import type { TypeScriptProjectAnalysis } from './types.ts';
import { TypeScriptAnalyzer } from './typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from './typescript-to-typedmind-converter.ts';

const project = (context: TestContext, overrides: Record<string, string> = {}) => {
  const root = mkdtempSync(join(tmpdir(), 'tm13-reexport-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [path, text] of Object.entries({
    'tsconfig.json': JSON.stringify({
      compilerOptions: { module: 'NodeNext', moduleResolution: 'NodeNext', strict: true },
      include: ['*.ts'],
    }),
    'index.ts':
      'import { quoteStringLiteral } from "./barrel.js"; export { encodeQuotedString as other } from "./other.js"; export function use(value: string): string { return quoteStringLiteral(value); }',
    'barrel.ts': 'export { encodeQuotedString as quoteStringLiteral } from "./quoted.js";',
    'quoted.ts': 'export const encodeQuotedString = (value: string): string => value;',
    'other.ts': 'export const encodeQuotedString = (value: string): string => "other" + value;',
    ...overrides,
  })) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return new TypeScriptAnalyzer(root).analyzeFromEntrypoint(join(root, 'index.ts'));
};
const convert = (analysis: TypeScriptProjectAnalysis) => new TypeScriptToTypedMindConverter().convert(analysis);

it('TM13 EXIT: a direct reexport alias retains its actual source target and public spelling', async (context) => {
  const analysis = project(context);
  const barrel = analysis.modules.find((module) => module.filePath.endsWith('/barrel.ts'));
  const quoted = analysis.modules.find((module) => module.filePath.endsWith('/quoted.ts'));
  assert.ok(barrel && quoted);
  assert.deepEqual(barrel.exports[0]?.declaration, quoted.functions[0]?.declaration);
  assert.equal(barrel.exports[0]?.name, 'quoteStringLiteral');
  assert.equal(barrel.exports[0]?.source, './quoted.js');
  const graph = structuredClone(analysis.moduleGraph);
  const result = convert(analysis);
  assert.equal(result.success, true);
  const owner = result.entities.find((entity) => entity instanceof FileNode && entity.path === 'barrel.ts');
  const targetOwner = result.entities.find((entity) => entity instanceof FileNode && entity.path === 'quoted.ts');
  const consumer = result.entities.find((entity) => entity instanceof FileNode && entity.path === 'index.ts');
  assert.ok(owner instanceof FileNode && targetOwner instanceof FileNode && consumer instanceof FileNode);
  assert.deepEqual(owner.reExports, ['quoteStringLiteral']);
  assert.deepEqual(owner.exports, []);
  assert.equal(owner.imports.length, 1);
  assert.deepEqual(owner.imports, targetOwner.exports);
  assert.ok(consumer.imports.includes(owner.name), 'consumer resolves through the actual alias barrel');
  const target = result.entities.find((entity) => entity.name === owner.imports[0]);
  assert.ok(target instanceof FunctionNode);
  assert.equal(
    result.entities.some((entity) => entity.name === 'quoteStringLiteral'),
    false,
  );
  assert.deepEqual(analysis.moduleGraph, graph);
  const tm = await TypedMind.create();
  const checked = tm.checkWithParseGate(result.tmdContent);
  assert.equal(
    checked.diagnostics.some((item) => item.message === `Orphaned entity '${target.name}'`),
    false,
  );
  assert.equal(
    checked.diagnostics.some((item) => item.code === 'checker/multi-exported'),
    false,
  );
  const removed = convert({
    ...analysis,
    modules: analysis.modules.map((module) => (module === barrel ? { ...module, exports: [] } : module)),
  });
  assert.ok(tm.checkWithParseGate(removed.tmdContent).diagnostics.some((item) => item.message === `Orphaned entity '${target.name}'`));
});

it('TM13 EXIT: absent or mismatched reexport identities never borrow a same-name target', (context) => {
  const analysis = project(context);
  const barrel = analysis.modules.find((module) => module.filePath.endsWith('/barrel.ts'));
  assert.ok(barrel?.exports[0]?.declaration);
  const identity = barrel.exports[0].declaration;
  for (const declaration of [undefined, { ...identity, start: identity.start + 1 }]) {
    const modified = {
      ...analysis,
      modules: analysis.modules.map((module) =>
        module === barrel ? { ...module, exports: module.exports.map((exp) => ({ ...exp, declaration })) } : module,
      ),
    };
    const result = convert(modified);
    const owner = result.entities.find((entity) => entity instanceof FileNode && entity.path === 'barrel.ts');
    assert.ok(owner instanceof FileNode);
    assert.deepEqual(owner.imports, []);
    assert.deepEqual(owner.reExports, ['quoteStringLiteral']);
  }
});

it('TM13 EXIT: TypeDef, external and ordinary reexports retain their existing lanes', async (context) => {
  const analysis = project(context, {
    'index.ts':
      'import { quoteStringLiteral } from "./barrel.js"; export function use(value: string): string { return quoteStringLiteral(value); }',
    'barrel.ts':
      'export { State as Phase, encodeQuotedString } from "./quoted.js"; export { unavailable as Remote } from "missing-package";',
    'quoted.ts': 'export type State = "on" | "off"; export const encodeQuotedString = (value: string): string => value;',
  });
  const result = convert(analysis);
  const owner = result.entities.find((entity) => entity instanceof FileNode && entity.path === 'barrel.ts');
  assert.ok(owner instanceof FileNode);
  const legacy = convert({
    ...analysis,
    modules: analysis.modules.map((module) => ({
      ...module,
      exports: module.exports.map(({ declaration: _declaration, ...exp }) => exp),
    })),
  });
  const legacyOwner = legacy.entities.find((entity) => entity instanceof FileNode && entity.path === 'barrel.ts');
  assert.ok(legacyOwner instanceof FileNode);
  assert.deepEqual(owner.imports, legacyOwner.imports);
  assert.equal(
    owner.imports.some((name) => ['State', 'Phase', 'Remote'].includes(name)),
    false,
  );
  assert.deepEqual(owner.exports, []);
  assert.deepEqual(owner.reExports, ['Phase', 'encodeQuotedString', 'Remote']);
  const barrel = analysis.modules.find((module) => module.filePath.endsWith('/barrel.ts'));
  assert.equal(barrel?.exports.find((exp) => exp.name === 'Remote')?.declaration, undefined);
  const tm = await TypedMind.create();
  assert.ok(
    tm
      .checkWithParseGate('A @ a.ts:\n  -> [shared]\nB @ b.ts:\n  -> [shared]\nshared :: () => void\n')
      .diagnostics.some((item) => item.code === 'checker/multi-exported'),
  );
});
