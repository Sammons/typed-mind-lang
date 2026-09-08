import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ASSERTION_CODES, type AssertionCode } from './assertion-codes.ts';

const srcDir = dirname(fileURLToPath(import.meta.url));
const engineSource = readFileSync(join(srcDir, 'assertion-engine.ts'), 'utf8');

describe('RFC-TM-16: frozen assertion-code registry', () => {
  it('ASSERTION_CODES carries no duplicate keys (a const object by construction, asserted)', () => {
    const keys = Object.keys(ASSERTION_CODES);
    assert.equal(new Set(keys).size, keys.length);
  });

  it('every code has a non-empty docBody', () => {
    for (const [code, entry] of Object.entries(ASSERTION_CODES)) {
      assert.ok(entry.docBody.length > 0, `${code}: docBody is empty`);
    }
  });

  it('every code has a non-empty suggestion', () => {
    for (const [code, entry] of Object.entries(ASSERTION_CODES)) {
      assert.ok(entry.suggestion.length > 0, `${code}: suggestion is empty`);
    }
  });

  it('every code has a non-empty message', () => {
    for (const [code, entry] of Object.entries(ASSERTION_CODES)) {
      assert.ok(entry.message.length > 0, `${code}: message is empty`);
    }
  });

  it('every code has severity "error" or "warning"', () => {
    for (const [code, entry] of Object.entries(ASSERTION_CODES)) {
      assert.ok(
        entry.severity === 'error' || entry.severity === 'warning',
        `${code}: severity "${entry.severity}" is not "error" or "warning"`,
      );
    }
  });

  it('every deviation emission site in assertion-engine.ts references a registered code', () => {
    const registeredCodes = new Set(Object.keys(ASSERTION_CODES));
    const codeStringPattern = /'(assertion\/[a-z-]+)'/g;
    const referencedCodes: string[] = [];
    const unregistered: string[] = [];

    let match: RegExpExecArray | null;
    while ((match = codeStringPattern.exec(engineSource)) !== null) {
      referencedCodes.push(match[1]);
      if (!registeredCodes.has(match[1])) {
        unregistered.push(match[1]);
      }
    }

    assert.ok(referencedCodes.length > 0, 'no assertion/ code strings found — check the regex');
    assert.deepEqual(
      unregistered,
      [],
      `unregistered codes found in assertion-engine.ts: ${unregistered.join(', ')}`,
    );

    const usedCodes = new Set(referencedCodes);
    const unusedCodes = [...registeredCodes].filter((c) => !usedCodes.has(c));
    assert.deepEqual(
      unusedCodes,
      [],
      `registered codes not referenced in assertion-engine.ts: ${unusedCodes.join(', ')}`,
    );
  });

  it('the registry has exactly 23 codes', () => {
    assert.equal(Object.keys(ASSERTION_CODES).length, 23);
  });

  it('all codes use the assertion/ namespace prefix', () => {
    for (const code of Object.keys(ASSERTION_CODES) as AssertionCode[]) {
      assert.ok(code.startsWith('assertion/'), `${code}: does not start with "assertion/"`);
    }
  });
});
