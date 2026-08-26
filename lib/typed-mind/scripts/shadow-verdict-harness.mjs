#!/usr/bin/env node
// RFC-TM-4 §1 Check / §4 (rfc-tm-4-diamond.md) — the shadow-verdict harness.
// COMMITTED and KEPT ALIVE until Q5 (§3 bridge discipline): it re-proves
// legacy/new verdict equivalence over the 142 corpus documents on every
// legacy-freeze exception, and its first run freezes the A6/A8 file censuses
// of the S-TEST-1 amendment table (§4, FID-8).
//
// Both stacks run per document (filePath passed, as the test-suite does):
//   legacy: new DSLChecker().check(content, absPath) — the full legacy
//           pipeline: regex parse, legacy import resolution + facade conflict
//           errors, DSLValidator's 22-call catalog (console.error muted);
//   new:    TypedMindParser.parse → pipeline ImportResolver merge (appended to
//           the duplicate-preserving list; the facade conflict error folds
//           into the duplicate-name check, §1) → computeLinks → AstValidator.
//
// Verdict = the per-document multiset of messages (legacy: ValidationError[];
// new: parse/import Diagnostics + checker findings). Matching key is the
// message text — ported messages are verbatim, spans are EXPECTED to move
// (that is TM-3's point). One normalization, stated:
//   N1: the pipeline resolver's imports/duplicate-name message carries the
//       legacy suggestion folded in ("; use an alias to avoid naming
//       conflicts", import-resolver.ts port note); it is stripped before
//       matching. imports/* are non-verdict-moving by TM-3 design.
//
// Every unmatched record (either direction) must classify into exactly one
// A1-A11 amendment-table row (§4, incl. the authorized A10/A11 amendment),
// each rule cause-linked:
//   A1 Class-imports → semantics/illegal-continuation; declared-Class import
//      lists no longer exist (ClassNode has no imports): the warning itself,
//      vanished legacy errors from Class imports, and cascades whose names
//      are the class or its imported names;
//   A2 PR #18 manifest classes now diagnosed: syntax/* diagnostics on
//      manifest-listed lines, plus cascades from entities that exist on one
//      side only because a manifest-listed line parsed there (legacy-only:
//      mangled-line entities like classfile-trailing-colon; the manifest is
//      committed as scripts/pr18-corpus-manifest.json, byte-identical to
//      `git show bef489e`);
//   A3 legacy-longform-gap + legacy-silent-drop entities now exist: cascades
//      whose delta names are new-only entities (TM-3 Q5 substrate classes);
//   A4 scenario-58 lookahead ClassFile carries exports/imports first-class
//      (and the ClassFile kind exempts it from Class-only checks): cascades
//      from lookahead-converted ClassFiles, scenario-58 only;
//   A5 empty strings parse: scenario-52's new-only entities/verdicts from
//      empty-quoted forms;
//   A6 originated duplicate coverage: every checker/duplicate-name surplus
//      and every legacy duplicate-message deficit (count/shape drift from the
//      per-declaration originated check). CENSUS FROZEN FROM THIS OUTPUT;
//   A7 parse-time semantics surface in check(): semantics/extra-input-dto and
//      semantics/dependency-direct-consumption warnings, and the legacy
//      "Cannot directly consume dependency" errors the F4 resolution replaced;
//   A8 semantics/orphan-continuation warnings. CENSUS FROZEN FROM THIS OUTPUT
//      (an attested zero-file census is acceptable);
//   A9 scenario-54 leading-digit narrowing: syntax/* and legacy-only-entity
//      cascades in scenario-54 (the opposite direction from A2);
//   A10 illegal-continuation general class (TM-3 FAQ Q7 / §3.3, F3; §4 row
//      A10, amendment authorized 2026-08-26): semantics/illegal-continuation
//      warnings whose label is NOT A1's Class-imports instance. The census is
//      FROZEN and EXACT-COUNT attested (A10_ATTESTED_CENSUS below, 44
//      records / 9 files) — a count drift in either direction fails the run;
//   A11 declared-containedBy-only validation (§1 FID-4; §4 row A11, same
//      amendment): scenario-21-aliased-import legacy-only "references unknown
//      parent" errors from legacy's alias-unprefixed DERIVED containedBy
//      entries; the declared-only port drops them. EXACT-COUNT attested
//      (3 records).
// Anything else = unlisted delta = defect: stop-and-report, exit 1.
// Full A10/A11 rationale + verification evidence: the §4 table rows in
// knowledge/projects/typedmind/rfc-tm-4-diamond.md (claude-home).

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AstValidator } from '../src/checker/ast-validator.ts';
import { DSLChecker } from '../src/index.ts';
import { ImportResolver } from '../src/pipeline/import-resolver.ts';
import { computeLinks } from '../src/pipeline/link-index.ts';
import { TypedMindParser } from '../src/pipeline/typed-mind-parser.ts';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = join(SCRIPT_DIR, '..');
const REPO_ROOT = join(PACKAGE_DIR, '..', '..');
const WASM_PATH = join(PACKAGE_DIR, 'grammar', 'grammar.wasm');
const MANIFEST_PATH = join(SCRIPT_DIR, 'pr18-corpus-manifest.json');

