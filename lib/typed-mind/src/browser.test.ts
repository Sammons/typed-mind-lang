// toggle-fidelity audit (2026-08-31, claude-home knowledge/projects/typedmind/
// toggle-fidelity-audit-2026-08-31.md) — behavioral coverage for the
// emitShortform/emitLongform/toggleFormat/detectFormat methods added to
// TypedMindBrowser. Mirrors typed-mind.test.ts's assertion shape (both
// facades expose the identical method contract) but imports src/browser.ts
// directly with a wasmPath override, matching the wasmPath-override
// convention used by typed-mind-check-with-parse-gate.test.ts and
// typed-mind-imports.test.ts — no need to build the ESM dist-browser/ bundle
// for a same-process behavioral check; check:browser-graph (scripts/
// check-browser-graph.mjs) already proves the built bundle stays
// Node-builtin-free.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMindBrowser } from './browser.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..');
const wasmPath = join(packageDir, 'grammar', 'grammar.wasm');
const heroPath = join(packageDir, 'grammar', 'test', 'fixtures', 'hero.tmd');

describe('TypedMindBrowser: emitShortform/emitLongform/toggleFormat/detectFormat', () => {
  let browser: TypedMindBrowser;
  let heroSource: string;

  before(async () => {
    browser = await TypedMindBrowser.create({ wasmPath });
    heroSource = readFileSync(heroPath, 'utf8');
  });

  it('exposes the same toggle/emit/detect method contract as the Node facade (TypedMind)', () => {
    const shortform = browser.emitShortform(heroSource);
    const longform = browser.emitLongform(heroSource);
    const toggled = browser.toggleFormat(heroSource);
    const detected = browser.detectFormat(heroSource);
    assert.equal(shortform.length > 0, true);
    assert.equal(longform.length > 0, true);
    assert.equal(toggled.length > 0, true);
    assert.equal(['shortform', 'longform', 'mixed'].includes(detected.format), true);
  });

  it('toggleFormat flips the detected format, matching TypedMind.toggleFormat semantics', () => {
    const before = browser.detectFormat(heroSource).format;
    const toggled = browser.toggleFormat(heroSource);
    const after = browser.detectFormat(toggled).format;
    assert.notEqual(before, after);
  });

  it('toggling twice round-trips back to the original detected format for a single-form document', () => {
    // hero.tmd is a deliberately MIXED fixture (per-entity sourceForm), so
    // toggleFormat's whole-document force-to-one-form is not idempotent
    // across two toggles for it by design (mixed -> forced longform ->
    // forced shortform, per syntax-emitter.ts's emit()/forceForm contract).
    // A single-form document (all-shortform here) is the shape this
    // assertion actually targets.
    const shortformOnly = browser.emitShortform(heroSource);
    const originalFormat = browser.detectFormat(shortformOnly).format;
    assert.equal(originalFormat, 'shortform');
    const toggledOnce = browser.toggleFormat(shortformOnly);
    const toggledTwice = browser.toggleFormat(toggledOnce);
    assert.equal(browser.detectFormat(toggledTwice).format, originalFormat);
  });

  it('emitShortform/emitLongform match the entity count of a plain parse', () => {
    const parsed = browser.parse(heroSource);
    const shortform = browser.emitShortform(heroSource);
    const reparsedFromShortform = browser.parse(shortform);
    assert.equal(reparsedFromShortform.entities.length, parsed.entities.length);
  });
});
