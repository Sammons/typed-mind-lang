// Adversarial-review blocker fix (PR #105 review comment 2) —
// `reserveFileEntityNames` disambiguates a basename collision by parent
// directory name, falling back to the full sanitized relative directory
// path on a sub-collision. `sanitizeEntityName` is lossy (collapses '/',
// '-', '_', and case into one alnum-only PascalCase string), so two
// distinct full relative directory paths that differ only in
// separator/case/dash-vs-underscore shape can sanitize to the identical
// disambiguator even at the full-path fallback tier — without an explicit
// collision guard, the second module's reservation would silently
// clobber the first's, the same symptom RC-B was filed to close. Fixed by
// tracking every name `reserveFileEntityNames` has already assigned and
// appending a deterministic `2`, `3`, ... suffix on a genuine
// post-sanitize collision.
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
  const analyzer = new TypeScriptAnalyzer(fixturePath('43-file-basename-sanitized-collision'));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath('43-file-basename-sanitized-collision', 'src', 'index.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

describe('RC-B numeric-suffix backstop: two paths that sanitize identically still get distinct File entities', () => {
  it('pkg-a/x/events.ts and pkg_a/x/events.ts produce a distinct File entity each — neither clobbers the other', () => {
    const result = convert();
    assert.equal(result.success, true);

    const fileEntities = result.entities.filter((e) => e.kind === 'File') as ReadonlyArray<{ path: string; name: string }>;
    const dashFile = fileEntities.find((e) => e.path.includes('pkg-a'));
    const underscoreFile = fileEntities.find((e) => e.path.includes('pkg_a'));

    assert.notEqual(dashFile, undefined, `pkg-a/x/events.ts must have its own File entity, got: ${JSON.stringify(fileEntities)}`);
    assert.notEqual(underscoreFile, undefined, `pkg_a/x/events.ts must have its own File entity, got: ${JSON.stringify(fileEntities)}`);
    assert.notEqual(
      dashFile?.name,
      underscoreFile?.name,
      `the two File entities must have distinct names despite sanitizing identically, both got: ${dashFile?.name}`,
    );
  });

  it('neither fromPkgDashA nor fromPkgUnderscoreA is reported as unowned', async () => {
    const result = convert();
    assert.equal(result.success, true);

    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
    const tm = await TypedMind.create();
    const checkResult = tm.check(longform);

    const notExportedFindings = checkResult.diagnostics.filter(
      (d) =>
        d.message.includes('is not exported by any file') &&
        (d.message.includes('fromPkgDashA') || d.message.includes('fromPkgUnderscoreA')),
    );
    assert.deepEqual(
      notExportedFindings,
      [],
      `neither sanitized-collision victim should be reported unowned: ${JSON.stringify(notExportedFindings)}`,
    );
  });
});
