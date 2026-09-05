#!/usr/bin/env node
// RFC-TM-6 §4 (rfc-tm-6-diamond.md) — the executable golden-diff gate for
// this package's converter goldens. Diffs goldens/legacy-baseline/ (pinned
// permanently after Q1) against goldens/live/ (written by the flipped
// converter, per Q3) and classifies every differing line into a named cause
// class with an exact-count census. Unclassified deltas or count drift exit
// 1. The classifier compares two checked-in file sets; it never runs the
// legacy engine, so it survives TM-4 Q5's legacy-engine deletion unchanged.
//
// This is a package-local twin of lib/typed-mind-renderer/scripts/
// check-golden-deltas.mjs (RFC-TM-6 §4's classifier for the renderer's own
// goldens tree, owned by TM-6 Q2). The two scripts share a name and a
// contract shape by design — the RFC names one classifier concept — but
// operate on disjoint goldens trees in disjoint packages. Deviation note
// (RFC-TM-6 Q3 implementation): rather than extend the renderer's script
// (shared with Q2, which runs in parallel and had not started work at the
// time this was written), this package owns its own copy scoped to
// `lib/typed-mind-typescript/goldens/`, avoiding a cross-worktree race on a
// shared file. If a future pass wants one shared classifier module for both
// packages, that consolidation is a follow-up, not a Q3 scope item.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BASELINE_DIR = join(PACKAGE_ROOT, 'goldens', 'legacy-baseline');
const LIVE_DIR = join(PACKAGE_ROOT, 'goldens', 'live');

// Named cause classes, each with a frozen exact count over the Q1 fixture
// set (3 files: preferClassFile-true.tmd, preferClassFile-false.tmd,
// generatePrograms-false.tmd), all exhaustively derived from RFC-TM-6 §3's
// Solution: the shared SyntaxEmitter (a) has no comment-synthesis surface
// (drops the legacy private emitter's `# Section` header lines), (b) joins
// every entity block with one uniform blank line regardless of whether the
// legacy emitter packed same-kind entities with no gap, and (c) `.trim()`s
// its final output (drops the legacy emitter's trailing newline). No other
// content differs between the pre-flip and post-flip converter output for
// this fixture set — entity text, ordering, and field values are otherwise
// byte-identical.
//
// RFC-TM-9 Q2 (X-CONV-4) adds one more cause class on top of the frozen Q1/
// Q3 set above: `deriveProgramName` now emits `<Base>__App` instead of the
// legacy `endsWith('App') ? base : base + 'App'` scheme (collision-proof
// against `sanitizeEntityName`'s real codomain — see that function's own
// doc comment in typescript-to-typedmind-converter.ts). This is a real,
// intentional, later-RFC content change to `goldens/live/`'s converter
// output — not a Q1/Q3 emitter-structure artifact — so it gets its own
// named class rather than being folded into (or silently passed through)
// the three above. Exact count over the same 3-golden fixture set: the
// `<Name>App -> ...` Program-declaration line appears once in each of
// preferClassFile-true.tmd and preferClassFile-false.tmd (both have a
// generated Program); generatePrograms-false.tmd has none.
//
// RC-C (sammons/typed-mind-lang#102) adds one more cause class: the
// converter's synthesized Program (exports non-empty) now emits through
// `lib/typed-mind/src/emitter/emit-shortform.ts`'s longform-promotion
// (`shortformCannotExpress`) instead of the illegal shortform `-> [...]`
// continuation attachment-rules.ts always rejected — the SAME pre-existing
// defect RFC-TM-6 Q3's own goldens test (capture-legacy-converter-
// goldens.test.ts) and RFC-TM-9 Q1's file header (tmd-goldens.test.ts) both
// independently disclosed before this fix. This replaces the 2-line
// shortform Program declaration (`<Name> -> <entry> v<version>` +
// `  -> [<exports>]`) with the 6-line longform block (`program <Name> {` /
// `  type: Program` / `  entry: <entry>` / `  version: <version>` /
// `  exports: [<exports>]` / `}`) — same entry/version/exports, only the
// serialization form changes. Exact count over the same 3-golden fixture
// set: one per golden with a generated, exports-bearing Program
// (preferClassFile-true, preferClassFile-false); generatePrograms-false.tmd
// has none.
//
// This new class SUBSUMES PROGRAM-NAME-COLLISION-FIX's own 2 prior
// occurrences on these same two goldens: `matchProgramExportsLongformPromotion`
// reads the Program's name off the live emission's own longform header
// rather than re-deriving `<Base>__App` from the baseline, so the same two
// Program lines that used to match PROGRAM-NAME-COLLISION-FIX's single-line
// shape now match this class's 2-line-to-6-line shape instead (the
// collision-fix content is still implicitly proven — the header name is
// asserted verbatim, whatever it is — just not re-derived by this script).
// PROGRAM-NAME-COLLISION-FIX's expected count therefore drops to 0 on this
// fixture set; the class itself stays defined (rather than deleted) in case
// a future golden gains a Program-name collision with no exports.
const CAUSE_CLASSES = {
  'TM13-B3-TYPED-MEMBER-SURFACE': { expected: 3 },
  'EMITTER-STRUCTURE': { expected: 14 }, // dropped `# Section` header lines, summed across all 3 goldens (5 + 5 + 4)
  'EMITTER-BLANK-LINE-SPACING': { expected: 4 }, // inserted blank line between same-kind entities (1 + 2 + 1)
  'EMITTER-TRAILING-NEWLINE': { expected: 3 }, // dropped trailing newline, one per golden (emit()'s trailing .trim())
  'PROGRAM-NAME-COLLISION-FIX': { expected: 0 }, // RFC-TM-9 X-CONV-4: subsumed by RC-C-PROGRAM-EXPORTS-LONGFORM-PROMOTION on this fixture set (see note above) — both current Programs have exports
  'RC-C-PROGRAM-EXPORTS-LONGFORM-PROMOTION': { expected: 2 }, // issue #102: shortform Program-exports continuation -> legal longform Program block, one per golden with an exports-bearing Program
};

