#!/usr/bin/env node
// RFC-TM-6 §4 (rfc-tm-6-diamond.md) — the executable golden-diff gate. Diffs
// goldens/legacy-baseline/ (pinned permanently after Q1) against the live
// goldens tree and classifies every differing entry into a named cause
// class with an exact-count census. Unclassified deltas or count drift
// exit 1. The classifier compares two checked-in file sets; it never runs
// the legacy engine, so it survives TM-4 Q5's legacy-engine deletion
// unchanged (§4 "No retirement dependency").
//
// Q2 (this Quantum) extends Q1's stub with the classification logic the doc
// names for the renderer flip. Every graph golden differs from baseline
// because EVERY entity's field shape changed (legacy `type`/`position` ->
// new `kind`/`span`, per-kind field additions/removals) — this is the
// AST-FIELD-RENAME class, the dominant and expected delta on every file.
// On top of that per-file baseline, specific link/error/entity-count deltas
// are classified into the doc's named classes:
//
//   - GRAPH-SELF-EXPORT-LINKS (doc-named, derived from TM-4's frozen A12).
//   - A11-ERRORS-VANISH (doc-named): scenario-21's 3 "references unknown
//     parent" messages disappear because the port validates
//     declaredContainedBy only (FID-4).
//   - A6-CIRCULAR (doc-named, derived from TM-4's frozen A6 — "originated
//     duplicate-name coverage... the folded facade-error class on circular
//     self-imports"): the fix/facade-import-resolution PR (#35) wires
//     ImportResolver into TypedMind.parse()/check(), which appends resolved
//     entities onto the duplicate-preserving ParseOutcome.entities list
//     (mirroring the shadow-verdict harness's runNew reference
//     implementation verbatim). On the circular fixture (module-a.tmd
//     re-importing itself via module-b.tmd), FileA/ServiceA/methodA each
//     appear TWICE post-flip (once declared, once re-imported through the
//     cycle) where legacy's merge produced one copy per name. The legacy
//     check()-only "Entity 'X' conflicts with imported entity" error is
//     folded into the originated `checker/duplicate-name` check per TM-4's
//     A6 amendment row, so 3 "conflicts" messages vanish and 6 "Duplicate
//     entity name" messages (2 per name — the checker reports the
//     collision from both sides) appear in their place.
//   - CLASS-IMPORTS-VANISH (not doc-named; this Quantum's investigation
//     surfaced it, see PR discussion): TM-3/TM-4's F3 disposition
//     (class-node.ts) drops ClassNode's `imports` field entirely (a
//     declared Class's `<- [...]` continuation is
//     `semantics/illegal-continuation`, already-approved, zero corpus
//     instances at the check() level per TM-4's A1 row). The renderer's
//     getGraphData duck-typing DID read Class.imports when legacy populated
//     it (ClassEntity.imports is optional but present in the corpus, e.g.
//     scenario-34's `cli`/`configLoader`/`schemaValidator`), so those
//     import LINKS vanish from the graph even though check()'s verdict was
//     already unaffected by TM-4. Measured: scenario-34 has 7 Class
//     entities with populated imports x 2 non-advanced classes = 14.
//   - A1 / A10 (doc-named, TM-4 frozen rows): scenario-34's Class-imports
//     illegal-continuation warning (x3) and scenario-35's affects-on-
//     UIComponent illegal-continuation warning (x18), both x3 renderer
//     classes. Multiset (occurrence-count) diffing is required here — an
//     earlier version of this script used Set-based presence/absence and
//     silently undercounted A10 from 18 to 1 per class.
//   - A2-PR18-MANIFEST (doc-named, TM-4 A2 row: "PR #18 manifest classes
//     now diagnosed... array-suffix-bare-name... unrecognized-form...").
//     scenario-34's check() now surfaces `syntax/error: unparsable text`
//     diagnostics for two of A2's six PR #18 manifest sub-classes, traced
//     to lib/typed-mind/scripts/pr18-corpus-manifest.json's per-file
//     entries — see the constant definitions below for the exact line
//     numbers and the tree-sitter error-node-grouping quirk that folds 9
//     entity-level occurrences into 8 unique messages.
//   - Q7-MESSAGE-AUDIT (RFC-TM-10 §12, D-LEG-12 — this Quantum's own
//     addition, not a TM-4 row): the diagnostic message-quality audit
//     rewrote several checker/pipeline message strings. A1's, A10's, and
//     A2's own EXPECTED_* constants (below) were updated in place to track
//     their rewritten text (their frozen COUNTS are unchanged, only the
//     exact strings). CIRCULAR_DOC's `imports/circular` message (a fourth,
//     previously-unclassified rewrite site — the cross-file circular-import
//     path, distinct from `checker/circular-import`'s intra-document cycle
//     detection, which shares a similar-looking but unmodified message
//     prefix) gets its own named vanish/new pair since no existing A-class
//     owned it.
//
// fix/facade-import-resolution (PR #35, merged to main) wired
// ImportResolver into TypedMind.parse()/check()/parseWithCst when filePath
// is supplied, closing the CROSS-FILE-IMPORT-UNRESOLVED gap this script
// previously (incorrectly) classified as pre-existing scope — that class
// no longer exists: scenario-21 and the circular-import fixture now
// resolve cross-file @imports exactly like legacy, and every delta on
// those two documents collapses into the doc-named A11-ERRORS-VANISH and
// A6-CIRCULAR classes respectively.
//
// Every cause class below carries the exact evidence (fixture, fields,
// counts) verified against this Quantum's actual goldens/live/ capture —
// see the PR body's per-golden-delta classification table for the full
// walkthrough.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BASELINE_DIR = join(PACKAGE_ROOT, 'goldens', 'legacy-baseline');
const LIVE_DIR = join(PACKAGE_ROOT, 'goldens', 'live');

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

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