const CORPUS_ROOTS = [
  'lib/typed-mind-test-suite/scenarios',
  'lib/typed-mind-static-website/snippets',
  'lib/typed-mind-static-website/snippets-supplementary',
];
const EXTRA_INPUTS = ['naming-edge-cases-example.tmd'];

// §4 rows A10/A11 (amendment authorized 2026-08-26): frozen, EXACT-COUNT
// attested censuses. Any drift — either direction — is a failing run; do not
// widen these to make the harness green.
const A10_ATTESTED_CENSUS = new Map([
  ['lib/typed-mind-static-website/snippets-supplementary/constants-longform.tmd', 3],
  ['lib/typed-mind-static-website/snippets-supplementary/function-longform.tmd', 4],
  ['lib/typed-mind-test-suite/scenarios/scenario-17-multiple-programs.tmd', 1],
  ['lib/typed-mind-test-suite/scenarios/scenario-32-spa-react-app.tmd', 2],
  ['lib/typed-mind-test-suite/scenarios/scenario-35-video-game.tmd', 18],
  ['lib/typed-mind-test-suite/scenarios/scenario-55-common-validation-mistakes.tmd', 1],
  ['lib/typed-mind-test-suite/scenarios/scenario-57-import-export-confusion.tmd', 1],
  ['lib/typed-mind-test-suite/scenarios/scenario-60-constants-schema-validation.tmd', 1],
  ['naming-edge-cases-example.tmd', 13],
]);
const A11_ATTESTED_CENSUS = new Map([['lib/typed-mind-test-suite/scenarios/scenario-21-aliased-import.tmd', 3]]);

const censusMismatches = (attested, observed) => {
  const mismatches = [];
  for (const [file, expected] of attested) {
    const actual = observed.get(file) ?? 0;
    if (actual !== expected) {
      mismatches.push(`${file}: expected ${expected}, observed ${actual}`);
    }
  }
  for (const [file, actual] of observed) {
    if (!attested.has(file)) {
      mismatches.push(`${file}: expected 0, observed ${actual}`);
    }
  }
  return mismatches;
};

const walkTmd = (dir, out) => {
  for (const entry of readdirSync(join(REPO_ROOT, dir), { withFileTypes: true })) {
    const rel = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTmd(rel, out);
    } else if (entry.name.endsWith('.tmd')) {
      out.push(rel);
    }
  }
};

const enumerateCorpus = () => {
  const files = [];
  for (const root of CORPUS_ROOTS) {
    walkTmd(root, files);
  }
  files.sort();
  for (const extra of EXTRA_INPUTS) {
    files.push(extra);
  }
  return files;
};