// RFC-TM-9 X-CONV-4's naming fix: a baseline Program-declaration line
// `<Base>App -> <entry> v<version>` replaced by the live emission's
// `<Base>__App -> <entry> v<version>` — same entry/version, only the
// Program's own name gains the `__` separator per `deriveProgramName`.
const PROGRAM_NAME_COLLISION_PATTERN = /^(\w+)App( -> .+)$/;
const isProgramNameCollisionFix = (baselineLine, liveLine) => {
  const baselineMatch = baselineLine.match(PROGRAM_NAME_COLLISION_PATTERN);
  if (!baselineMatch) {
    return false;
  }
  const [, base, rest] = baselineMatch;
  return liveLine === `${base}__App${rest}`;
};

// RC-C (issue #102): a baseline 2-line shortform Program declaration —
// `<Name> -> <entry> v<version>` + `  -> [<exports>]` — replaced by the
// live emission's 6-line longform block carrying the identical entry/
// version/exports. RFC-TM-13 E retires generated double underscores, so
// these two baseline fixtures again use the same Program name. Assert that
// name explicitly; accepting an arbitrary live header would hide allocator
// drift. Adversarial numeric/source collisions are covered by E's tests.
const PROGRAM_SHORTFORM_DECLARATION_PATTERN = /^(\w+) -> (\w+) v([\w.-]+)$/;
const PROGRAM_SHORTFORM_EXPORTS_PATTERN = /^ {2}-> \[(.+)\]$/;
const PROGRAM_LONGFORM_HEADER_PATTERN = /^program \w+ \{$/;
const matchProgramExportsLongformPromotion = (baselineLines, baselineIndex, liveLines, liveIndex) => {
  const declarationLine = baselineLines[baselineIndex];
  const exportsLine = baselineLines[baselineIndex + 1];
  const headerLine = liveLines[liveIndex];
  if (declarationLine === undefined || exportsLine === undefined || headerLine === undefined) {
    return null;
  }
  const declarationMatch = declarationLine.match(PROGRAM_SHORTFORM_DECLARATION_PATTERN);
  const exportsMatch = exportsLine.match(PROGRAM_SHORTFORM_EXPORTS_PATTERN);
  if (declarationMatch === null || exportsMatch === null || !PROGRAM_LONGFORM_HEADER_PATTERN.test(headerLine)) {
    return null;
  }
  const [, name, entry, version] = declarationMatch;
  const [, exportsList] = exportsMatch;
  const expectedLiveBlock = [
    `program ${name} {`,
    '  type: Program',
    `  entry: ${entry}`,
    `  version: ${version}`,
    `  exports: [${exportsList}]`,
    '}',
  ];
  const liveBlock = liveLines.slice(liveIndex, liveIndex + expectedLiveBlock.length);
  if (liveBlock.length !== expectedLiveBlock.length || liveBlock.some((line, offset) => line !== expectedLiveBlock[offset])) {
    return null;
  }
  return { baselineLinesConsumed: 2, liveLinesConsumed: expectedLiveBlock.length };
};

// These three fixed source mocks acquire exactly two typed methods. Matching
// whole expected blocks rejects unrelated member, ownership or path changes.
const matchTypedMembers = (baselineLines, baselineIndex, liveLines, liveIndex) => {
  for (const fused of [true, false]) {
    const before = [
      fused
        ? 'UserService #: project/src/services/user-service.ts <: BaseService, IUserService'
        : 'UserService <: BaseService, IUserService',
      ...(fused ? ['  <- [UserDTO, CreateUserDTO]'] : []),
      '  => [createUser, findUser]',
    ];
    const after = [
      fused ? 'classfile UserService {' : 'class UserService {',
      fused ? '  type: ClassFile' : '  type: Class',
      ...(fused ? ['  path: project/src/services/user-service.ts'] : []),
      '  extends: BaseService',
      '  implements: [IUserService]',
      ...(fused ? ['  imports: [UserDTO, CreateUserDTO]'] : []),
      '  method: "async createUser(data: CreateUserDTO) => Promise<UserDTO>"',
      '  method: "async findUser(id: string) => Promise<UserDTO | null>"',
      ...(fused ? ['  exports: [UserService]'] : []),
      '}',
    ];
    if (
      before.every((line, offset) => baselineLines[baselineIndex + offset] === line) &&
      after.every((line, offset) => liveLines[liveIndex + offset] === line)
    )
      return { before: before.length, after: after.length };
  }
  return undefined;
};

class GoldenDeltaError extends Error {}

const walkFiles = (dir, out) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, out);
    } else {
      out.push(full);
    }
  }
};