// scenario-34's Class entities with legacy-populated `imports` (verified:
// cli -> [commander, chalk, ora], configLoader -> [yaml, json5, cosmiconfig],
// schemaValidator -> [ajv] — 3 Classes x their import counts = 7 links).
const EXPECTED_CLASS_IMPORTS_VANISH_LINKS_PER_CLASS = 7;

// TM-4's frozen A12 census (6 records / 3 files), re-derived for this RFC's
// 7-doc fixture set per §4: only scenario-34 is in the fixture list, its 4
// ClassFiles (PluginAPI, Logger, FileUtils, ProcessUtils) each gain one
// export self-loop per renderer class whose getGraphData builds export
// links (interactive, enhanced — advanced stubs links: [] and contributes 0).
const EXPECTED_SELF_EXPORT_LINKS_PER_CLASS = 4;

// RFC-TM-10 §8 (rfc-tm-10-diamond.md, D-LEG-8): scenario-34-cli-tool's
// `ValidationError` is referenced only via a DTO field typed
// `errors: ValidationError[]` (an array-of-named TypeExprNode) — the checker
// walk-gap fix makes `collectReferencedNames` walk that array/named
// structure and resolve the reference, so the orphan finding vanishes. Fires
// once per renderer class (advanced, enhanced, interactive).
const EXPECTED_D_LEG_8_VANISHED_MESSAGES = ["Orphaned entity 'ValidationError'"];
// RFC-TM-13 burndown Q1 (PR #182, TM13-Q1-CLASSFILE-DATA-KIND):
// scenario-34-cli-tool's `PluginContext.api` field is typed `PluginAPI`, a
// ClassFile (`PluginAPI #: src/plugins/api.ts`). ClassFile joined the shared
// data-type kind list (lib/typed-mind/src/checker/data-type-kinds.ts), so
// the false `dto-field-non-data-type` finding vanishes. Fires once per
// renderer class (advanced, enhanced, interactive).
const EXPECTED_TM13_Q1_VANISHED_MESSAGES = [
  "DTO 'PluginContext' field 'api' references 'PluginAPI' which is a ClassFile, not a DTO or Class",
];
// RFC-TM-13 B1.5: signature-removal controls in signature-corpus-deltas.test.ts
// restore exactly these findings while preserving every other diagnostic.
const EXPECTED_B1_SIGNATURE_ORPHANS = new Map([
  ['scenario-31-mixed-syntax', ["Orphaned entity 'TodoDTO'", "Orphaned entity 'UserDTO'"]],
  ['scenario-34-cli-tool', ["Orphaned entity 'TaskInfo'"]],
]);

// RFC-TM-13 Q: exact canonical method-owner and import-alias movements.
// qualified-name-corpus-deltas.test.ts removes the real method references
// and restores the complete orphan multiset for both larger scenarios.
const EXPECTED_Q_METHOD_ORPHANS = new Map(
  [
    ['scenario-34-cli-tool', ['cli', 'taskRunner', 'taskRegistry', 'dependencyResolver', 'taskScheduler', 'schemaValidator', 'workerPool']],
    [
      'scenario-35-video-game',
      [
        'GameManager',
        'SceneManager',
        'CombatSystem',
        'AIController',
        'InventorySystem',
        'WorldManager',
        'QuestManager',
        'NPCManager',
        'NetworkManager',
        'AudioManager',
        'SaveSystem',
        'ResourceManager',
        'RenderingManager',
      ],
    ],
  ].map(([doc, names]) => [doc, names.map((name) => `Orphaned entity '${name}'`)]),
);
const EXPECTED_Q_ALIAS_ERRORS = [
  "Class 'DB.Connection' is not exported by any file",
  "Function 'DB.query' is not exported by any file and is not a class method",
  "Call to 'DB.Connection.connect' references unknown entity 'DB'",
];
const EXPECTED_Q_ALIAS_EXPORT_LINKS = new Set([
  'UI->UI.ComponentsFile:export',
  'UI->UI.Button:export',
  'UI->UI.Form:export',
  'UI->UI.Input:export',
  'UI->UI.Modal:export',
  'DB->DB.DatabaseFile:export',
  'DB->DB.Connection:export',
  'DB->DB.query:export',
]);

// scenario-21's 3 "references unknown parent" messages (§4, A11-ERRORS-VANISH).
const EXPECTED_A11_MESSAGES = [
  "UIComponent 'UI.Button' references unknown parent 'Form'",
  "UIComponent 'UI.Button' references unknown parent 'Modal'",
  "UIComponent 'UI.Input' references unknown parent 'Form'",
];

// The circular-import fixture (imports-circular-module-a-b): the 3 legacy
// "conflicts with imported entity" messages that fold into the originated
// duplicate-name check (TM-4 A6 amendment row).
const EXPECTED_A6_VANISHED_MESSAGES = [
  "Entity 'FileA' conflicts with imported entity",
  "Entity 'ServiceA' conflicts with imported entity",
  "Entity 'methodA' conflicts with imported entity",
];

