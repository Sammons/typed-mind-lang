// RFC-TM-10 follow-up (issue #80) — extraction ladder verdict
// (diagnostic-legitimacy-ladder-2026-08-29.md, disposition #4): D-LEG-3's
// namespace-qualified-implements fix (issue #61) makes a class like
// `CollectingParseConfigHost` PARSABLE, but a module-internal class that is
// never exported from its own file still, correctly, flags
// `checker/class-not-exported` (RFC-TM-4, frozen) — a true statement, not a
// false positive. This fixture proves the checker's rule fires on the
// general shape, and that the real fix (exporting the class, applied to the
// live `typescript-analyzer.ts`'s `CollectingParseConfigHost`) clears it.
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

const checkViaLongform = async (entities: readonly unknown[]) => {
  const emitter = new SyntaxEmitter();
  const longform = emitter.emitLongform({ entities: entities as never, imports: [], suppressions: [], diagnostics: [] });
  const tm = await TypedMind.create();
  return { longform, result: tm.check(longform) };
};

describe('RFC-TM-10 follow-up check — issue #80: namespace-implements class-not-exported', () => {
  it('an un-exported class implementing a namespace-qualified interface flags class-not-exported (true statement, not a false positive)', async () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('34-namespace-implements-not-exported'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('34-namespace-implements-not-exported', 'src', 'main.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);
    assert.equal(result.success, true);

    const { result: checkResult } = await checkViaLongform(result.entities);
    const classNotExported = checkResult.diagnostics.filter((d) => d.code === 'checker/class-not-exported');
    assert.equal(classNotExported.length, 1);
    assert.equal(classNotExported[0]?.message, "Class 'InternalParseConfigHost' is not exported by any file");
  });

  it('self-extraction: the real CollectingParseConfigHost (typescript-analyzer.ts, now exported) does not flag class-not-exported', async () => {
    // typed-mind-typescript's own source is the self-extraction ladder
    // target — exercises the actual fix (typescript-analyzer.ts's
    // CollectingParseConfigHost gained `export`), not only the isolated
    // fixture above.
    const projectDir = join(testDir, '..', '..');
    const analyzer = new TypeScriptAnalyzer(projectDir);
    const analysis = analyzer.analyzeFromEntrypoint(join(projectDir, 'src', 'cli.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);
    assert.equal(result.success, true);

    const { result: checkResult } = await checkViaLongform(result.entities);
    const classNotExported = checkResult.diagnostics.filter((d) => d.code === 'checker/class-not-exported');

    // Gap 81 widened this self-extraction's reach. `tsconfig.json` here
    // declares `references: [{ "path": "../typed-mind" }]`, so the sibling
    // package is now classified internal and traversed into its SOURCE instead
    // of stopping at its `dist/*.d.ts`. That surfaces `LinkCollector`
    // (lib/typed-mind/src/pipeline/link-index.ts:82) — a genuinely
    // module-internal class, constructed and consumed only inside its own
    // file, exported by nothing.
    //
    // The finding is a TRUE statement of exactly the kind this suite's first
    // case pins, newly reachable rather than newly wrong. The assertion names
    // it explicitly (rather than relaxing to a substring or a count) so that
    // any OTHER class-not-exported appearing here still fails.
    assert.deepEqual(
      classNotExported.map((d) => d.message),
      ["Class 'LinkCollector' is not exported by any file"],
      'CollectingParseConfigHost must not flag (it is exported); LinkCollector legitimately does, and is only visible because referenced projects are now traversed',
    );
  });
});