// ---------- the two stacks ----------

const mutedConsoleError = (run) => {
  const original = console.error;
  console.error = () => {};
  try {
    return run();
  } finally {
    console.error = original;
  }
};

const runLegacy = (content, absPath) => {
  const result = mutedConsoleError(() => new DSLChecker().check(content, absPath));
  // Fresh checker for the merged-graph view: the legacy ImportResolver's
  // per-instance path cache stores alias-PREFIXED clones, so a second
  // resolution on the same instance cross-contaminates aliases.
  const merged = mutedConsoleError(() => new DSLChecker().parse(content, absPath));
  return {
    records: result.errors.map((error) => ({
      side: 'legacy',
      message: error.message,
      severity: error.severity,
      line: error.position?.line ?? 0,
    })),
    mergedEntities: merged.entities,
  };
};

const runNew = (parser, content, absPath) => {
  const outcome = parser.parse(content);
  const entities = [...outcome.entities];
  const diagnostics = [...outcome.diagnostics];
  if (outcome.imports.length > 0) {
    const resolver = new ImportResolver(parser);
    const resolved = resolver.resolveImports(outcome.imports, dirname(absPath));
    entities.push(...resolved.resolvedEntities.values());
    diagnostics.push(...resolved.diagnostics);
  }
  const links = computeLinks(entities);
  const validation = new AstValidator().validate({ entities, imports: outcome.imports, diagnostics }, links);
  const records = [
    ...diagnostics.map((diagnostic) => ({
      side: 'new',
      code: diagnostic.code,
      message: diagnostic.message,
      severity: diagnostic.severity,
      line: diagnostic.span.start.line,
      endLine: diagnostic.span.end.line,
    })),
    ...validation.findings.map((finding) => ({
      side: 'new',
      code: finding.code,
      message: finding.message,
      severity: finding.severity,
      line: finding.span.start.line,
    })),
  ];
  return { records, entities, links, localEntities: outcome.entities };
};

// ---------- matching ----------

// N1 (header): strip the folded alias suggestion from the pipeline resolver's
// duplicate-name message so it matches the legacy split message/suggestion.
const normalizeMessage = (message) => {
  return message.replace(/; use an alias to avoid naming conflicts$/, '');
};

const unmatchedRecords = (legacyRecords, newRecords) => {
  const pool = new Map();
  for (const record of legacyRecords) {
    const key = normalizeMessage(record.message);
    const bucket = pool.get(key) ?? [];
    bucket.push(record);
    pool.set(key, bucket);
  }
  const newOnly = [];
  for (const record of newRecords) {
    const key = normalizeMessage(record.message);
    const bucket = pool.get(key);
    if (bucket !== undefined && bucket.length > 0) {
      bucket.pop();
    } else {
      newOnly.push(record);
    }
  }
  const legacyOnly = [...pool.values()].flat();
  return { legacyOnly, newOnly };
};

// ---------- classification ----------

const buildManifestIndex = (manifest) => {
  const byFile = new Map();
  for (const [file, entries] of Object.entries(manifest.files)) {
    const lines = new Set();
    for (const entry of entries) {
      if (entry.class === 'parses') {
        continue;
      }
      for (const line of entry.lines) {
        lines.add(line);
      }
    }
    byFile.set(file, lines);
  }
  return byFile;
};

const quotedNames = (message) => {
  return [...message.matchAll(/'([^']+)'/g)].map((match) => match[1]);
};

// Forward-reference scan used for orphan-cascade attribution: which entities
// on this SIDE reference `name` through the orphan check's referenced-set
// fields (imports/calls/methods/entry/program-exports/consumes/input/output/
// contains/containsProgram — validator.ts:245-311).
const referencersOf = (name, entitiesIterable, fieldOf) => {
  const referencers = [];
  for (const entity of entitiesIterable) {
    const fields = fieldOf(entity);
    const pools = [fields.imports, fields.calls, fields.methods, fields.consumes, fields.contains, fields.programExports, fields.scalars];
    if (pools.some((pool) => (pool ?? []).includes(name))) {
      referencers.push(fields.name);
    }
  }
  return referencers;
};

