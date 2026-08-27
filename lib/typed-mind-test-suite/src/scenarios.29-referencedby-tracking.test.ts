// RFC-TM-4 §5 (rfc-tm-4-diamond.md) Q5 — migrated onto the new surface.
// Adjudicated disposition (operator, post-Q5): the accepted design
// (rfc-tm-3-diamond.md §3.5, S-AST-4) shapes `LinkIndex.referencedBy(name)`
// as `readonly { from: string; fromType: EntityKind }[]` — the referencing
// entity's KIND, not the relationship VERB ('imports'/'exports'/'calls'/etc.)
// the legacy `ProgramGraph` reverse-reference shape carried. The verb
// dimension is not language surface (TM-5's LSP hover already accepted the
// same regrouping, server.ts:309-316) and is retired with the legacy engine
// — it is NOT reintroduced here. This test preserves the original's INTENT
// (reverse references are tracked for every entity kind) by asserting
// `referencedBy` contents as `{from, fromType}` pairs, computed against the
// same fixture (scenario-29-referencedby-tracking.tmd) the legacy test used.
//
// Assertion movement from the legacy version (per-target):
//   - Where the legacy test asserted a single verb per target (imports,
//     exports, entry, contains/containedBy, containsProgram, consumes), the
//     verb is dropped and the {from, fromType} pair is asserted instead —
//     the reverse-reference existence and the referencing entity's kind are
//     exactly what LinkIndex still proves.
//   - `Database`'s legacy referencedBy counted 3 sources under distinct verbs
//     (UserService imports, createUser calls, getUser calls). The new index
//     dedupes per `from` name (link-index.ts `addReference`), so this stays
//     a 3-entry list ({UserService,File}, {createUser,Function},
//     {getUser,Function}) — no verb collapse happens here because each
//     `from` is distinct.
//   - `createUser`'s legacy referencedBy was asserted only for UserService's
//     export verb (length untested beyond that one entry). The new index
//     also derives a second entry from `startApp`'s `~> [createUser]` call
//     (legacy tracked this too, just not asserted) — both entries are
//     asserted here since the new surface makes both visible without extra
//     work.
//   - No assertion is dropped for lack of a `fromType`-grouped equivalent —
//     every legacy per-target assertion in this fixture keys off a single
//     `from` name, so `{from, fromType}` fully replaces `{from, type}` for
//     every case. (Contrast with the file's pre-migration STOP-AND-REPORT
//     note: the gap that blocked migration was the general case of two
//     DIFFERENT verbs from the SAME `from` name needing separate rows — this
//     fixture never exercises that case, so no assertion had to be dropped.)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-29-referencedby-tracking', () => {
  const scenarioFile = 'scenario-29-referencedby-tracking.tmd';

  it('should track ReferencedBy relationships', async () => {
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');

    const typedMind = await TypedMind.create();
    const { valid, diagnostics } = typedMind.check(content);

    if (!valid) {
      console.log(
        'Validation diagnostics:',
        diagnostics.map((d) => d.message),
      );
    }

    // Checking fails due to orphaned entities, but referencedBy tracking
    // still works — same overall verdict as the legacy assertion (7 errors).
    assert.equal(valid, false);
    assert.equal(diagnostics.filter((d) => d.severity === 'error').length, 7);

    const { entities, links } = typedMind.parse(content);
    assert.equal(entities.length > 0, true);

    // File references
    assert.deepEqual(links.referencedBy('UserService'), [{ from: 'MainFile', fromType: 'File' }]);

    // Function references
    assert.deepEqual(links.referencedBy('createUser'), [
      { from: 'UserService', fromType: 'File' },
      { from: 'startApp', fromType: 'Function' },
    ]);

    // DTO references
    assert.deepEqual(links.referencedBy('UserDTO'), [
      { from: 'MainFile', fromType: 'File' },
      { from: 'createUser', fromType: 'Function' },
    ]);

    assert.deepEqual(links.referencedBy('User'), [
      { from: 'createUser', fromType: 'Function' },
      { from: 'getUser', fromType: 'Function' },
    ]);

    // Class references
    assert.deepEqual(links.referencedBy('Database'), [
      { from: 'UserService', fromType: 'File' },
      { from: 'createUser', fromType: 'Function' },
      { from: 'getUser', fromType: 'Function' },
    ]);

    // Constants references
    assert.deepEqual(links.referencedBy('DatabaseConfig'), [{ from: 'MainFile', fromType: 'File' }]);

    // Program entry references
    assert.deepEqual(links.referencedBy('MainFile'), [{ from: 'TestApp', fromType: 'Program' }]);

    // UIComponent references
    assert.deepEqual(links.referencedBy('UserList'), [{ from: 'AppUI', fromType: 'UIComponent' }]);

    assert.deepEqual(links.referencedBy('AppUI'), [{ from: 'MainFile', fromType: 'File' }]);
    assert.deepEqual(links.referencedBy('UserForm'), [{ from: 'AppUI', fromType: 'UIComponent' }]);

    // RunParameter references
    assert.deepEqual(links.referencedBy('DATABASE_URL'), [{ from: 'handler', fromType: 'Function' }]);

    // Asset program references
    assert.deepEqual(links.referencedBy('ClientProgram'), [{ from: 'HTMLAsset', fromType: 'Asset' }]);

    // Verify all expected entities exist
    const names = new Set(entities.map((entity) => entity.name));
    for (const name of [
      'UserService',
      'createUser',
      'UserDTO',
      'User',
      'Database',
      'DatabaseConfig',
      'MainFile',
      'UserList',
      'AppUI',
      'DATABASE_URL',
      'ClientProgram',
    ]) {
      assert.equal(names.has(name), true, `expected entity '${name}' to exist`);
    }

    // Reference counts for key entities (post-migration shape: one entry per
    // distinct referencing name, verb collapsed — see file header)
    assert.equal(links.referencedBy('UserService').length, 1);
    assert.equal(links.referencedBy('UserDTO').length, 2);
    assert.equal(links.referencedBy('Database').length, 3);
    assert.equal(links.referencedBy('UserList').length, 1);
    assert.equal(links.referencedBy('DATABASE_URL').length, 1);
    assert.equal(links.referencedBy('ClientProgram').length, 1);
  });
});
