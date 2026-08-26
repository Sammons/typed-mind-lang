#!/usr/bin/env node
// RFC-TM-2 Q0 (rfc-tm-2-diamond.md §3) — the real body of the RFC-TM-1 L4 seat
// (seat contract: check-generated.mjs must regenerate-and-diff the tree-sitter
// artifacts AND run the `tree-sitter test` grammar corpus inside `pnpm run ci`).
//
// Steps (doc §3 "check:generated replacement body"):
//   1. tree-sitter generate in lib/typed-mind/grammar/ (regenerates src/).
//   2. git diff --exit-code -- lib/typed-mind/grammar/src  (S-ARTIFACT-1 diff gate).
//   2b. RFC-TM-3 Q1 (the TM-3 extension point, realized per DAG Amendment A as
//      the src/ast/gen/ wrappers, not <Kind>Base skeletons): regenerate
//      lib/typed-mind/src/ast/gen/ from node-types.json via
//      lib/typed-mind/grammar/codegen/generate-cst-nodes.mjs, then
//      git diff --exit-code on it — the S-AST-2 diff gate.
//   3. tree-sitter test — the S-TEST-3 corpus (runs via --wasm so the gate
//      exercises the shipping artifact and needs no host C compiler).
//   4. tree-sitter build --wasm to a temp path, discarded after the exit-code
//      check — pre-merge proof the REAL grammar compiles to wasm (F-4 gap).
//   5. Assert no tracked *.wasm under lib/typed-mind/grammar/ (S-ARTIFACT-2).
//
// Toolchain resolution mirrors scripts/check-toolchain.mjs: binaries come from
// their `mise where`-resolved paths so this script's own ambient node loads
// grammar.js, and TREE_SITTER_WASI_SDK_PATH pins the wasm builds to the
// mise-provisioned SDK — the CLI's unverified auto-downloader must never fire
// (check:toolchain asserts its fallback cache dir stays empty).

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const GRAMMAR_DIR = join(REPO_ROOT, 'lib', 'typed-mind', 'grammar');
const GRAMMAR_SRC_PATHSPEC = 'lib/typed-mind/grammar/src';
const CST_GEN_PATHSPEC = 'lib/typed-mind/src/ast/gen';
const GRAMMAR_DOC_PATHSPEC = 'lib/typed-mind/grammar.md';

class GeneratedCheckError extends Error {}

const run = (command, args, options = {}) => {
  return execFileSync(command, args, { encoding: 'utf8', cwd: REPO_ROOT, ...options });
};

const resolveTreeSitterBin = () => {
  const installDir = run('mise', ['where', 'tree-sitter']).trim();
  if (!installDir) {
    throw new GeneratedCheckError('mise where tree-sitter returned empty output');
  }
  const binPath = join(installDir, 'tree-sitter');
  if (!existsSync(binPath)) {
    throw new GeneratedCheckError(`tree-sitter binary not found at ${binPath}`);
  }
  return binPath;
};

const resolveWasiSdkPath = () => {
  const wasiSdkPath = run('mise', ['where', 'http:wasi-sdk']).trim();
  if (!wasiSdkPath) {
    throw new GeneratedCheckError('mise where http:wasi-sdk returned empty output');
  }
  return wasiSdkPath;
};

