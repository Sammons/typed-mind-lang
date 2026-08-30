// RC-F (issue #108) — `isPureTypesFile` (typescript-to-typedmind-
// converter.ts) classified a route/handler module whose handlers are
// inline arrow callbacks (Hono `.openapi(route, async (c) => {...})`) as
// "pure types," because its `hasRealCode` check only ever inspected
// `module.classes`/`module.functions` — both populated from top-level
// `function`/`class` DECLARATIONS only, never from a function/arrow
// expression buried inside a call argument. `processModule` then routed
// the misclassified module to `convertTypesAndConstants`, which never
// calls `convertImports`, silently dropping every real cross-file import
// the file has (`getDpaStatus` in this fixture). Fixed by having the
// analyzer detect a top-level registration-callback call
// (`hasTopLevelCallbackRegistration` on `ParsedModule`) and folding that
// signal into `isPureTypesFile`'s `hasRealCode` check.
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
  const analyzer = new TypeScriptAnalyzer(fixturePath('46-hono-route-callback'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('46-hono-route-callback', 'src', 'index.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('RC-F: a route module whose handlers are inline arrow callbacks is not misclassified as pure-types', () => {
  it("the route module's File entity names its real cross-file import", () => {
    const result = convert();
    assert.equal(result.success, true);

    const accountRoutesFile = result.entities.find((e) => e.kind === 'File' && e.path.endsWith('routes/account.ts')) as
      | { imports: readonly string[] }
      | undefined;
    assert.notEqual(accountRoutesFile, undefined, "routes/account.ts's File entity must exist");
    assert.ok(
      accountRoutesFile?.imports.includes('getDpaStatus'),
      `expected 'getDpaStatus' (from ../db.ts) in the route module's imports list, got: ${JSON.stringify(accountRoutesFile?.imports)}`,
    );
  });

  it('getDpaStatus is a real, resolvable entity', () => {
    const result = convert();
    assert.equal(result.success, true);

    const getDpaStatus = result.entities.find((e) => e.kind === 'Function' && e.name === 'getDpaStatus');
    assert.notEqual(getDpaStatus, undefined, 'getDpaStatus must be extracted as a real entity');
  });

  it('checker verdict: zero orphaned-entity findings for getDpaStatus', async () => {
    const result = convert();
    assert.equal(result.success, true);

    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
    const tm = await TypedMind.create();
    const checkResult = tm.check(longform);

    const orphanFindings = checkResult.diagnostics.filter(
      (d) => d.code === 'checker/orphaned-entity' && d.message.includes('getDpaStatus'),
    );
    assert.deepEqual(
      orphanFindings,
      [],
      `getDpaStatus must not orphan now that routes/account.ts's import edge resolves: ${JSON.stringify(orphanFindings)}`,
    );
  });

  it('a genuinely pure-types module (no registration calls) is still classified pure-types', () => {
    // Control case — confirms the fix does not widen `hasRealCode` so far
    // that an actual types-only file starts gaining a redundant File
    // entity. Reuses fixture 44's `lazy.ts` support file, which has zero
    // classes/functions/registration calls and only a `const` export.
    const analyzer = new TypeScriptAnalyzer(fixturePath('44-lazy-dynamic-import'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('44-lazy-dynamic-import', 'src', 'App.ts'));
    const lazyModule = analysis.modules.find((m) => m.filePath.endsWith('lazy.ts'));
    assert.notEqual(lazyModule, undefined, 'lazy.ts module must be analyzed');
    assert.equal(
      lazyModule?.hasTopLevelCallbackRegistration,
      false,
      'lazy.ts has no top-level registration-callback call and must not trip the new signal',
    );
  });
});
