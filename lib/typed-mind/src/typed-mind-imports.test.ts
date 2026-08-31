// Defect fix (this Quantum) — RFC-TM-4 §3 (rfc-tm-4-diamond.md) promised
// `parse(source, filePath?)` / `check(source, filePath?)` resolve cross-file
// `@import` statements when `filePath` is supplied; the shipped Q3 code did
// `void filePath` and never invoked the S-PARSE-5 ImportResolver
// (rfc-tm-3-diamond.md §3.7). PR #34's review proved the user-visible gap:
// scenario-21-aliased-import rendered 11 entities under legacy vs 3 under the
// new surface (import entities silently dropped) with generic "not found"
// errors replacing legacy's cross-file diagnostics.
//
// These fixtures assert entity/diagnostic counts on the FIXED facade against
// hand-verified legacy baselines (via DSLChecker.parse/check, computed
// directly against the corpus files this test reads) and against the A-table
// amendments rfc-tm-4-diamond.md §4 authorizes:
//   - A11 (declared-containedBy-only validation): legacy's 3 "references
//     unknown parent" errors on scenario-21 (spurious — they cross the alias
//     prefix boundary against the parser's merged/derived containedBy field)
//     vanish on the new surface with no replacement diagnostic.
//   - A6 (originated duplicate-name coverage, folding in the index.ts:118
//     "conflicts with imported entity" facade error): the circular
//     self-import pair reports via `checker/duplicate-name` instead of
//     legacy's 3 "conflicts with imported entity" errors.
// No filePath = single-document mode: imports are left unresolved and the
// entity count matches the LOCAL document only (unchanged pre-fix behavior),
// asserted here so the "no filePath" branch stays covered.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from './typed-mind.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..');
const repoRoot = join(packageDir, '..', '..');
const wasmPath = join(packageDir, 'grammar', 'grammar.wasm');
const scenariosDir = join(repoRoot, 'lib', 'typed-mind-test-suite', 'scenarios');

