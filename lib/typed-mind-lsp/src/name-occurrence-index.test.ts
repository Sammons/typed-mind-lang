// RFC-TM-5 §1 (rfc-tm-5-diamond.md) check binding — "a fixture with dotted,
// scoped (@types/node-shaped), and hyphenated names asserts references and
// semantic tokens land on grammar-true boundaries." entity_name (declarations)
// is [A-Za-z_]\w* (grammar.js:770); list_entry (references) is
// [@\w][\w\-/.]* (grammar.js:730) — strictly wider. This fixture exercises a
// hyphenated (left-pad), dotted (api.client), and scoped (@types/node)
// reference name, none of which could be declared but all of which are legal
// list_entry occurrences.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TypedMind } from '@sammons/typed-mind';
import { NameOccurrenceIndex } from './name-occurrence-index.ts';

const BOUNDARY_FIXTURE = `UserService @ src/services/user.ts:
  <- [Logger, left-pad, api.client, @types/node]
  -> [Logger]

Logger @ src/logger.ts:
  -> [Logger]
`;

describe('NameOccurrenceIndex (RFC-TM-5 §1 leaf c)', () => {
  it('collects hyphenated, dotted, and scoped reference occurrences with grammar-true boundaries', async () => {
    const typedMind = await TypedMind.create();
    const parsed = typedMind.parseWithCst(BOUNDARY_FIXTURE);
    const index = new NameOccurrenceIndex(parsed.cst);

    const hyphenated = index.occurrencesOf('left-pad');
    assert.equal(hyphenated.length, 1);
    assert.equal(hyphenated[0]?.isDeclaration, false);

    const dotted = index.occurrencesOf('api.client');
    assert.equal(dotted.length, 1);
    assert.equal(dotted[0]?.isDeclaration, false);

    const scoped = index.occurrencesOf('@types/node');
    assert.equal(scoped.length, 1);
    assert.equal(scoped[0]?.isDeclaration, false);

    // Each occurrence's span covers exactly its own name text — no leakage
    // into the surrounding `, `/`]` delimiters (the grammar-true boundary the
    // deleted isWordBoundary/isEntityNameChar hand-rolled character classes
    // used to get wrong for exactly these shapes).
    for (const occurrence of [...hyphenated, ...dotted, ...scoped]) {
      assert.equal(occurrence.endColumn - occurrence.startColumn, occurrence.name.length);
    }
  });

  it('distinguishes declaration occurrences (entity_name) from reference occurrences (list_entry)', async () => {
    const typedMind = await TypedMind.create();
    const parsed = typedMind.parseWithCst(BOUNDARY_FIXTURE);
    const index = new NameOccurrenceIndex(parsed.cst);

    const loggerOccurrences = index.occurrencesOf('Logger');
    // Logger declares itself once and is referenced three times (UserService's
    // import list and export list, plus its own export list).
    assert.equal(loggerOccurrences.filter((occurrence) => occurrence.isDeclaration).length, 1);
    assert.equal(loggerOccurrences.filter((occurrence) => !occurrence.isDeclaration).length, loggerOccurrences.length - 1);
    assert.equal(loggerOccurrences.length > 1, true);
  });

  it('occurrenceAt resolves a position to its covering occurrence, or none between tokens', async () => {
    const typedMind = await TypedMind.create();
    const parsed = typedMind.parseWithCst(BOUNDARY_FIXTURE);
    const index = new NameOccurrenceIndex(parsed.cst);

    const declaration = index.occurrencesOf('UserService').at(0);
    assert.notEqual(declaration, undefined);
    if (declaration === undefined) {
      throw new Error('unreachable: asserted above');
    }
    const insideMiddle = index.occurrenceAt(declaration.startLine, declaration.startColumn + 1);
    assert.equal(insideMiddle?.name, 'UserService');

    const beforeStart = index.occurrenceAt(declaration.startLine, declaration.startColumn - 1);
    assert.equal(beforeStart, undefined);
  });
});
