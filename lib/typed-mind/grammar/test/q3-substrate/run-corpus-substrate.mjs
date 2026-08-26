#!/usr/bin/env node
// RFC-TM-2 Q3 (rfc-tm-2-diamond.md §3, §4 "Q3 — Corpus proof + closure").
//
// Quantum-local throwaway validation substrate (sanctioned by
// `quantum_validation_substrate_is_in_scope_by_construction`). Parses all 141
// corpus documents (68 scenarios + 7 scenarios/imports + 38 snippets + 28
// snippets-supplementary) PLUS the one explicit extra input
// (naming-edge-cases-example.tmd, examples inventory) with the built grammar,
// and checks each file's ERROR/MISSING node set against the checked-in
// expected-ERROR manifest (corpus-manifest.json). A document producing
// ERROR/MISSING nodes not named in its manifest entry, or missing an expected
// one, fails the substrate.
//
// This script and its manifest are DELETED in the same PR that lands them
// (doc §3: "never part of `validate`"); output is recorded in the PR body.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const GRAMMAR_DIR = join(SCRIPT_DIR, '..', '..');
const REPO_ROOT = join(GRAMMAR_DIR, '..', '..', '..');
const MANIFEST_PATH = join(SCRIPT_DIR, 'corpus-manifest.json');

const CORPUS_ROOTS = [
  'lib/typed-mind-test-suite/scenarios',
  'lib/typed-mind-static-website/snippets',
  'lib/typed-mind-static-website/snippets-supplementary',
];
const EXTRA_INPUTS = ['naming-edge-cases-example.tmd'];

class SubstrateError extends Error {}

const run = (command, args, options = {}) => execFileSync(command, args, { encoding: 'utf8', cwd: REPO_ROOT, ...options });

const resolveTreeSitterBin = () => {
  const installDir = run('mise', ['where', 'tree-sitter']).trim();
  if (!installDir) throw new SubstrateError('mise where tree-sitter returned empty output');
  const binPath = join(installDir, 'tree-sitter');
  if (!existsSync(binPath)) throw new SubstrateError(`tree-sitter binary not found at ${binPath}`);
  return binPath;
};

const resolveWasiSdkPath = () => {
  const wasiSdkPath = run('mise', ['where', 'http:wasi-sdk']).trim();
  if (!wasiSdkPath) throw new SubstrateError('mise where http:wasi-sdk returned empty output');
  return wasiSdkPath;
};

// Enumerate the corpus: every .tmd under the three roots (recursive — the
// scenarios root includes the imports/ subdirectory: 68 top-level scenarios
// + 7 files under imports/{circular,shared,ui}), plus the explicit extras.
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
  for (const root of CORPUS_ROOTS) walkTmd(root, files);
  files.sort();
  for (const extra of EXTRA_INPUTS) files.push(extra);
  return files;
};