// Splits on '\n' the way both engines produce it (no '\r\n' anywhere in this
// pipeline) and reports whether the file ends with a trailing newline (a
// trailing '\n' produces one extra empty string at the end of String#split).
const splitLines = (content) => {
  const hasTrailingNewline = content.endsWith('\n');
  const lines = content.split('\n');
  if (hasTrailingNewline) {
    lines.pop();
  }
  return { lines, hasTrailingNewline };
};

// Walks baseline lines against live lines with a two-pointer scan that
// tolerates two independent one-sided edits:
//   - a baseline `# `-header line absent from live at this position is
//     EMITTER-STRUCTURE (baseline pointer alone advances — the header was
//     REMOVED);
//   - a live blank line absent from baseline at this position is
//     EMITTER-BLANK-LINE-SPACING (live pointer alone advances — a blank
//     line was INSERTED between two same-kind entities the legacy emitter
//     packed with no gap).
// Any other mismatch is unclassified.
const classifyFileDelta = (relPath, baselineContent, liveContent, censusCounts, unclassified) => {
  const baseline = splitLines(baselineContent);
  const live = splitLines(liveContent);

  let baselineIndex = 0;
  let liveIndex = 0;
  let sawUnclassified = false;

  while (baselineIndex < baseline.lines.length || liveIndex < live.lines.length) {
    const baselineLine = baseline.lines[baselineIndex];
    const liveLine = live.lines[liveIndex];

    if (baselineIndex < baseline.lines.length && liveIndex < live.lines.length && baselineLine === liveLine) {
      baselineIndex += 1;
      liveIndex += 1;
      continue;
    }
    if (baselineIndex < baseline.lines.length && baselineLine.startsWith('# ')) {
      censusCounts['EMITTER-STRUCTURE'] += 1;
      baselineIndex += 1;
      continue;
    }
    if (liveIndex < live.lines.length && liveLine === '') {
      censusCounts['EMITTER-BLANK-LINE-SPACING'] += 1;
      liveIndex += 1;
      continue;
    }
    if (baselineIndex < baseline.lines.length && liveIndex < live.lines.length && isProgramNameCollisionFix(baselineLine, liveLine)) {
      censusCounts['PROGRAM-NAME-COLLISION-FIX'] += 1;
      baselineIndex += 1;
      liveIndex += 1;
      continue;
    }
    const programExportsMatch = matchProgramExportsLongformPromotion(baseline.lines, baselineIndex, live.lines, liveIndex);
    if (programExportsMatch !== null) {
      censusCounts['RC-C-PROGRAM-EXPORTS-LONGFORM-PROMOTION'] += 1;
      baselineIndex += programExportsMatch.baselineLinesConsumed;
      liveIndex += programExportsMatch.liveLinesConsumed;
      continue;
    }
    const members = matchTypedMembers(baseline.lines, baselineIndex, live.lines, liveIndex);
    if (members !== undefined) {
      censusCounts['TM13-B3-TYPED-MEMBER-SURFACE'] += 1;
      baselineIndex += members.before;
      liveIndex += members.after;
      continue;
    }
    sawUnclassified = true;
    baselineIndex += 1;
    liveIndex += 1;
  }

  if (baseline.hasTrailingNewline && !live.hasTrailingNewline) {
    censusCounts['EMITTER-TRAILING-NEWLINE'] += 1;
  } else if (baseline.hasTrailingNewline !== live.hasTrailingNewline) {
    sawUnclassified = true;
  }

  if (sawUnclassified) {
    unclassified.push(relPath);
  }
};