// The 6 "Duplicate entity name" messages that replace them (2 per name —
// the originated checker reports the collision from both directions).
const EXPECTED_A6_NEW_MESSAGE_PREFIXES = [
  "Duplicate entity name 'FileA'",
  "Duplicate entity name 'ServiceA'",
  "Duplicate entity name 'methodA'",
];

const CIRCULAR_DOC = 'imports-circular-module-a-b';
const DUPLICATED_ENTITY_NAMES = ['FileA', 'ServiceA', 'methodA'];

// RFC-TM-10 §12 (D-LEG-12, Q7 message-quality audit): `imports/circular`'s
// message (`pipeline/import-resolver.ts`) gained a trailing suggestion
// clause (no `suggestion` field exists on the pipeline-level `Diagnostic`
// type, so clause 3 folds into `message`). The message's path-bearing
// prefix (`Circular import detected: <path> -> <path> -> <path>`) varies by
// checkout location — this fixture's own `<REPO_ROOT>`-normalized baseline
// preserves that variability — so the match is a prefix/suffix pair, not a
// full-string constant: any message starting with "Circular import
// detected:" and ending with the new suggestion clause is this class. Fires
// once per renderer class (x3) on CIRCULAR_DOC only, the one fixture that
// exercises cross-file import resolution's circular-detection path (as
// opposed to `checker/circular-import`'s intra-document cycle detection,
// which shares an unrelated but textually similar message prefix and is
// NOT part of this class — its own message was not changed by Q7).
const IMPORTS_CIRCULAR_MESSAGE_PREFIX = 'Circular import detected: ';
const IMPORTS_CIRCULAR_MESSAGE_SUFFIX = ' — break the cycle by removing one of these imports';

// TM-4's frozen A1 row (rfc-tm-4-diamond.md §4): "Class-imports ->
// semantics/illegal-continuation" — scenario-34 is named in A1's file
// census (x3). Warning-severity only, no valid->invalid verdict flip.
// RFC-TM-10 §12 (D-LEG-12, Q7 message-quality audit): the message text
// itself was rewritten (`pipeline/attachment-rules.ts`'s
// `illegalContinuationDiagnostic`) — the leading "illegal continuation:"
// log-tag phrasing read as internal terminology, not prose. The COUNT this
// class asserts (A1's own frozen fact — 3 records) is unchanged; only the
// exact string this constant matches against updated to track the rewrite.
const EXPECTED_A1_MESSAGE =
  'This imports list (`<- [...]`) cannot attach to a Class entity — move it under an entity kind that accepts it, or remove it';
const EXPECTED_A1_COUNT = 3;

// TM-4's frozen A10 row: "Illegal-continuation general class... beyond A1's
// Class-imports instance" — scenario-35's affects-on-UIComponent instance
// is frozen at exactly 18 records. RFC-TM-10 §12 (D-LEG-12, Q7): message
// text updated for the same rewrite as A1 above; the frozen count (18) is
// unchanged.
const EXPECTED_A10_MESSAGE =
  'This affects list (`~ [...]`) cannot attach to a UIComponent entity — move it under an entity kind that accepts it, or remove it';
const EXPECTED_A10_COUNT = 18;

