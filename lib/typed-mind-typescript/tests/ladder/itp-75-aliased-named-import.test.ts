// Fixture 75 — itp-maker ladder rung. `parseImportDeclaration` recorded
// `element.name.text` for every named-import specifier. For an ALIASED
// specifier (`{ doWork as doWorkAliased }`) TypeScript's AST puts the
// LOCAL alias in `element.name` and the ORIGINAL exported name in
// `element.propertyName`, so the analyzer recorded a name the target
// module never exports. `resolveImportToEntity` then missed the export
// registry, contributed no import edge, and the imported file plus every
// entity it exports were reported orphaned despite a real, used import.
//
// Live evidence: itp-maker `cli/itp-cli.ts:51`
// (`import { adoptTemplate as adoptTemplateCmd } from
// "./commands/adopt-template.ts";`) produced an orphaned-file finding on
// `AdoptTemplateFile` plus an orphaned-entity finding on `adoptTemplate`.
//
// Fixed by recording `(element.propertyName ?? element.name).text` — the
// exported name is what the export registry is keyed by, so that is what
// the import edge must carry.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SyntaxEmitter, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(testDir, 'repros-analyzer', '75-aliased-named-import');

const analyze = () => {
  const analyzer = new TypeScriptAnalyzer(fixtureDir);
  return analyzer.analyzeFromEntrypoint(join(fixtureDir, 'src', 'main.ts'));
};

const convert = () => {
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analyze());
};

describe('fixture 75: an aliased named import resolves to the ORIGINAL exported name', () => {
  it('the analyzer records the exported name, not the local alias', () => {
    const analysis = analyze();
    const mainModule = analysis.modules.find((module) => module.filePath.endsWith('main.ts'));
    assert.notEqual(mainModule, undefined, 'main.ts module must be analyzed');

    const helperImport = mainModule?.imports.find((imported) => imported.specifier.includes('helper'));
    assert.notEqual(helperImport, undefined, 'the helper import must be recorded');
    assert.deepEqual(
      [...(helperImport?.namedImports ?? [])].sort(),
      ['alsoWork', 'doWork'],
      'namedImports must carry the exported names, not the local alias `doWorkAliased`',
    );
  });

  it('the aliased-import target is not orphaned', async () => {
    const result = convert();
    assert.equal(result.success, true);

    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({
      entities: result.entities as never,
      imports: [],
      suppressions: [],
      diagnostics: [],
    });
    const typedMind = await TypedMind.create();
    const checkResult = typedMind.check(longform);

    const orphanFindings = checkResult.diagnostics.filter((diagnostic) => diagnostic.code.startsWith('checker/orphan'));
    assert.deepEqual(orphanFindings, [], `a real, used aliased import must not orphan its target: ${JSON.stringify(orphanFindings)}`);
  });

  it('control: the unaliased sibling import in the SAME statement still resolves', () => {
    const result = convert();
    assert.equal(result.success, true);

    // `alsoWork` shares the import statement with `doWork` but carries no
    // alias. It resolved correctly before the fix and must keep resolving
    // after it — this is what isolates the defect to the alias
    // specifically rather than to import resolution generally.
    const mainFile = result.entities.find((entity) => (entity as { kind: string; name: string }).name === 'MainFile') as unknown as
      | { imports?: ReadonlyArray<string> }
      | undefined;
    assert.notEqual(mainFile, undefined, 'MainFile entity must exist');
    assert.deepEqual(
      [...(mainFile?.imports ?? [])].sort(),
      ['alsoWork', 'doWork'],
      'both the aliased and unaliased imports must appear as edges',
    );
  });
});
