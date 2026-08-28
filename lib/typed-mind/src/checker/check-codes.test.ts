// RFC-TM-8 Diamond DAG Q4 check bindings (rfc-tm-8-diamond.md §9, Diamond DAG
// "Q4 — Freeze, tour, and closure"):
//   - stability-test red/green probe: mutate a code -> test goes red;
//     restore -> green.
//   - the rename-reconciliation fixture, both directions: a suppression
//     naming a code with a recorded rename validates through the record; the
//     same document with the rename record removed reports stale.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DtoNode } from '../ast/dto-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import { SuppressionNode } from '../ast/suppression-node.ts';
import { CHECK_CODES, RECORDED_RENAMES, resolveSuppressionCode } from './check-codes.ts';
import { extractCheckCodes } from './extract-check-codes.ts';

const checkerDir = dirname(fileURLToPath(import.meta.url));
const srcDir = dirname(checkerDir);

const zeroSpan = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };

// A real (empty-fields) DtoNode stands in for "some entity a suppression
// targets" — applySuppressions only ever reads `.span` off the resolved
// target (apply-suppressions.ts's matchesFor), so any concrete EntityNode
// subclass is a faithful fixture.
const fakeEntity = (name: string, span = zeroSpan): DtoNode => {
  return new DtoNode({ name, span, raw: name, sourceForm: 'shortform', fields: [] });
};

describe('X-SUPP-7: frozen checker-code registry', () => {
  it('the live emitted code set (static extraction over src/checker + src/pipeline) deep-equals the frozen CHECK_CODES baseline', () => {
    const extracted = extractCheckCodes([checkerDir, join(srcDir, 'pipeline')]);
    assert.deepEqual(extracted, [...CHECK_CODES].sort());
  });

  it('CHECK_CODES carries no duplicates (a set by construction, asserted)', () => {
    assert.equal(new Set(CHECK_CODES).size, CHECK_CODES.length);
  });

  it('the template-literal slot codes (checker/input-* / checker/output-*) are present — a literal-only grep would miss these', () => {
    for (const code of ['checker/input-dto-not-found', 'checker/input-not-dto', 'checker/output-dto-not-found', 'checker/output-not-dto']) {
      assert.equal((CHECK_CODES as readonly string[]).includes(code), true, `missing ${code}`);
    }
  });

  // Red/green probe (doc's check binding): mutate one emission site's code
  // string in a scratch copy of the checker+pipeline trees, run the SAME
  // extraction logic against the scratch copy, and observe the comparison
  // against the frozen baseline goes red; restore the text and observe
  // green. This automates "probe: rename one code without a record, observe
  // red, revert" rather than leaving it as a step a reviewer must trust.
  it('red/green probe: an unrecorded code-string rename fails the stability comparison; reverting it passes again', () => {
    const scratchRoot = mkdtempSync(join(tmpdir(), 'tm8-check-codes-probe-'));
    try {
      copyProductionTsInto(scratchRoot);
      const targetPath = join(scratchRoot, 'checker', 'check-dto-fields.ts');
      const originalText = readFileSync(targetPath, 'utf8');
      assert.equal(
        originalText.includes(`code: 'checker/dto-field-unknown-type'`),
        true,
        'fixture assumption: exact code string must be present',
      );

      // RED.
      const mutatedText = originalText.replace(`code: 'checker/dto-field-unknown-type'`, `code: 'checker/dto-field-unknown-type-RENAMED'`);
      assert.notEqual(mutatedText, originalText);
      writeFileSync(targetPath, mutatedText);
      const redExtracted = extractFrom(scratchRoot);
      assert.notDeepEqual(
        redExtracted,
        [...CHECK_CODES].sort(),
        'a code-string rename with no registry update must diverge from the frozen baseline',
      );
      assert.equal(redExtracted.includes('checker/dto-field-unknown-type'), false);
      assert.equal(redExtracted.includes('checker/dto-field-unknown-type-RENAMED'), true);

      // GREEN.
      writeFileSync(targetPath, originalText);
      const greenExtracted = extractFrom(scratchRoot);
      assert.deepEqual(greenExtracted, [...CHECK_CODES].sort(), 'reverting the rename must restore agreement with the frozen baseline');
    } finally {
      rmSync(scratchRoot, { recursive: true, force: true });
    }
  });
});