const main = () => {
  if (!existsSync(BASELINE_DIR)) {
    throw new GoldenDeltaError(
      `${BASELINE_DIR} not found — run the Q1 golden-capture tests first (node --test) to establish the pinned baseline.`,
    );
  }

  if (!existsSync(LIVE_DIR)) {
    console.log('[check-golden-deltas] PASS — goldens/live/ does not exist yet; nothing to diff. All cause-class censuses at 0.');
    return;
  }

  const baselineFiles = [];
  walkFiles(BASELINE_DIR, baselineFiles);
  const liveFiles = [];
  walkFiles(LIVE_DIR, liveFiles);

  const baselineRel = new Set(baselineFiles.map((f) => relative(BASELINE_DIR, f)));
  const liveRel = new Set(liveFiles.map((f) => relative(LIVE_DIR, f)));

  const missingFromLive = [...baselineRel].filter((f) => !liveRel.has(f));
  const unexpectedInLive = [...liveRel].filter((f) => !baselineRel.has(f));

  const unclassified = [];
  const censusCounts = Object.fromEntries(Object.keys(CAUSE_CLASSES).map((name) => [name, 0]));

  for (const relPath of baselineRel) {
    if (!liveRel.has(relPath)) {
      continue;
    }
    const baselineContent = readFileSync(join(BASELINE_DIR, relPath), 'utf8');
    const liveContent = readFileSync(join(LIVE_DIR, relPath), 'utf8');
    if (baselineContent === liveContent) {
      continue;
    }
    classifyFileDelta(relPath, baselineContent, liveContent, censusCounts, unclassified);
  }

  if (missingFromLive.length > 0 || unexpectedInLive.length > 0 || unclassified.length > 0) {
    const lines = [];
    if (missingFromLive.length > 0) {
      lines.push(`  missing from goldens/live/: ${missingFromLive.join(', ')}`);
    }
    if (unexpectedInLive.length > 0) {
      lines.push(`  unexpected in goldens/live/ (not in baseline): ${unexpectedInLive.join(', ')}`);
    }
    if (unclassified.length > 0) {
      lines.push(`  unclassified content deltas: ${unclassified.join(', ')}`);
    }
    throw new GoldenDeltaError(`golden delta gate failed:\n${lines.join('\n')}`);
  }

  for (const [name, { expected }] of Object.entries(CAUSE_CLASSES)) {
    if (expected !== null && censusCounts[name] !== expected) {
      throw new GoldenDeltaError(`cause class ${name}: expected exact count ${expected}, got ${censusCounts[name]}`);
    }
  }

  console.log(
    `[check-golden-deltas] PASS — goldens/live/ deltas from goldens/legacy-baseline/ fully classified (${baselineRel.size} files compared): ${JSON.stringify(censusCounts)}`,
  );
};

try {
  main();
} catch (error) {
  if (error instanceof GoldenDeltaError) {
    console.error(`[check-golden-deltas] FAIL: ${error.message}`);
  } else {
    console.error('[check-golden-deltas] FAIL:', error);
  }
  process.exit(1);
}