// TM-4's frozen A2 row (rfc-tm-4-diamond.md §4): "PR #18 manifest classes
// now diagnosed — all six: ... array-suffix-bare-name x4 ... unrecognized-
// form x11 ... silent-drop assertions become diagnostic assertions." The
// renderer goldens are the first consumer to see check() diagnostics for
// scenario-34 through a filePath-bearing path (fix/facade-import-resolution,
// PR #35), so these two of A2's six sub-classes surface here for the first
// time. Traced to lib/typed-mind/scripts/pr18-corpus-manifest.json's
// per-file entries for scenario-34-cli-tool.tmd:
//   - array-suffix-bare-name: lines 221/227/239 (`-> TaskResult[]` /
//     `-> TaskInfo[]` trailing-[] array-suffix outputs) and 250/290
//     (`<- Task, TaskContext` comma-separated bare input names).
//   - unrecognized-form: lines 470-493, the four `Name < "desc"` pseudo-
//     interface blocks (PluginAPI/Logger/FileUtils/ProcessUtils — the same
//     4 ClassFiles GRAPH-SELF-EXPORT-LINKS names for a different reason).
// 9 entity-level occurrences (5 array-suffix-bare-name spans + 4
// unrecognized-form blocks) surface as only 4 UNIQUE messages: tree-sitter's
// error-node grouping merges two adjacent unparsable regions into one ERROR
// node when nothing parseable separates them.
//
// RFC-TM-8 §1 collateral (rfc-tm-8-diamond.md, X-TYPE-1), UPDATED by
// tm10-inc2-grammar (issues #50/#83): this Quantum's type-expression
// sub-grammar adds new token shapes to the grammar's global token table,
// which shifts what GLR error recovery can match at every recovery point
// (the same mechanism documented on q1-shortform.txt's/q2-longform.txt's
// collateral ERROR-recovery-shape notes). RFC-TM-8 Q1 first merged
// FileUtils (482-486) with ProcessUtils (488-493) across their shared
// blank line (487), reporting FileUtils's own text as the ERROR node's
// first-line snippet (`errorSnippet`, pipeline/syntax-diagnostics.ts, walks
// only the FIRST line of the merged ERROR node's span) — the same "only a
// blank line between them" shape PluginAPI/Logger already merge across
// (reporting PluginAPI's text). tm10-inc2-grammar's own new token shapes
// (_paramlist_opaque_open, _typeof_opaque_open — issues #50/#83) shift the
// recovery boundary AGAIN: the merged ERROR node's START now moves to
// ProcessUtils's line instead of FileUtils's (empirically confirmed:
// swapping in the pre-tm10-inc2-grammar grammar.wasm in this exact worktree
// reproduces the FileUtils-first-line shape; the post-fix grammar.wasm
// reports ProcessUtils's own text as the merged block's first line
// instead). PluginAPI/Logger still merge on PluginAPI's text (their
// mechanism is untouched by this Quantum's new tokens, which key on `(`
// and never fire on a bare `<` class-declaration line). Occurrence count
// is UNCHANGED at 7 (still 4 unique messages, still one message string per
// merged block) — only WHICH class's text is the reported snippet for the
// FileUtils+ProcessUtils merged block flips from FileUtils to ProcessUtils.
// The document-level verdict is unchanged: scenario-34 is still invalid,
// still flagged — this is purely a GLR-recovery-boundary reshuffle of a
// pre-existing, unrelated defect (a `<` vs `<:` class-declaration typo in
// the fixture, out of this Quantum's scope to fix). 7 total occurrences x
// 3 renderer classes (interactive/enhanced/advanced all read the same
// check() diagnostics) = 21 (count itself unchanged from RFC-TM-8 Q1).
// RFC-TM-10 §12 (D-LEG-12, Q7 message-quality audit): `syntax/error`'s
// message gained an initial capital and a trailing suggestion clause
// (`pipeline/syntax-diagnostics.ts`) — the frozen A2 occurrence counts below
// (inline comments) are unchanged; only the exact strings updated.
const EXPECTED_A2_MESSAGES = [
  'Unparsable text: `[]` — check this line against the grammar and fix or remove it', // x3 occurrences (lines 221, 227, 239)
  'Unparsable text: `, TaskContext` — check this line against the grammar and fix or remove it', // x2 occurrences (lines 250, 290)
  'Unparsable text: `PluginAPI < "Plugin API interface"` — check this line against the grammar and fix or remove it', // Logger's block folds in (tree-sitter grouping)
  'Unparsable text: `ProcessUtils < "Process utilities interface"` — check this line against the grammar and fix or remove it', // tm10-inc2-grammar: FileUtils+ProcessUtils merged block now reports ProcessUtils's text as its first line instead of FileUtils's (see comment above)
];
const EXPECTED_A2_DOC = 'scenario-34-cli-tool';
const EXPECTED_A2_COUNT = 7; // total occurrences across the 4 unique messages above (see inline counts; count unchanged by tm10-inc2-grammar — only the FileUtils/ProcessUtils merged-block snippet text flipped)

const linkKey = (link) => `${link.source}->${link.target}:${link.type}`;

// Classifies one graph golden's link-set delta (missing-from-live,
// extra-in-live) into named buckets. Returns the unclassified residue so
// the caller can fail loudly on anything this script doesn't recognize.
const classifyGraphLinks = (docName, rendererClass, baseline, live, report) => {
  const baselineLinks = new Map((baseline.links ?? []).map((link) => [linkKey(link), link]));
  const liveLinks = new Map((live.links ?? []).map((link) => [linkKey(link), link]));

  const missing = [...baselineLinks.keys()].filter((key) => !liveLinks.has(key));
  const extra = [...liveLinks.keys()].filter((key) => !baselineLinks.has(key));

  const unclassifiedMissing = [];
  const unclassifiedExtra = [];

  for (const key of missing) {
    const link = baselineLinks.get(key);
    if (link.type === 'import' && docName === 'scenario-34-cli-tool' && rendererClass !== 'advanced') {
      report.classImportsVanishLinks += 1;
    } else {
      unclassifiedMissing.push(key);
    }
  }

  for (const key of extra) {
    const link = liveLinks.get(key);
    if (link.type === 'export' && link.source === link.target && docName === 'scenario-34-cli-tool' && rendererClass !== 'advanced') {
      report.selfExportLinks += 1;
    } else if (docName === 'scenario-21-aliased-import' && rendererClass !== 'advanced' && EXPECTED_Q_ALIAS_EXPORT_LINKS.has(key)) {
      report.qAliasExportLinks += 1;
    } else {
      unclassifiedExtra.push(key);
    }
  }

  return { unclassifiedMissing, unclassifiedExtra };
};

// Multiset (occurrence-counting) diff — a message appearing N times in one
// side and M times in the other contributes |N-M| deltas, not a single
// present/absent bit. Using a Set for this (as an earlier version of this
// script did) undercounts any message that legitimately repeats, which is
// exactly A10's shape (scenario-35's 18 identical `affects list...` warnings
// are 18 records in TM-4's frozen census, not 1).
const multisetCounts = (messages) => {
  const counts = new Map();
  for (const message of messages) {
    counts.set(message, (counts.get(message) ?? 0) + 1);
  }
  return counts;
};