// Parse a tree-sitter S-expression dump into a list of { kind, startRow,
// startCol, endRow, endCol, depth } for every ERROR and MISSING node —
// nested occurrences included, so the manifest can be checked against
// either "any ERROR/MISSING node touches this line" (line-level) semantics.
// MISSING nodes are rendered inline as `(MISSING kind [row, col])` (a point
// range) by the tree-sitter CLI; ERROR nodes carry a full range.
const parseErrorNodes = (sexpr) => {
  const nodes = [];
  const errorRe = /\(ERROR \[(\d+), (\d+)\] - \[(\d+), (\d+)\]/g;
  const missingRe = /\(MISSING \S+ \[(\d+), (\d+)\]\)/g;
  for (const m of sexpr.matchAll(errorRe)) {
    nodes.push({ kind: 'ERROR', startRow: Number(m[1]), startCol: Number(m[2]), endRow: Number(m[3]), endCol: Number(m[4]) });
  }
  for (const m of sexpr.matchAll(missingRe)) {
    nodes.push({ kind: 'MISSING', startRow: Number(m[1]), startCol: Number(m[2]), endRow: Number(m[1]), endCol: Number(m[2]) });
  }
  return nodes;
};

// Collapse nested ERROR ranges: an ERROR node that is fully contained inside
// another ERROR node's range is reporting the same defect twice (tree-sitter
// nests ERROR nodes when recovery re-enters error state inside an outer
// error span). We report per-file: the set of DISTINCT SOURCE LINES (1-based)
// that carry at least one ERROR/MISSING node start. This is what the
// manifest keys on — one entry per offending line, not per raw node.
const linesWithErrors = (nodes) => {
  const lines = new Set();
  for (const n of nodes) lines.add(n.startRow + 1); // tree-sitter rows are 0-based
  return [...lines].sort((a, b) => a - b);
};

const main = () => {
  const treeSitterBin = resolveTreeSitterBin();
  const wasiSdkPath = resolveWasiSdkPath();
  const wasmEnv = { ...process.env, TREE_SITTER_WASI_SDK_PATH: wasiSdkPath };

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const manifestFiles = manifest.files;

  const corpus = enumerateCorpus();
  console.log(
    `[q3-substrate] enumerated ${corpus.length} documents (expected 142: 68 scenarios + 7 imports + 38 snippets + 28 snippets-supplementary + 1 extra input)`,
  );
  if (corpus.length !== 142) {
    throw new SubstrateError(`corpus enumeration produced ${corpus.length} files, expected 142`);
  }

  const results = [];
  let unexpectedTotal = 0;

  for (const relPath of corpus) {
    const absPath = join(REPO_ROOT, relPath);
    let sexpr;
    let parseFailed = false;
    try {
      sexpr = run(treeSitterBin, ['parse', '-p', GRAMMAR_DIR, '--wasm', absPath], { env: wasmEnv });
    } catch (error) {
      // tree-sitter parse exits nonzero when the parse tree contains an
      // ERROR node — this is expected for negative-test documents, so we
      // still want stdout (the tree) rather than treating this as fatal.
      if (typeof error.stdout === 'string' && error.stdout.length > 0) {
        sexpr = error.stdout;
      } else {
        parseFailed = true;
        sexpr = '';
      }
    }

    const nodes = parseErrorNodes(sexpr);
    const observedLines = linesWithErrors(nodes);
    const expectedEntries = manifestFiles[relPath] ?? [];
    const expectedErrorLines = expectedEntries
      .filter((e) => e.class !== 'parses')
      .flatMap((e) => e.lines)
      .sort((a, b) => a - b);

    const unexpectedLines = observedLines.filter((l) => !expectedErrorLines.includes(l));
    const missingExpectedLines = expectedErrorLines.filter((l) => !observedLines.includes(l));

    const clean = unexpectedLines.length === 0 && missingExpectedLines.length === 0;
    if (!clean) unexpectedTotal += unexpectedLines.length + missingExpectedLines.length;

    results.push({
      file: relPath,
      expectedErrorCount: expectedErrorLines.length,
      observedErrorLineCount: observedLines.length,
      observedErrorLines: observedLines,
      unexpectedLines,
      missingExpectedLines,
      parseFailed,
      clean,
    });
  }

  console.log('');
  console.log('| File | Expected | Observed | Unexpected | Missing-expected | Status |');
  console.log('|---|---|---|---|---|---|');
  for (const r of results) {
    const status = r.clean ? 'OK' : 'FAIL';
    console.log(
      `| ${r.file} | ${r.expectedErrorCount} | ${r.observedErrorLineCount} | ${r.unexpectedLines.join(',') || '-'} | ${r.missingExpectedLines.join(',') || '-'} | ${status} |`,
    );
  }

  const failing = results.filter((r) => !r.clean);
  console.log('');
  console.log(
    `[q3-substrate] ${results.length} documents checked; ${failing.length} manifest mismatches; ${unexpectedTotal} total unexpected/missing lines`,
  );

  if (failing.length > 0) {
    console.error('[q3-substrate] FAIL: manifest mismatches found');
    for (const r of failing) {
      console.error(`  ${r.file}: unexpected=[${r.unexpectedLines.join(',')}] missing-expected=[${r.missingExpectedLines.join(',')}]`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('[q3-substrate] PASS: manifest-clean across all 142 documents');
};

try {
  main();
} catch (error) {
  console.error(`[q3-substrate] FAIL: ${error.message}`);
  if (error.stdout) console.error(error.stdout.toString());
  if (error.stderr) console.error(error.stderr.toString());
  process.exit(1);
}