const legacyFieldsOf = (entity) => {
  return {
    name: entity.name,
    imports: entity.imports,
    calls: entity.calls,
    methods: entity.methods,
    consumes: entity.consumes,
    contains: entity.contains,
    programExports: entity.type === 'Program' ? entity.exports : undefined,
    scalars: [entity.entry, entity.input, entity.output, entity.containsProgram].filter((value) => value !== undefined),
  };
};

const newFieldsOf = (entity) => {
  return {
    name: entity.name,
    imports: entity.imports,
    calls: entity.calls,
    methods: entity.methods,
    consumes: entity.consumes,
    contains: entity.contains,
    programExports: entity.kind === 'Program' ? entity.exports : undefined,
    scalars: [entity.entry, entity.input, entity.output, entity.containsProgram].filter((value) => value !== undefined),
  };
};

const classifyFile = (file, delta, causes) => {
  const isScenario54 = file.includes('scenario-54');
  const isScenario52 = file.includes('scenario-52');
  const isScenario58 = file.includes('scenario-58');

  const attributeNames = (names) => {
    const relevant = names.filter(
      (name) => causes.a1Names.has(name) || causes.newOnly.has(name) || causes.legacyOnly.has(name) || causes.convertedCascade.has(name),
    );
    if (relevant.length === 0) {
      return undefined;
    }
    if (relevant.some((name) => causes.a1Names.has(name))) {
      return 'A1';
    }
    if (isScenario58 && relevant.some((name) => causes.convertedCascade.has(name))) {
      return 'A4';
    }
    if (relevant.some((name) => causes.newOnly.has(name))) {
      return isScenario52 ? 'A5' : 'A3';
    }
    if (relevant.some((name) => causes.legacyOnly.has(name))) {
      return isScenario54 ? 'A9' : 'A2';
    }
    return undefined;
  };

  // Second-order cause attribution: a verdict can move because a DIFFERENT
  // entity gained/lost the graph edge that produced it. Each helper computes
  // the entities carrying the relevant edge per side; the DIFF names the cause
  // and is fed back through attributeNames.
  const symmetricDiff = (leftNames, rightNames) => {
    return [...leftNames.filter((name) => !rightNames.includes(name)), ...rightNames.filter((name) => !leftNames.includes(name))];
  };
  const referencerDiff = (name) => {
    return symmetricDiff(causes.legacyReferencersOf(name), causes.newReferencersOf(name));
  };
  const escapeProviderDiff = (name) => {
    // For not-exported errors (validator.ts:804-845): the escape rides the
    // methods and exports sets, so the movers are the entities listing the
    // name there on exactly one side.
    return symmetricDiff(causes.legacyEscapeProvidersOf(name), causes.newEscapeProvidersOf(name));
  };
  const secondOrderAttribution = (record) => {
    const names = quotedNames(record.message);
    if (names.length === 0) {
      return undefined;
    }
    if (/ is not exported by any file/.test(record.message)) {
      const viaProviders = attributeNames(escapeProviderDiff(names[0]));
      if (viaProviders !== undefined) {
        return viaProviders;
      }
    }
    for (const name of names) {
      const viaReferencers = attributeNames(referencerDiff(name));
      if (viaReferencers !== undefined) {
        return viaReferencers;
      }
    }
    return undefined;
  };

  const classified = [];
  for (const record of delta.newOnly) {
    const code = record.code ?? '';
    let assigned;
    if (code.startsWith('syntax/')) {
      const spanLines = [];
      for (let line = record.line; line <= (record.endLine ?? record.line); line += 1) {
        spanLines.push(line);
      }
      const onManifestLine = spanLines.some((line) => causes.manifestLines.has(line));
      assigned = isScenario54 ? 'A9' : onManifestLine ? 'A2' : undefined;
    } else if (code === 'semantics/illegal-continuation') {
      // A1's cause names EXACTLY the Class-imports instance (§4); every other
      // illegal-continuation label is the A10 general class (same TM-3
      // F3/FAQ-Q7 family), exact-count attested against A10_ATTESTED_CENSUS
      // after the corpus loop.
      assigned = /^illegal continuation: imports list \(`<- \[\.\.\.\]`\) cannot attach to a Class entity$/.test(record.message)
        ? 'A1'
        : 'A10';
    } else if (code === 'semantics/orphan-continuation') {
      assigned = 'A8';
    } else if (code === 'semantics/extra-input-dto' || code === 'semantics/dependency-direct-consumption') {
      assigned = 'A7';
    } else if (code === 'checker/duplicate-name') {
      assigned = 'A6';
    } else {
      assigned = attributeNames(quotedNames(record.message)) ?? secondOrderAttribution(record);
    }
    classified.push({ ...record, file, class: assigned });
  }
  for (const record of delta.legacyOnly) {
    let assigned;
    if (/^Cannot directly consume dependency '/.test(record.message)) {
      assigned = 'A7';
    } else if (file.includes('scenario-21-aliased-import') && / references unknown parent '/.test(record.message)) {
      // A11 (§4, FID-4): legacy's derived-containedBy entries dangle across
      // aliased imports; the declared-only port drops the spurious errors.
      // File-gated to the attested census; exact-count checked after the loop.
      assigned = 'A11';
    } else if (
      /^Duplicate entity name '/.test(record.message) ||
      / is used by both a File and a Class/.test(record.message) ||
      / conflicts with imported entity$/.test(record.message)
      // The third shape is the index.ts:118 facade error, folded into the
      // originated duplicate check (§1, FID-12) — its A6 deficit twin.
    ) {
      assigned = 'A6';
    } else {
      assigned = attributeNames(quotedNames(record.message)) ?? secondOrderAttribution(record);
    }
    classified.push({ ...record, file, class: assigned });
  }
  return classified;
};