describe('TypedMind facade — cross-file @import resolution (filePath wiring)', () => {
  let typedMind: TypedMind;

  before(async () => {
    typedMind = await TypedMind.create({ wasmPath });
  });

  it('scenario-21 (aliased import): filePath resolves imports into 11 merged entities, matching legacy', () => {
    const path = join(scenariosDir, 'scenario-21-aliased-import.tmd');
    const source = readFileSync(path, 'utf8');
    const parsed = typedMind.parse(source, path);
    assert.deepEqual(
      {
        entityCount: parsed.entities.length,
        names: parsed.entities.map((entity) => entity.name).sort(),
        parseDiagnostics: parsed.diagnostics,
        linksIsPresent: typeof parsed.links.referencedBy === 'function',
      },
      {
        // Legacy (DSLChecker.parse(source, path)) resolves to 11 entities —
        // the local WebApp/AppFile/initializeApp trio plus the 4-entity
        // aliased UI.* import and the 4-entity aliased DB.* import.
        entityCount: 11,
        names: [
          'AppFile',
          'DB.Connection',
          'DB.DatabaseFile',
          'DB.query',
          'UI.Button',
          'UI.ComponentsFile',
          'UI.Form',
          'UI.Input',
          'UI.Modal',
          'WebApp',
          'initializeApp',
        ],
        parseDiagnostics: [],
        linksIsPresent: true,
      },
    );
  });

  it('scenario-21: check() drops legacy A11 spurious "references unknown parent" errors, no replacement diagnostic', () => {
    const path = join(scenariosDir, 'scenario-21-aliased-import.tmd');
    const source = readFileSync(path, 'utf8');
    const checked = typedMind.check(source, path);
    const referencesUnknownParent = checked.diagnostics.filter((diagnostic) => / references unknown parent /.test(diagnostic.message));
    assert.deepEqual(
      {
        valid: checked.valid,
        referencesUnknownParentCount: referencesUnknownParent.length,
      },
      // A11 (rfc-tm-4-diamond.md §4): legacy's containedBy check ran against
      // the parser's merged/derived field, which crosses alias-prefixed
      // imports unprefixed and dangles into 3 spurious errors on this
      // scenario; the declared-only port drops them with no replacement.
      { valid: false, referencesUnknownParentCount: 0 },
    );
  });

  it('scenario-21: parseWithCst also resolves imports and shares the same cst as a bare parseWithCst(source)', () => {
    const path = join(scenariosDir, 'scenario-21-aliased-import.tmd');
    const source = readFileSync(path, 'utf8');
    const withPath = typedMind.parseWithCst(source, path);
    const withoutPath = typedMind.parseWithCst(source);
    assert.deepEqual(
      {
        withPathEntityCount: withPath.entities.length,
        withoutPathEntityCount: withoutPath.entities.length,
        cstSpanMatches: withPath.cst.span().end.line === withoutPath.cst.span().end.line,
      },
      { withPathEntityCount: 11, withoutPathEntityCount: 3, cstSpanMatches: true },
    );
  });

  it('no filePath: imports stay unresolved (single-document mode, pre-fix behavior preserved)', () => {
    const path = join(scenariosDir, 'scenario-21-aliased-import.tmd');
    const source = readFileSync(path, 'utf8');
    const parsed = typedMind.parse(source);
    assert.deepEqual(
      {
        entityCount: parsed.entities.length,
        names: parsed.entities.map((entity) => entity.name).sort(),
      },
      { entityCount: 3, names: ['AppFile', 'WebApp', 'initializeApp'] },
    );
  });

  it('circular imports: filePath produces imports/circular diagnostics, not a crash, and both modules still resolve', () => {
    const path = join(scenariosDir, 'imports', 'circular', 'module-a.tmd');
    const source = readFileSync(path, 'utf8');
    const parsed = typedMind.parse(source, path);
    const circularDiagnostics = parsed.diagnostics.filter((diagnostic) => diagnostic.code === 'imports/circular');
    assert.deepEqual(
      {
        circularDiagnosticCount: circularDiagnostics.length,
        // Both module-a's own entities AND module-b's resolved entities are
        // present (duplicate-preserving append, not a crash/short-circuit).
        names: parsed.entities.map((entity) => entity.name).sort(),
      },
      {
        circularDiagnosticCount: 1,
        names: ['FileA', 'FileA', 'FileB', 'ServiceA', 'ServiceA', 'ServiceB', 'methodA', 'methodA', 'methodB'],
      },
    );
  });

  it('circular imports: check() reports the cycle plus originated duplicate-name findings (A6), not a crash', () => {
    const path = join(scenariosDir, 'imports', 'circular', 'module-a.tmd');
    const source = readFileSync(path, 'utf8');
    const checked = typedMind.check(source, path);
    assert.deepEqual(
      {
        valid: checked.valid,
        hasCircularDiagnostic: checked.diagnostics.some((diagnostic) => diagnostic.code === 'imports/circular'),
        duplicateNameCount: checked.diagnostics.filter((diagnostic) => diagnostic.code === 'checker/duplicate-name').length,
        // A6 (rfc-tm-4-diamond.md §4, folding in index.ts:118's facade
        // error): the originated duplicate-name check reports both spans per
        // colliding name (FileA, ServiceA, methodA), replacing legacy's 3
        // "conflicts with imported entity" facade errors.
      },
      { valid: false, hasCircularDiagnostic: true, duplicateNameCount: 6 },
    );
  });

  it('nested imports: filePath resolves transitively with the outer prefix applied, matching legacy', () => {
    const path = join(scenariosDir, 'scenario-22-nested-import.tmd');
    const source = readFileSync(path, 'utf8');
    const parsed = typedMind.parse(source, path);
    assert.deepEqual(
      {
        entityCount: parsed.entities.length,
        names: parsed.entities.map((entity) => entity.name).sort(),
      },
      {
        // Legacy (DSLChecker.parse(source, path)): the local App/MainEntry/main
        // trio plus service-layer.tmd's own entities plus its nested
        // database.tmd entities, all unprefixed (no alias on either hop).
        entityCount: 10,
        names: ['App', 'Connection', 'DatabaseFile', 'MainEntry', 'ServiceFile', 'User', 'UserService', 'createUser', 'main', 'query'],
      },
    );
  });

  it('missing import file: filePath produces imports/read-failure, not a crash', () => {
    const path = join(scenariosDir, 'scenario-24-import-not-found.tmd');
    const source = readFileSync(path, 'utf8');
    const parsed = typedMind.parse(source, path);
    const readFailures = parsed.diagnostics.filter((diagnostic) => diagnostic.code === 'imports/read-failure');
    assert.deepEqual(
      { readFailureCount: readFailures.length, carriesFsError: readFailures.at(0)?.message.includes('ENOENT') },
      { readFailureCount: 1, carriesFsError: true },
    );
  });
});

