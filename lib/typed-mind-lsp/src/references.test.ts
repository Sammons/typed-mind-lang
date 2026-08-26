// RFC-TM-5 §1 leaf c check binding (references half) — provideReferences
// returns the occurrence spans for the target name (the substring line-scan,
// legacy server.ts:507-530, is deleted). Grammar-true boundaries: a reference
// to "Logger" must not also match inside "LoggerFactory".

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TypedMind } from '@sammons/typed-mind';
import { NameOccurrenceIndex } from './name-occurrence-index.ts';
import { provideReferencesForName } from './references.ts';

const SOURCE = `AppEntry @ src/index.ts:
  <- [Logger, LoggerFactory]

Logger @ src/logger.ts:
  -> [Logger]

LoggerFactory @ src/logger-factory.ts:
  -> [LoggerFactory]
`;

describe('provideReferences (RFC-TM-5 §1 leaf c)', () => {
  it('returns exactly the occurrences of the exact name, not substring matches inside a longer name', async () => {
    const typedMind = await TypedMind.create();
    const parsed = typedMind.parseWithCst(SOURCE);
    const nameIndex = new NameOccurrenceIndex(parsed.cst);

    const loggerLocations = provideReferencesForName('file:///test.tmd', 'Logger', nameIndex);
    // Logger: declares itself (1), AppEntry's import list (1), its own export
    // list (1) = 3. LoggerFactory's occurrences must NOT be included even
    // though "Logger" is a substring of "LoggerFactory".
    assert.equal(loggerLocations.length, 3);

    const factoryLocations = provideReferencesForName('file:///test.tmd', 'LoggerFactory', nameIndex);
    assert.equal(factoryLocations.length, 3);
  });

  it('every returned location carries a 0-based range matching the occurrence span exactly', async () => {
    const typedMind = await TypedMind.create();
    const parsed = typedMind.parseWithCst(SOURCE);
    const nameIndex = new NameOccurrenceIndex(parsed.cst);
    const occurrence = nameIndex.occurrencesOf('Logger').at(0);
    assert.notEqual(occurrence, undefined);
    const [location] = provideReferencesForName('file:///test.tmd', 'Logger', nameIndex);
    assert.equal(location?.uri, 'file:///test.tmd');
    assert.equal(location?.range.start.line, (occurrence?.startLine ?? 0) - 1);
    assert.equal(location?.range.start.character, (occurrence?.startColumn ?? 0) - 1);
  });
});