const classifyGraphErrors = (docName, baseline, live, report) => {
  const baselineCounts = multisetCounts((baseline.errors ?? []).map((error) => error.message));
  const liveCounts = multisetCounts((live.errors ?? []).map((error) => error.message));
  const unclassified = [];

  const allMessages = new Set([...baselineCounts.keys(), ...liveCounts.keys()]);
  for (const message of allMessages) {
    const baselineCount = baselineCounts.get(message) ?? 0;
    const liveCount = liveCounts.get(message) ?? 0;
    if (baselineCount === liveCount) {
      continue;
    }

    if (baselineCount > liveCount) {
      // Vanished (in whole or in part).
      const vanishedCount = baselineCount - liveCount;
      if (EXPECTED_A11_MESSAGES.includes(message)) {
        report.a11ErrorsVanish += vanishedCount;
      } else if (docName === 'scenario-34-cli-tool' && EXPECTED_D_LEG_8_VANISHED_MESSAGES.includes(message)) {
        report.dLeg8OrphanResolved += vanishedCount;
      } else if (docName === 'scenario-34-cli-tool' && EXPECTED_TM13_Q1_VANISHED_MESSAGES.includes(message)) {
        report.tm13Q1ClassFileDataKind += vanishedCount;
      } else if (EXPECTED_B1_SIGNATURE_ORPHANS.get(docName)?.includes(message)) {
        report.b1SignatureOrphanResolved += vanishedCount;
      } else if (EXPECTED_Q_METHOD_ORPHANS.get(docName)?.includes(message)) {
        report.qMethodOwnerOrphans += vanishedCount;
      } else if (docName === 'scenario-21-aliased-import' && EXPECTED_Q_ALIAS_ERRORS.includes(message)) {
        report.qAliasErrorsVanish += vanishedCount;
      } else if (docName === CIRCULAR_DOC && EXPECTED_A6_VANISHED_MESSAGES.includes(message)) {
        report.a6CircularVanishedErrors += vanishedCount;
      } else if (
        docName === CIRCULAR_DOC &&
        message.startsWith(IMPORTS_CIRCULAR_MESSAGE_PREFIX) &&
        !message.endsWith(IMPORTS_CIRCULAR_MESSAGE_SUFFIX)
      ) {
        report.q7ImportsCircularMessageAuditVanished += vanishedCount;
      } else {
        for (let i = 0; i < vanishedCount; i += 1) unclassified.push(message);
      }
    } else {
      // New (in whole or in part).
      const newCount = liveCount - baselineCount;
      if (docName === CIRCULAR_DOC && EXPECTED_A6_NEW_MESSAGE_PREFIXES.some((prefix) => message.startsWith(prefix))) {
        report.a6CircularNewErrors += newCount;
      } else if (docName === 'scenario-34-cli-tool' && message === EXPECTED_A1_MESSAGE) {
        report.a1ClassImportsWarnings += newCount;
      } else if (docName === 'scenario-35-video-game' && message === EXPECTED_A10_MESSAGE) {
        report.a10IllegalContinuationWarnings += newCount;
      } else if (docName === EXPECTED_A2_DOC && EXPECTED_A2_MESSAGES.includes(message)) {
        report.a2Pr18ManifestMessages += newCount;
      } else if (
        docName === CIRCULAR_DOC &&
        message.startsWith(IMPORTS_CIRCULAR_MESSAGE_PREFIX) &&
        message.endsWith(IMPORTS_CIRCULAR_MESSAGE_SUFFIX)
      ) {
        report.q7ImportsCircularMessageAuditNew += newCount;
      } else {
        for (let i = 0; i < newCount; i += 1) unclassified.push(`(new) ${message}`);
      }
    }
  }

  return unclassified;
};

const classifyGraphEntities = (docName, baseline, live, report) => {
  // Entity NAMES are the same set on every fixture post fix/facade-import-
  // resolution — except the circular fixture, where three names each
  // appear twice in `live` (A6-CIRCULAR's duplicate-preserving merge). A
  // missing-name delta (a name legacy had that live lacks entirely) is
  // always unclassified: nothing in this RFC's scope removes an entity
  // outright once import resolution is wired.
  const baselineNames = (baseline.entities ?? []).map((entity) => entity.name);
  const liveNames = (live.entities ?? []).map((entity) => entity.name);
  const liveNameSet = new Set(liveNames);
  const missing = [...new Set(baselineNames)].filter((name) => !liveNameSet.has(name));

  if (docName === CIRCULAR_DOC) {
    const baselineCounts = new Map();
    for (const name of baselineNames) {
      baselineCounts.set(name, (baselineCounts.get(name) ?? 0) + 1);
    }
    const liveCounts = new Map();
    for (const name of liveNames) {
      liveCounts.set(name, (liveCounts.get(name) ?? 0) + 1);
    }
    const unexpectedDuplicates = [];
    for (const [name, liveCount] of liveCounts) {
      const baselineCount = baselineCounts.get(name) ?? 0;
      if (liveCount === baselineCount) {
        continue;
      }
      const extra = liveCount - baselineCount;
      if (extra > 0 && DUPLICATED_ENTITY_NAMES.includes(name)) {
        // A6-CIRCULAR: this name legitimately gained one extra copy
        // (declared + re-imported through the cycle).
        report.a6CircularDuplicateEntities += extra;
      } else {
        unexpectedDuplicates.push(`${name}: baseline had ${baselineCount}, live has ${liveCount}`);
      }
    }
    return [...missing, ...unexpectedDuplicates];
  }

  const baselineCounts = multisetCounts(baselineNames);
  const liveCounts = multisetCounts(liveNames);
  for (const [name, count] of liveCounts) {
    const extra = count - (baselineCounts.get(name) ?? 0);
    if (extra <= 0) continue;
    if (docName === 'scenario-21-aliased-import' && ['UI', 'DB'].includes(name) && extra === 1) {
      report.qAliasOwnerEntities += 1;
    } else {
      missing.push(`${name}: unexpected ${extra} additional entities`);
    }
  }
  return missing;
};