// ---------- main ----------

const main = async () => {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const manifestIndex = buildManifestIndex(manifest);
  const corpus = enumerateCorpus();
  if (corpus.length !== 142) {
    throw new Error(`corpus enumeration produced ${corpus.length} files, expected 142`);
  }
  const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });

  const classCounts = new Map();
  const classFiles = new Map();
  const classFileCounts = new Map();
  const unlisted = [];
  let convergedClean = 0;
  let filesWithAuthorized = 0;

  for (const file of corpus) {
    const absPath = join(REPO_ROOT, file);
    const content = readFileSync(absPath, 'utf8');
    const legacy = runLegacy(content, absPath);
    const fresh = runNew(parser, content, absPath);
    const delta = unmatchedRecords(legacy.records, fresh.records);

    // Cause sets for cascade attribution.
    const legacyNames = new Set(legacy.mergedEntities.keys());
    const newByName = new Map();
    for (const entity of fresh.entities) {
      newByName.set(entity.name, entity);
    }
    const a1Names = new Set();
    for (const [name, entity] of legacy.mergedEntities) {
      if (entity.type === 'Class' && (entity.imports ?? []).length > 0) {
        a1Names.add(name);
        for (const imported of entity.imports) {
          a1Names.add(imported);
        }
      }
    }
    const convertedCascade = new Set();
    for (const [name, entity] of newByName) {
      if (entity.kind === 'ClassFile' && !entity.raw.includes('#:')) {
        convertedCascade.add(name);
        for (const member of [...(entity.imports ?? []), ...(entity.exports ?? [])]) {
          convertedCascade.add(member);
        }
      }
    }
    const causes = {
      manifestLines: manifestIndex.get(file) ?? new Set(),
      a1Names,
      convertedCascade,
      newOnly: new Set([...newByName.keys()].filter((name) => !legacyNames.has(name))),
      legacyOnly: new Set([...legacyNames].filter((name) => !newByName.has(name))),
      legacyReferencersOf: (name) => referencersOf(name, legacy.mergedEntities.values(), legacyFieldsOf),
      newReferencersOf: (name) => referencersOf(name, newByName.values(), newFieldsOf),
      legacyEscapeProvidersOf: (name) =>
        [...legacy.mergedEntities.values()]
          .filter((entity) => (entity.methods ?? []).includes(name) || (entity.exports ?? []).includes(name))
          .map((entity) => entity.name),
      newEscapeProvidersOf: (name) =>
        [...newByName.values()]
          .filter((entity) => (entity.methods ?? []).includes(name) || (entity.exports ?? []).includes(name))
          .map((entity) => entity.name),
    };

    const classified = classifyFile(file, delta, causes);
    if (classified.length === 0) {
      convergedClean += 1;
    } else if (classified.every((record) => record.class !== undefined)) {
      filesWithAuthorized += 1;
    }
    for (const record of classified) {
      if (record.class === undefined) {
        unlisted.push(record);
      } else {
        classCounts.set(record.class, (classCounts.get(record.class) ?? 0) + 1);
        const bucket = classFiles.get(record.class) ?? new Set();
        bucket.add(file);
        classFiles.set(record.class, bucket);
        const perFile = classFileCounts.get(record.class) ?? new Map();
        perFile.set(file, (perFile.get(file) ?? 0) + 1);
        classFileCounts.set(record.class, perFile);
        if (process.env.Q1_DUMP_AUTHORIZED === '1') {
          console.log(`  AUTHORIZED[${record.class}] ${file} :: ${record.side} :: L${record.line} :: ${record.message}`);
        }
      }
    }
  }

  console.log(`[q1-verdict] documents: ${corpus.length}`);
  console.log(`[q1-verdict] converged clean (zero verdict deltas): ${convergedClean}`);
  console.log(`[q1-verdict] files with only A1-A11-classified deltas: ${filesWithAuthorized}`);
  console.log('[q1-verdict] classified delta records by amendment row (records / files):');
  for (const [amendmentClass, count] of [...classCounts.entries()].sort()) {
    console.log(`  ${amendmentClass}: ${count} / ${classFiles.get(amendmentClass)?.size ?? 0}`);
  }
  for (const censusRow of ['A6', 'A8']) {
    const files = [...(classFiles.get(censusRow) ?? [])].sort();
    console.log(`[q1-verdict] ${censusRow} census (${files.length} files) — FROZEN into the §4 table:`);
    for (const file of files) {
      console.log(`  ${censusRow}: ${file}`);
    }
  }
  const attestationFailures = [
    ...censusMismatches(A10_ATTESTED_CENSUS, classFileCounts.get('A10') ?? new Map()).map((line) => `A10 ${line}`),
    ...censusMismatches(A11_ATTESTED_CENSUS, classFileCounts.get('A11') ?? new Map()).map((line) => `A11 ${line}`),
  ];
  console.log(`[q1-verdict] A10/A11 exact-count attestation mismatches: ${attestationFailures.length}`);
  for (const failure of attestationFailures) {
    console.log(`  ATTESTATION MISMATCH ${failure}`);
  }
  console.log(`[q1-verdict] unlisted deltas: ${unlisted.length}`);
  for (const record of unlisted.slice(0, 120)) {
    console.log(`  UNLISTED ${record.file} :: ${record.side} :: ${record.code ?? '-'} :: L${record.line} :: ${record.message}`);
  }
  if (unlisted.length > 0 || attestationFailures.length > 0) {
    process.exitCode = 1;
    return;
  }
  console.log('[q1-verdict] RESULT: A1-A11-clean (zero unlisted verdict deltas over 142 documents; A10/A11 censuses exact)');
};

await main();