// Same-day follow-up fix to PR #122 (independent post-merge review finding,
// PR #122 comment #20110): emitShortform/emitLongform/toggleFormat called
// this.#parser.parse(source) directly — no filePath, no resolveImportsInto —
// unlike parse()/check()/parseWithCst() above, which all got the filePath
// fix in this same file's original Quantum. Any @import-bearing document
// silently lost its imported entities when emitted or toggled through the
// facade. Reachable in production via the LSP's real "toggle document
// format" command (toggle-format.ts's handleToggleFormat), which had
// params.uri available but never threaded it through until this fix.
describe('TypedMind facade — emitShortform/emitLongform/toggleFormat import resolution (filePath wiring)', () => {
  let typedMind: TypedMind;

  before(async () => {
    typedMind = await TypedMind.create({ wasmPath });
  });

  it('scenario-20 (basic import): emitShortform with filePath includes the imported entities', () => {
    const path = join(scenariosDir, 'scenario-20-basic-import.tmd');
    const source = readFileSync(path, 'utf8');
    const withPath = typedMind.emitShortform(source, path);
    const withoutPath = typedMind.emitShortform(source);
    assert.deepEqual(
      {
        withPathHasImportedEntity: withPath.includes('AuthFile'),
        withoutPathHasImportedEntity: withoutPath.includes('AuthFile'),
      },
      // No filePath = single-document mode (pre-existing, unchanged
      // behavior): imports stay unresolved, matching parse()'s own
      // no-filePath contract asserted above.
      { withPathHasImportedEntity: true, withoutPathHasImportedEntity: false },
    );
  });

  it('scenario-20 (basic import): emitLongform with filePath includes the imported entities', () => {
    const path = join(scenariosDir, 'scenario-20-basic-import.tmd');
    const source = readFileSync(path, 'utf8');
    const withPath = typedMind.emitLongform(source, path);
    const withoutPath = typedMind.emitLongform(source);
    assert.deepEqual(
      {
        withPathHasImportedEntity: withPath.includes('AuthFile'),
        withoutPathHasImportedEntity: withoutPath.includes('AuthFile'),
      },
      { withPathHasImportedEntity: true, withoutPathHasImportedEntity: false },
    );
  });

  it('scenario-20 (basic import): toggleFormat with filePath includes the imported entities', () => {
    const path = join(scenariosDir, 'scenario-20-basic-import.tmd');
    const source = readFileSync(path, 'utf8');
    const withPath = typedMind.toggleFormat(source, path);
    const withoutPath = typedMind.toggleFormat(source);
    assert.deepEqual(
      {
        withPathHasImportedEntity: withPath.includes('AuthFile'),
        withoutPathHasImportedEntity: withoutPath.includes('AuthFile'),
      },
      { withPathHasImportedEntity: true, withoutPathHasImportedEntity: false },
    );
  });

  it('scenario-20 (basic import): toggleFormat with filePath still targets the format detected from the ORIGINAL source', () => {
    const path = join(scenariosDir, 'scenario-20-basic-import.tmd');
    const source = readFileSync(path, 'utf8');
    const { format: originalFormat } = typedMind.detectFormat(source);
    const toggled = typedMind.toggleFormat(source, path);
    const { format: toggledFormat } = typedMind.detectFormat(toggled);
    // detectFormat reads the on-disk syntax, not the resolved/merged entity
    // set — toggling must still flip shortform<->longform based on what the
    // ORIGINAL document actually looked like, import resolution aside.
    assert.notEqual(toggledFormat, originalFormat);
  });
});