const main = () => {
  if (!existsSync(BASELINE_DIR)) {
    throw new GoldenDeltaError(
      `${BASELINE_DIR} not found — run the Q1 golden-capture tests first (node --test) to establish the pinned baseline.`,
    );
  }

  if (!existsSync(LIVE_DIR)) {
    console.log(
      '[check-golden-deltas] PASS — goldens/live/ does not exist yet (no flip has landed); nothing to diff. All cause-class censuses at 0.',
    );
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

  if (missingFromLive.length > 0 || unexpectedInLive.length > 0) {
    const lines = [];
    if (missingFromLive.length > 0) {
      lines.push(`  missing from goldens/live/: ${missingFromLive.join(', ')}`);
    }
    if (unexpectedInLive.length > 0) {
      lines.push(`  unexpected in goldens/live/ (not in baseline): ${unexpectedInLive.join(', ')}`);
    }
    throw new GoldenDeltaError(`golden delta gate failed:\n${lines.join('\n')}`);
  }

  const report = {
    astFieldRenameFiles: 0,
    selfExportLinks: 0,
    classImportsVanishLinks: 0,
    a11ErrorsVanish: 0,
    dLeg8OrphanResolved: 0,
    tm13Q1ClassFileDataKind: 0,
    b1SignatureOrphanResolved: 0,
    qMethodOwnerOrphans: 0,
    qAliasErrorsVanish: 0,
    qAliasExportLinks: 0,
    qAliasOwnerEntities: 0,
    a6CircularVanishedErrors: 0,
    a6CircularNewErrors: 0,
    a6CircularDuplicateEntities: 0,
    a1ClassImportsWarnings: 0,
    a10IllegalContinuationWarnings: 0,
    a2Pr18ManifestMessages: 0,
    q7ImportsCircularMessageAuditVanished: 0,
    q7ImportsCircularMessageAuditNew: 0,
  };
  const unclassified = [];

  for (const relPath of baselineRel) {
    // Semantic comparison, not byte comparison: goldens/live/ is regenerated
    // fresh by every `pnpm run test` (it is build output, not committed
    // source — see .gitignore) and is never passed through the repo's
    // formatter, while goldens/legacy-baseline/ IS committed and picks up
    // whatever formatting `pnpm run lint:fix`/biome applied at commit time.
    // A byte-string compare would misreport pure JSON-array-wrapping
    // differences (e.g. compact `["a", "b"]` vs one-element-per-line) as
    // "unclassified deltas" even when the parsed data is identical.
    const baselineValue = readJson(join(BASELINE_DIR, relPath));
    const liveValue = readJson(join(LIVE_DIR, relPath));
    if (JSON.stringify(baselineValue) === JSON.stringify(liveValue)) {
      continue;
    }

    // Every graph/metrics/dependency-branch file that differs at all
    // differs, at minimum, because of the AST-FIELD-RENAME baseline (every
    // entity's `type`/`position` -> `kind`/`span`, per-kind field diffs;
    // diagnostics' `position`/`suggestion` -> `span`/`code`, the doc's
    // ERRSHAPE). That whole-file bucket absorbs the base rename; per-entry
    // classifiers below account for everything ELSE that changed.
    report.astFieldRenameFiles += 1;

    if (relPath.startsWith('graph/')) {
      const [docName, rendererClass] = relPath
        .replace('graph/', '')
        .replace('.json', '')
        .split(/\.(?=[^.]+$)/);

      const { unclassifiedMissing, unclassifiedExtra } = classifyGraphLinks(docName, rendererClass, baselineValue, liveValue, report);
      const unclassifiedErrors = classifyGraphErrors(docName, baselineValue, liveValue, report);
      const unclassifiedEntities = classifyGraphEntities(docName, baselineValue, liveValue, report);

      for (const key of unclassifiedMissing) unclassified.push(`${relPath} link missing: ${key}`);
      for (const key of unclassifiedExtra) unclassified.push(`${relPath} link extra: ${key}`);
      for (const message of unclassifiedErrors) unclassified.push(`${relPath} error delta: ${message}`);
      for (const name of unclassifiedEntities) unclassified.push(`${relPath} entity delta: ${name}`);
    } else if (relPath.startsWith('metrics/')) {
      // Metrics goldens carry only computed numbers (no entity/link/error
      // dumps) — A12-immune per §4. A metrics delta is legitimate only when
      // its document is the mismatch fixture (tm6-branches, the declared-
      // containedBy join direction check), the circular fixture (A6's
      // duplicate entities change dependency-graph-derived counts like
      // dead-code), or scenario-31 (the documentation-coverage residual,
      // an AST-FIELD-RENAME effect — see below). Any OTHER metrics delta
      // is unclassified — a real regression.
      const docName = relPath.replace('metrics/', '').replace('.health-score.json', '');
      if (docName === 'tm6-branches' || docName === CIRCULAR_DOC) {
        // tm6-branches: the mismatch-fixture check (declaredContainedBy
        // join direction, §2) — Coupling shifts because OrphanPanel's
        // dependency target changes. imports-circular-module-a-b: A6's
        // duplicate entities change the dependency graph's dead-code/
        // structure counts (verified: dead-code value 9 -> 6, driven by
        // the duplicate FileA/ServiceA/methodA copies each having their
        // own dependent count). Both are downstream numeric consequences
        // of classes already counted at the graph-file level, not a new
        // class in their own right.
      } else if (docName === 'scenario-21-aliased-import' || docName === 'scenario-31-mixed-syntax') {
        // AST-FIELD-RENAME residual: legacy's regex-driven parser
        // conditionally OMITS purpose/description keys the source never
        // supplied; EntityNode subclasses always assign the field
        // (present as undefined). calculateDocumentationCoverage's
        // truthiness check reproduces "populated by source" but the two
        // engines populate different fields for the same source in a
        // minority of cases (verified: scenario-31 legacy 11/20 documented
        // vs new 6/20). A residual AST-FIELD-RENAME effect, not a new class.
      } else {
        unclassified.push(`${relPath}: unexplained metrics delta`);
      }
    } else {
      // dependency-branches/ (and any other census this script does not
      // yet know about) has no per-entry classifier — its only verified
      // content is getEntityDependencies's return lists, which are
      // byte-identical to baseline once JSON formatting is normalized. A
      // delta here is fail-closed unclassified, never silently accepted:
      // the whole-file astFieldRenameFiles counter above does NOT excuse
      // a file from also landing in `unclassified` when no per-entry
      // classifier ran against it.
      unclassified.push(`${relPath}: unexplained delta (no per-entry classifier registered for this census)`);
    }
  }

  if (unclassified.length > 0) {
    throw new GoldenDeltaError(`unclassified golden deltas:\n  ${unclassified.join('\n  ')}`);
  }

  const expectedSelfExportLinks = EXPECTED_SELF_EXPORT_LINKS_PER_CLASS * 2; // interactive + enhanced
  if (report.selfExportLinks !== expectedSelfExportLinks) {
    throw new GoldenDeltaError(
      `cause class GRAPH-SELF-EXPORT-LINKS: expected exact count ${expectedSelfExportLinks}, got ${report.selfExportLinks}`,
    );
  }

  const expectedClassImportsVanish = EXPECTED_CLASS_IMPORTS_VANISH_LINKS_PER_CLASS * 2; // interactive + enhanced
  if (report.classImportsVanishLinks !== expectedClassImportsVanish) {
    throw new GoldenDeltaError(
      `cause class CLASS-IMPORTS-VANISH: expected exact count ${expectedClassImportsVanish}, got ${report.classImportsVanishLinks}`,
    );
  }

  const expectedA11 = EXPECTED_A11_MESSAGES.length * 3; // x3 renderer classes
  if (report.a11ErrorsVanish !== expectedA11) {
    throw new GoldenDeltaError(`cause class A11-ERRORS-VANISH: expected exact count ${expectedA11}, got ${report.a11ErrorsVanish}`);
  }

  const expectedDLeg8 = EXPECTED_D_LEG_8_VANISHED_MESSAGES.length * 3; // x3 renderer classes
  if (report.dLeg8OrphanResolved !== expectedDLeg8) {
    throw new GoldenDeltaError(
      `cause class D-LEG-8-ORPHAN-RESOLVED: expected exact count ${expectedDLeg8}, got ${report.dLeg8OrphanResolved}`,
    );
  }

  const expectedTm13Q1 = EXPECTED_TM13_Q1_VANISHED_MESSAGES.length * 3; // x3 renderer classes
  if (report.tm13Q1ClassFileDataKind !== expectedTm13Q1) {
    throw new GoldenDeltaError(
      `cause class TM13-Q1-CLASSFILE-DATA-KIND: expected exact count ${expectedTm13Q1}, got ${report.tm13Q1ClassFileDataKind}`,
    );
  }

  const expectedB1 = 9; // three exact messages across three renderer classes
  if (report.b1SignatureOrphanResolved !== expectedB1) {
    throw new GoldenDeltaError(
      `cause class B1-SIGNATURE-ORPHAN-RESOLVED: expected exact count ${expectedB1}, got ${report.b1SignatureOrphanResolved}`,
    );
  }

  for (const [cause, actual, expected] of [
    ['Q-METHOD-OWNER-ORPHANS', report.qMethodOwnerOrphans, 60],
    ['Q-ALIAS-ERRORS-VANISH', report.qAliasErrorsVanish, 9],
    ['Q-ALIAS-EXPORT-LINKS', report.qAliasExportLinks, 16],
    ['Q-ALIAS-OWNER-ENTITIES', report.qAliasOwnerEntities, 6],
  ]) {
    if (actual !== expected) throw new GoldenDeltaError(`cause class ${cause}: expected exact count ${expected}, got ${actual}`);
    console.log(`  ${cause}: ${actual} (expected ${expected})`);
  }

  const expectedA6Vanished = EXPECTED_A6_VANISHED_MESSAGES.length * 3; // x3 renderer classes
  const expectedA6New = EXPECTED_A6_NEW_MESSAGE_PREFIXES.length * 2 * 3; // 2 messages/name x3 names x3 classes
  const expectedA6DuplicateEntities = DUPLICATED_ENTITY_NAMES.length * 3; // 1 extra copy/name x3 names x3 classes
  if (report.a6CircularVanishedErrors !== expectedA6Vanished) {
    throw new GoldenDeltaError(
      `cause class A6-CIRCULAR (vanished errors): expected exact count ${expectedA6Vanished}, got ${report.a6CircularVanishedErrors}`,
    );
  }
  if (report.a6CircularNewErrors !== expectedA6New) {
    throw new GoldenDeltaError(
      `cause class A6-CIRCULAR (new errors): expected exact count ${expectedA6New}, got ${report.a6CircularNewErrors}`,
    );
  }
  if (report.a6CircularDuplicateEntities !== expectedA6DuplicateEntities) {
    throw new GoldenDeltaError(
      `cause class A6-CIRCULAR (duplicate entities): expected exact count ${expectedA6DuplicateEntities}, got ${report.a6CircularDuplicateEntities}`,
    );
  }

  const expectedA1 = EXPECTED_A1_COUNT * 3; // x3 renderer classes
  if (report.a1ClassImportsWarnings !== expectedA1) {
    throw new GoldenDeltaError(
      `cause class A1 (Class-imports illegal-continuation): expected exact count ${expectedA1}, got ${report.a1ClassImportsWarnings}`,
    );
  }

  const expectedA10 = EXPECTED_A10_COUNT * 3; // x3 renderer classes
  if (report.a10IllegalContinuationWarnings !== expectedA10) {
    throw new GoldenDeltaError(
      `cause class A10 (affects-on-UIComponent illegal-continuation): expected exact count ${expectedA10}, got ${report.a10IllegalContinuationWarnings}`,
    );
  }

  const expectedA2 = EXPECTED_A2_COUNT * 3; // 7 total occurrences x3 renderer classes (RFC-TM-8 §1 collateral, snippet text updated by tm10-inc2-grammar — see EXPECTED_A2_MESSAGES comment)
  if (report.a2Pr18ManifestMessages !== expectedA2) {
    throw new GoldenDeltaError(`cause class A2-PR18-MANIFEST: expected exact count ${expectedA2}, got ${report.a2Pr18ManifestMessages}`);
  }

  // RFC-TM-10 §12 (D-LEG-12, Q7 message-quality audit): CIRCULAR_DOC's own
  // `imports/circular` message gained a trailing suggestion clause; fires
  // once per renderer class (x3) as a vanish (old text) paired with a new
  // (rewritten text) — see IMPORTS_CIRCULAR_MESSAGE_PREFIX/SUFFIX above.
  const expectedQ7ImportsCircular = 3; // x3 renderer classes (interactive/enhanced/advanced)
  if (report.q7ImportsCircularMessageAuditVanished !== expectedQ7ImportsCircular) {
    throw new GoldenDeltaError(
      `cause class Q7-MESSAGE-AUDIT (imports/circular, vanished): expected exact count ${expectedQ7ImportsCircular}, got ${report.q7ImportsCircularMessageAuditVanished}`,
    );
  }
  if (report.q7ImportsCircularMessageAuditNew !== expectedQ7ImportsCircular) {
    throw new GoldenDeltaError(
      `cause class Q7-MESSAGE-AUDIT (imports/circular, new): expected exact count ${expectedQ7ImportsCircular}, got ${report.q7ImportsCircularMessageAuditNew}`,
    );
  }

  console.log('[check-golden-deltas] PASS — every golden delta classified:');
  console.log(
    `  AST-FIELD-RENAME: ${report.astFieldRenameFiles} files (base entity/diagnostic field-shape rename, expected on every differing file)`,
  );
  console.log(`  GRAPH-SELF-EXPORT-LINKS: ${report.selfExportLinks} (expected ${expectedSelfExportLinks})`);
  console.log(`  CLASS-IMPORTS-VANISH: ${report.classImportsVanishLinks} (expected ${expectedClassImportsVanish})`);
  console.log(`  A11-ERRORS-VANISH: ${report.a11ErrorsVanish} (expected ${expectedA11})`);
  console.log(`  B1-SIGNATURE-ORPHAN-RESOLVED: ${report.b1SignatureOrphanResolved} (expected ${expectedB1})`);
  console.log(`  D-LEG-8-ORPHAN-RESOLVED: ${report.dLeg8OrphanResolved} (expected ${expectedDLeg8})`);
  console.log(`  TM13-Q1-CLASSFILE-DATA-KIND: ${report.tm13Q1ClassFileDataKind} (expected ${expectedTm13Q1})`);
  console.log(
    `  A6-CIRCULAR: ${report.a6CircularVanishedErrors} vanished errors (expected ${expectedA6Vanished}), ${report.a6CircularNewErrors} new errors (expected ${expectedA6New}), ${report.a6CircularDuplicateEntities} duplicate entities (expected ${expectedA6DuplicateEntities})`,
  );
  console.log(`  A1: ${report.a1ClassImportsWarnings} (expected ${expectedA1})`);
  console.log(`  A10: ${report.a10IllegalContinuationWarnings} (expected ${expectedA10})`);
  console.log(`  A2-PR18-MANIFEST: ${report.a2Pr18ManifestMessages} (expected ${expectedA2})`);
  console.log(
    `  Q7-MESSAGE-AUDIT (imports/circular): ${report.q7ImportsCircularMessageAuditVanished} vanished (expected ${expectedQ7ImportsCircular}), ${report.q7ImportsCircularMessageAuditNew} new (expected ${expectedQ7ImportsCircular})`,
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
