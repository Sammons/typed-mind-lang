// RFC-TM-5 §1 (rfc-tm-5-diamond.md) — toggleFormat drops the Result box: the
// facade's toggleFormat/detectFormat are plain synchronous methods, no
// `_tag`/`.value`/`.error` unwrapping (legacy server.ts:696-711).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';
import { handleToggleFormat } from './toggle-format.ts';

const SOURCE = `AppEntry @ src/index.ts:
  -> [start]
`;

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '..', '..', '..');
const scenariosDir = join(repoRoot, 'lib', 'typed-mind-test-suite', 'scenarios');

describe('handleToggleFormat (RFC-TM-5 §1)', () => {
  it('returns newText from the facade toggleFormat call directly, with no Result-box unwrapping', async () => {
    const typedMind = await TypedMind.create();
    const result = handleToggleFormat(typedMind, SOURCE, { uri: 'file:///test.tmd' });
    assert.equal(typeof result.newText, 'string');
    assert.equal(result.newText.length > 0, true);
    assert.equal(result.error, undefined);
  });

  it('processes only the selected line range when a range is provided', async () => {
    const typedMind = await TypedMind.create();
    const multiline = `${SOURCE}\nSecondEntity ^ "unrelated dependency"\n`;
    const fullResult = handleToggleFormat(typedMind, multiline, { uri: 'file:///test.tmd' });
    const rangedResult = handleToggleFormat(typedMind, multiline, { uri: 'file:///test.tmd', range: { start: 0, end: 1 } });
    assert.notEqual(rangedResult.newText, fullResult.newText);
  });

  // Defect fix (same-day follow-up to PR #122, independent post-merge review
  // finding) — params.uri must resolve @import statements end to end, the
  // same way the CLI's filePath argument does for parse()/check(). Before
  // the fix, handleToggleFormat never passed params.uri through at all, so
  // AuthService (defined only in the imported module) silently vanished.
  it('resolves @import statements end to end via params.uri (real file:// URI, not a synthetic path)', async () => {
    const typedMind = await TypedMind.create();
    const path = join(scenariosDir, 'scenario-20-basic-import.tmd');
    const source = readFileSync(path, 'utf8');
    const uri = pathToFileURL(path).toString();
    const result = handleToggleFormat(typedMind, source, { uri });
    assert.equal(result.error, undefined);
    assert.equal(result.newText.includes('AuthFile'), true);
  });

  // Regression guard for the PR #123 review blocker (comment id=20118): a
  // range-scoped toggle's newText replaces ONLY the selected lines, so
  // resolving imports there would splice the entire imported module into a
  // small selection replacement — duplicating imported entities into the
  // document as local text. Range toggles must stay in single-document mode
  // even when params.uri is a valid file:// URI for an import-bearing file.
  it('a range-scoped toggle never resolves imports, even with a valid file:// URI', async () => {
    const typedMind = await TypedMind.create();
    const path = join(scenariosDir, 'scenario-20-basic-import.tmd');
    const source = readFileSync(path, 'utf8');
    const uri = pathToFileURL(path).toString();
    // A small selection that includes the @import line — the reviewer's
    // repro shape: before the fix, this 4-line selection's replacement text
    // ballooned with the imported module's three entities.
    const result = handleToggleFormat(typedMind, source, { uri, range: { start: 0, end: 3 } });
    assert.equal(result.error, undefined);
    // AuthFile only exists in the imported module — its absence proves the
    // range path stayed in single-document mode.
    assert.equal(result.newText.includes('AuthFile'), false);
  });

  it('a non-file:// URI (untitled buffer) falls back to single-document mode instead of throwing', async () => {
    const typedMind = await TypedMind.create();
    const path = join(scenariosDir, 'scenario-20-basic-import.tmd');
    const source = readFileSync(path, 'utf8');
    const result = handleToggleFormat(typedMind, source, { uri: 'untitled:Untitled-1' });
    assert.equal(result.error, undefined);
    // AuthFile only exists in the imported module (unlike AuthService, which
    // scenario-20 also references locally) — its absence proves imports
    // stayed unresolved rather than the conversion silently succeeding.
    assert.equal(result.newText.includes('AuthFile'), false);
  });
});
