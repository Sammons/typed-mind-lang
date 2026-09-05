// RFC-TM-14 (rfc-tm-14-diamond.md) S7, leaf R9, Quantum U7 — a retained
// private method-bearing interface converts to a Class and is declared as
// `Owner.Name` under its physical file, absent from `Owner.exports`.
//
// P6: TM-13 EXIT retains a non-exported interface reached from an emitted
// surface; a method-bearing one takes the Class lane. The converter used to
// emit it under a standalone name, so `check-exports.ts`
// (`checkClassAndFunctionExports`) reported `checker/class-not-exported` for
// a class the source never exported (live: `DocumentClientLike` in ingest
// and api). The checker already exempts an owner-qualified declared entity,
// and the resolver models privacy as "declared under an owner, not in the
// owner's exports" (`qualified-name-resolver.ts`): same-file references
// resolve, other files get `private-member`.
//
// Fix (converter `reserveEntityNames`): a private Class-lane interface never
// contests the bare name and is reserved as `${owner}.${name}` after File
// owners exist; a pure-types module that declares one gains a File owner
// through `needsOwner`. Check bindings (fixture 122):
//   (a) `RunFile.ClientLike` is a ClassNode; `RunFile.exports` is `[run]`.
//   (b) `run`'s signature reads `(c: RunFile.ClientLike)`.
//   (c) `UpdateClient.UpdateCommand` (tmpdir stub package) resolves.
//   (d) `ShapesFile` exists for the pure-types module and owns
//       `ShapesFile.Reporter`; both DTO carriers (`interface Job`, and the
//       type alias `Batch` whose object-literal members the type parser
//       treats as opaque) reference `ShapesFile.Reporter`; zero checker
//       findings overall.
//   (e) control: importing `RunFile.ClientLike` from `MainFile` reports the
//       `private-member` wording from `check-context.ts`.
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { it, type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ClassNode, FileNode, FunctionNode, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(testDir, 'repros-analyzer', '122-private-method-interface-retained');

// The fixture imports `UpdateCommand` from the package `update-client`. The
// repo ignores `node_modules/`, so the package is a stub written into a
// tmpdir copy of the fixture (the `typed-members.test.ts` pattern).
const fixtureWithStubPackage = (context: TestContext): string => {
  const root = mkdtempSync(join(tmpdir(), 'tm14-u7-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(fixtureDir, root, { recursive: true });
  const packageDir = join(root, 'node_modules', 'update-client');
  mkdirSync(packageDir, { recursive: true });
  writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ name: 'update-client', version: '1.0.0', types: 'index.d.ts' }));
  writeFileSync(join(packageDir, 'index.d.ts'), 'export interface UpdateCommand { id: string; }\n');
  return root;
};

it('TM14 U7: a retained private interface is owner-qualified and passes export checks', async (context) => {
  const root = fixtureWithStubPackage(context);
  const analysis = new TypeScriptAnalyzer(root).analyzeFromEntrypoint(join(root, 'src', 'main.ts'));
  const result = new TypeScriptToTypedMindConverter().convert(analysis);
  assert.equal(result.success, true, JSON.stringify(result.errors));
  assert.deepEqual(result.warnings, []);

  const byName = new Map(result.entities.map((entity) => [entity.name, entity]));
  assert.ok(byName.get('RunFile.ClientLike') instanceof ClassNode, 'RunFile.ClientLike is a Class');
  assert.equal(byName.has('ClientLike'), false, 'no bare ClientLike');
  const runFile = byName.get('RunFile');
  assert.ok(runFile instanceof FileNode);
  assert.deepEqual(runFile.exports, ['run']);
  assert.deepEqual(runFile.imports, ['UpdateClient']);

  const run = byName.get('run');
  assert.ok(run instanceof FunctionNode);
  assert.ok(result.tmdContent.includes('run :: async run(c: RunFile.ClientLike) => any'), result.tmdContent);
  assert.ok(result.tmdContent.includes('method: "send(command: UpdateClient.UpdateCommand) => Promise<unknown>"'), result.tmdContent);

  // The pure-types module gains a File owner only because it declares a
  // private Class; the DTO it exports stays bare.
  const shapesFile = byName.get('ShapesFile');
  assert.ok(shapesFile instanceof FileNode);
  assert.deepEqual(shapesFile.exports, ['Job', 'Batch']);
  assert.ok(byName.get('ShapesFile.Reporter') instanceof ClassNode, 'ShapesFile.Reporter is a Class');
  assert.equal(byName.has('Reporter'), false, 'no bare Reporter');
  assert.ok(result.tmdContent.includes('- reporter: ShapesFile.Reporter'), result.tmdContent);
  assert.ok(result.tmdContent.includes('- reporters: ShapesFile.Reporter[]'), result.tmdContent);
  assert.ok(result.tmdContent.includes('- fallback?: ShapesFile.Reporter'), result.tmdContent);

  const mind = await TypedMind.create();
  assert.deepEqual(mind.check(result.tmdContent).diagnostics, []);

  // Control: the private identity is not importable by another file.
  const control = result.tmdContent.replace('<- [run, Batch, Job]', '<- [run, Batch, Job, RunFile.ClientLike]');
  assert.notEqual(control, result.tmdContent);
  assert.deepEqual(
    mind.check(control).diagnostics.map((finding) => [finding.code, finding.message]),
    [
      [
        'checker/qualified-name-unresolved',
        "Qualified name 'RunFile.ClientLike' is owned by 'RunFile' but is not exported for this reference",
      ],
    ],
  );
});