describe('X-SUPP-7: rename-aware stale matching', () => {
  it('resolveSuppressionCode is the identity for a code with no recorded rename (the common case, empty ladder at freeze time)', () => {
    assert.equal(resolveSuppressionCode('checker/orphaned-entity'), 'checker/orphaned-entity');
  });

  it('RECORDED_RENAMES is empty at freeze time — every CHECK_CODES entry predates this Quantum', () => {
    assert.equal(RECORDED_RENAMES.size, 0);
  });

  it('without a rename record: a suppression naming a code the live findings no longer produce is stale', async () => {
    const target = fakeEntity('Lonely');
    const byName = new Map<string, EntityNode>([['Lonely', target]]);
    const diagnostics = [{ code: 'checker/orphaned-entity-v2', severity: 'error' as const, span: zeroSpan, message: 'orphan' }];
    const suppression = new SuppressionNode({
      target: 'Lonely',
      code: 'checker/orphaned-entity', // the OLD spelling; no rename recorded for it in production RECORDED_RENAMES
      reason: 'reconciliation fixture (no record)',
      span: zeroSpan,
      raw: 'suppress Lonely checker/orphaned-entity "reconciliation fixture (no record)"',
    });

    // resolveSuppressionCode reads the frozen (empty) production ladder, so
    // this exercises the real apply-suppressions.ts import wiring directly.
    const { applySuppressions } = await import('./apply-suppressions.ts');
    const result = applySuppressions(diagnostics, [suppression], byName);
    assert.equal(result.suppressedCount, 0, 'the old spelling must not match the renamed code with no rename record');
    const stale = result.diagnostics.find((d) => d.code === 'checker/stale-suppression');
    assert.notEqual(stale, undefined, 'the suppression must report stale');
  });

  // Proves the RENAME-AWARE MECHANISM itself (apply-suppressions.ts calling
  // resolveSuppressionCode against check-codes.ts's RECORDED_RENAMES) using a
  // scratch copy of both modules with one rename entry added — the same
  // scratch-copy technique as the red/green probe above, applied to prove the
  // opposite direction: WITH a record present, matching succeeds.
  it('with a rename record: a suppression naming the OLD code spelling matches the renamed code (validates)', async () => {
    const scratchRoot = mkdtempSync(join(tmpdir(), 'tm8-rename-reconciliation-'));
    try {
      copyProductionTsInto(scratchRoot);
      const registryPath = join(scratchRoot, 'checker', 'check-codes.ts');
      const registryText = readFileSync(registryPath, 'utf8');
      const patchedRegistry = registryText.replace(
        'export const RECORDED_RENAMES: ReadonlyMap<string, CheckCode> = new Map([]);',
        "export const RECORDED_RENAMES: ReadonlyMap<string, CheckCode> = new Map([['checker/orphaned-entity', 'checker/orphaned-entity-v2' as CheckCode]]);",
      );
      assert.notEqual(patchedRegistry, registryText, 'fixture assumption: the RECORDED_RENAMES initializer text must match verbatim');
      writeFileSync(registryPath, patchedRegistry);
      // The renamed code must itself be a member of CHECK_CODES for the
      // CheckCode cast to be honest; append it so the scratch registry stays
      // internally consistent (mirrors what a real rename PR would do: add
      // the new code to CHECK_CODES in the same diff as the rename entry).
      const withNewCode = readFileSync(registryPath, 'utf8').replace(
        "'checker/orphaned-entity',",
        "'checker/orphaned-entity',\n  'checker/orphaned-entity-v2',",
      );
      writeFileSync(registryPath, withNewCode);

      const { applySuppressions } = await importFromScratch<typeof import('./apply-suppressions.ts')>(
        scratchRoot,
        'checker/apply-suppressions.ts',
      );

      const target = fakeEntity('Lonely');
      const byName = new Map<string, EntityNode>([['Lonely', target]]);
      const diagnostics = [{ code: 'checker/orphaned-entity-v2', severity: 'error' as const, span: zeroSpan, message: 'orphan' }];
      const suppression = new SuppressionNode({
        target: 'Lonely',
        code: 'checker/orphaned-entity', // OLD spelling, matches via the scratch rename record
        reason: 'reconciliation fixture (with record)',
        span: zeroSpan,
        raw: 'suppress Lonely checker/orphaned-entity "reconciliation fixture (with record)"',
      });

      const result = applySuppressions(diagnostics, [suppression], byName);
      assert.equal(result.suppressedCount, 1, 'the suppression must match the renamed code through the rename record');
      const matched = result.diagnostics.find((d) => d.code === 'checker/orphaned-entity-v2');
      assert.notEqual(matched?.suppression, undefined);
      assert.equal(matched?.suppression?.reason, 'reconciliation fixture (with record)');
    } finally {
      rmSync(scratchRoot, { recursive: true, force: true });
    }
  });
});

// --- scratch-copy helpers, shared by both the red/green probe and the
// rename-reconciliation fixture ---

function copyProductionTsInto(scratchRoot: string): void {
  for (const sub of ['checker', 'pipeline']) {
    const sourceDir = join(srcDir, sub);
    const destDir = join(scratchRoot, sub);
    mkdirSync(destDir, { recursive: true });
    for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        writeFileSync(join(destDir, entry.name), readFileSync(join(sourceDir, entry.name), 'utf8'));
      }
    }
  }
  // apply-suppressions.ts and check-codes.ts both import sibling ast/*
  // modules by relative path (`../ast/...`) — mirror that directory too so a
  // dynamic import of the scratch copy resolves cleanly.
  const astDest = join(scratchRoot, 'ast');
  mkdirSync(astDest, { recursive: true });
  const astSource = join(srcDir, 'ast');
  for (const entry of readdirSync(astSource, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      writeFileSync(join(astDest, entry.name), readFileSync(join(astSource, entry.name), 'utf8'));
    }
  }
}

// Runs the REAL extractCheckCodes against the scratch tree — reusing the
// production scan logic (rather than a second hand-rolled copy of the same
// regexes, which would drift from the real extractor over time) with the
// scratch root's checker/pipeline dirs as the caller-supplied directories.
function extractFrom(scratchRoot: string): string[] {
  return extractCheckCodes([join(scratchRoot, 'checker'), join(scratchRoot, 'pipeline')]);
}

// Dynamically imports a module from the scratch tree by absolute file URL —
// used only by the rename-reconciliation fixture, which needs the SCRATCH
// copy of apply-suppressions.ts (importing check-codes.ts's PATCHED
// RECORDED_RENAMES), not the production module (whose ladder is frozen empty).
async function importFromScratch<T>(scratchRoot: string, relativePath: string): Promise<T> {
  const url = new URL(`file://${join(scratchRoot, relativePath)}`);
  return (await import(url.href)) as T;
}