const main = () => {
  if (!existsSync(join(GRAMMAR_DIR, 'grammar.js'))) {
    throw new GeneratedCheckError(`grammar.js not found at ${GRAMMAR_DIR} — the RFC-TM-2 grammar directory is the frozen path`);
  }
  const treeSitterBin = resolveTreeSitterBin();
  const wasmEnv = { ...process.env, TREE_SITTER_WASI_SDK_PATH: resolveWasiSdkPath() };

  // Step 1: regenerate src/ from grammar.js.
  run(treeSitterBin, ['generate', 'grammar.js'], { cwd: GRAMMAR_DIR });
  console.log('[check:generated] step 1: tree-sitter generate OK');

  // Step 2: committed artifacts must match what grammar.js generates.
  try {
    run('git', ['diff', '--exit-code', '--', GRAMMAR_SRC_PATHSPEC]);
  } catch {
    throw new GeneratedCheckError(
      `${GRAMMAR_SRC_PATHSPEC} drifted from grammar.js — run \`tree-sitter generate\` in ${GRAMMAR_DIR} and commit the regenerated artifacts`,
    );
  }
  console.log('[check:generated] step 2: generated artifacts match committed src/ (diff gate OK)');

  // Step 2b: the src/ast/gen/ CST wrappers must match what node-types.json
  // generates (RFC-TM-3 §2.1; same gate shape as step 2).
  run('node', [join(GRAMMAR_DIR, 'codegen', 'generate-cst-nodes.mjs')], { stdio: ['pipe', 'inherit', 'inherit'] });
  try {
    run('git', ['diff', '--exit-code', '--', CST_GEN_PATHSPEC]);
  } catch {
    throw new GeneratedCheckError(
      `${CST_GEN_PATHSPEC} drifted from node-types.json — run \`node lib/typed-mind/grammar/codegen/generate-cst-nodes.mjs\` and commit the regenerated wrappers`,
    );
  }
  console.log('[check:generated] step 2b: src/ast/gen wrappers match node-types.json (diff gate OK)');

  // Step 2c: RFC-TM-7 §1 (rfc-tm-7-diamond.md) — the grammar.md doc must
  // match what grammar.json generates (issue #7's drift-gate half; same gate
  // shape as steps 2/2b).
  run('node', [join(GRAMMAR_DIR, 'codegen', 'generate-grammar-docs.mjs')], { stdio: ['pipe', 'inherit', 'inherit'] });
  try {
    run('git', ['diff', '--exit-code', '--', GRAMMAR_DOC_PATHSPEC]);
  } catch {
    throw new GeneratedCheckError(
      `${GRAMMAR_DOC_PATHSPEC} drifted from grammar.json — run \`node lib/typed-mind/grammar/codegen/generate-grammar-docs.mjs\` and commit the regenerated doc`,
    );
  }
  console.log('[check:generated] step 2c: grammar.md matches grammar.json (diff gate OK)');

  // Step 3: the S-TEST-3 grammar corpus. --rebuild defeats the CLI's stale
  // build cache (keyed by language name, not grammar content).
  run(treeSitterBin, ['test', '--wasm', '--rebuild'], { cwd: GRAMMAR_DIR, env: wasmEnv, stdio: ['pipe', 'inherit', 'inherit'] });
  console.log('[check:generated] step 3: tree-sitter test OK');

  // Step 4: the REAL grammar must compile to wasm; output is discarded.
  const scratchDir = mkdtempSync(join(tmpdir(), 'tm-grammar-wasm-'));
  try {
    const wasmPath = join(scratchDir, 'typed_mind.wasm');
    run(treeSitterBin, ['build', '--wasm', '.', '--output', wasmPath], { cwd: GRAMMAR_DIR, env: wasmEnv });
    if (!existsSync(wasmPath) || statSync(wasmPath).size === 0) {
      throw new GeneratedCheckError('tree-sitter build --wasm exited 0 but produced no nonempty wasm');
    }
    console.log(`[check:generated] step 4: real-grammar wasm build OK (${statSync(wasmPath).size} bytes, discarded)`);
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
  }

  // Step 5: grammar.wasm is never committed — the dev-layout build output
  // (lib/typed-mind/grammar/grammar.wasm, S-ARTIFACT-2) AND the RFC-TM-4 §3
  // dist-adjacent staged copy (lib/typed-mind/grammar.wasm,
  // scripts/stage-published-wasm.mjs's prepack output) are both build
  // artifacts a fresh checkout regenerates; neither belongs in git.
  const trackedWasm = run('git', [
    'ls-files',
    'lib/typed-mind/grammar/**/*.wasm',
    'lib/typed-mind/grammar/*.wasm',
    'lib/typed-mind/grammar.wasm',
  ]).trim();
  if (trackedWasm !== '') {
    throw new GeneratedCheckError(`tracked wasm artifacts found (never commit these):\n${trackedWasm}`);
  }
  console.log('[check:generated] step 5: no tracked *.wasm under the grammar dir or the package root (OK)');

  // Step 6: RFC-TM-2 Q3 (review SD-CB-1) — the node-types completeness check.
  // Diffs the named-node set in the just-regenerated src/node-types.json
  // against the checked-in inventory (test/node-types-inventory.json, derived
  // from the doc's §1 production inventory) and fails on any mismatch in
  // either direction. Unlike the Q3 corpus substrate (deleted in the same PR
  // that lands it), this check and its inventory are PERMANENT.
  run('node', [join(GRAMMAR_DIR, 'test', 'check-node-types-completeness.mjs')], { stdio: 'inherit' });
  console.log('[check:generated] step 6: node-types completeness OK');

  console.log('[check:generated] PASS');
};

try {
  main();
} catch (error) {
  if (error instanceof GeneratedCheckError) {
    console.error(`[check:generated] FAIL: ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`[check:generated] FAIL: ${error.message}`);
    if (error.stdout) {
      console.error(error.stdout.toString());
    }
    if (error.stderr) {
      console.error(error.stderr.toString());
    }
  } else {
    console.error('[check:generated] FAIL: unknown error', error);
  }
  process.exit(1);
}
