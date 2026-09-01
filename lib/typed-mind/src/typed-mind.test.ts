// RFC-TM-4 §3 Diamond DAG Q3 check binding (rfc-tm-4-diamond.md) — "new-surface
// smoke on built dist": builds the package, then imports the compiled ESM
// output in a child process and runs parse+check+emit*+toggleFormat+
// detectFormat on the hero fixture with no wasm override, matching the
// dist-layout-smoke.test.ts precedent for TypedMindParser (RFC-TM-3 Q1).

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..');
const repoRoot = join(packageDir, '..', '..');
const heroPath = join(packageDir, 'grammar', 'test', 'fixtures', 'hero.tmd');
const distEntryPath = join(packageDir, 'dist', 'typed-mind.js');

const childScript = `
import { readFileSync } from 'node:fs';
const { TypedMind } = await import(process.argv[1]);
const typedMind = await TypedMind.create();
const source = readFileSync(process.argv[2], 'utf8');
const parsed = typedMind.parse(source);
const withCst = typedMind.parseWithCst(source);
const checked = typedMind.check(source);
const shortform = typedMind.emitShortform(source);
const longform = typedMind.emitLongform(source);
const toggled = typedMind.toggleFormat(source);
const detected = typedMind.detectFormat(source);
console.log(
  JSON.stringify({
    entityCount: parsed.entities.length,
    linksIsPresent: typeof parsed.links.referencedBy === 'function',
    withCstEntityCountMatches: withCst.entities.length === parsed.entities.length,
    withCstLinksIsPresent: typeof withCst.links.referencedBy === 'function',
    withCstHasSpanningCst: typeof withCst.cst.span === 'function' && withCst.cst.span().start.line === 1,
    checkedValid: checked.valid,
    diagnosticCount: checked.diagnostics.length,
    shortformNonEmpty: shortform.length > 0,
    longformNonEmpty: longform.length > 0,
    toggledNonEmpty: toggled.length > 0,
    detectedFormat: detected.format,
  }),
);
`;

describe('TypedMind.create() (built dist layout, new surface smoke)', () => {
  it('parses, checks, and emits the hero fixture from the compiled ESM output', () => {
    // Ensure dist/ reflects the current sources; tsc --build is incremental.
    execFileSync(join(repoRoot, 'node_modules', '.bin', 'tsc'), ['--build'], { cwd: packageDir, encoding: 'utf8' });
    const stdout = execFileSync(process.execPath, ['--input-type=module', '-e', childScript, distEntryPath, heroPath], { encoding: 'utf8' });
    const result = JSON.parse(stdout);
    assert.equal(result.linksIsPresent, true);
    assert.equal(typeof result.entityCount, 'number');
    assert.equal(result.entityCount > 0, true);
    assert.equal(typeof result.checkedValid, 'boolean');
    assert.equal(result.shortformNonEmpty, true);
    assert.equal(result.longformNonEmpty, true);
    assert.equal(result.toggledNonEmpty, true);
    assert.equal(['shortform', 'longform', 'mixed'].includes(result.detectedFormat), true);
    assert.equal(result.withCstEntityCountMatches, true);
    assert.equal(result.withCstLinksIsPresent, true);
    assert.equal(result.withCstHasSpanningCst, true);
  });
});
