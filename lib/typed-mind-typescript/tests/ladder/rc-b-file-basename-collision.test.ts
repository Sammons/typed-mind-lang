// RC-B (ladder-diagnostic-disposition-2026-08-29.md rank 2, issue #100) —
// `convertToSeparateEntities` derived `fileEntityName` from BASENAME ONLY
// (`createEntityName('${baseName}File')`), with no directory
// disambiguation. Its `if (!this.entityNames.has(fileEntityName))` guard
// silently skipped creating a second FileNode when two modules in
// different directories shared a basename
// (`packages/functions/src/api/db/events.ts` vs
// `packages/functions/src/api/routes/events.ts` in the real webhookstorage
// clone) — the losing module's File entity never existed at all, and its
// functions became ownerless ("Function X is not exported by any file").
// Fixed by `reserveFileEntityNames`'s whole-run, order-independent
// pre-pass: it groups every module by basename first, then disambiguates
// ONLY the basenames that actually collide, by parent directory name.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SyntaxEmitter, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');
const fixturePath = (name: string, ...segments: string[]): string => join(reprosDir, name, ...segments);

const convert = () => {
  const analyzer = new TypeScriptAnalyzer(fixturePath('39-file-basename-collision'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('39-file-basename-collision', 'src', 'index.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('RC-B: same-basename files in different directories both survive as distinct File entities', () => {
  it('both db/events.ts and routes/events.ts produce a distinct File entity — neither clobbers the other', () => {
    const result = convert();
    assert.equal(result.success, true);

    const fileEntities = result.entities.filter((e) => e.kind === 'File') as ReadonlyArray<{ path: string; name: string }>;
    const dbEventsFile = fileEntities.find((e) => e.path.endsWith('db/events.ts') || e.path.endsWith('db\\events.ts'));
    const routesEventsFile = fileEntities.find((e) => e.path.endsWith('routes/events.ts') || e.path.endsWith('routes\\events.ts'));

    assert.notEqual(dbEventsFile, undefined, `db/events.ts must have its own File entity, got: ${JSON.stringify(fileEntities)}`);
    assert.notEqual(routesEventsFile, undefined, `routes/events.ts must have its own File entity, got: ${JSON.stringify(fileEntities)}`);
    assert.notEqual(
      dbEventsFile?.name,
      routesEventsFile?.name,
      `the two File entities must have distinct names, both got: ${dbEventsFile?.name}`,
    );
  });

  it('neither listEvents nor getEventRoute is reported as unowned — both functions have a real exporting File', () => {
    const result = convert();
    assert.equal(result.success, true);

    const listEvents = result.entities.find((e) => e.kind === 'Function' && e.name === 'listEvents');
    const getEventRoute = result.entities.find((e) => e.kind === 'Function' && e.name === 'getEventRoute');
    assert.notEqual(listEvents, undefined, 'listEvents must be extracted as a real Function entity');
    assert.notEqual(getEventRoute, undefined, 'getEventRoute must be extracted as a real Function entity');

    const fileEntities = result.entities.filter((e) => e.kind === 'File') as ReadonlyArray<{ exports: readonly string[] }>;
    const someFileExportsListEvents = fileEntities.some((e) => e.exports.includes('listEvents'));
    const someFileExportsGetEventRoute = fileEntities.some((e) => e.exports.includes('getEventRoute'));
    assert.ok(someFileExportsListEvents, 'some File entity must export listEvents');
    assert.ok(someFileExportsGetEventRoute, 'some File entity must export getEventRoute');
  });

  it("checker verdict: neither function is flagged 'not exported by any file'", async () => {
    const result = convert();
    assert.equal(result.success, true);

    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
    const tm = await TypedMind.create();
    const checkResult = tm.check(longform);

    const notExportedFindings = checkResult.diagnostics.filter(
      (d) => d.message.includes('is not exported by any file') && (d.message.includes('listEvents') || d.message.includes('getEventRoute')),
    );
    assert.deepEqual(
      notExportedFindings,
      [],
      `neither collision victim should be reported unowned: ${JSON.stringify(notExportedFindings)}`,
    );
  });
});
