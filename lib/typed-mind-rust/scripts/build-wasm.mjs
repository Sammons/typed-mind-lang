#!/usr/bin/env node
// Build tree-sitter-rust.wasm from the npm grammar package.
// Pattern: lib/typed-mind/scripts/build-wasm.mjs adapted for an npm grammar
// source (tree-sitter-rust) rather than a vendored grammar directory.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = dirname(SCRIPTS_DIR);
const GRAMMAR_DIR = join(PACKAGE_DIR, 'grammar');
const WASM_PATH = join(GRAMMAR_DIR, 'tree-sitter-rust.wasm');

// The npm grammar package root — tree-sitter-rust ships grammar.js + src/.
const NPM_GRAMMAR_DIR = join(PACKAGE_DIR, 'node_modules', 'tree-sitter-rust');

class WasmBuildError extends Error {}

const run = (command, args, options = {}) => {
  return execFileSync(command, args, { encoding: 'utf8', ...options });
};

const main = () => {
  if (!existsSync(NPM_GRAMMAR_DIR)) {
    throw new WasmBuildError(`tree-sitter-rust not found at ${NPM_GRAMMAR_DIR} — run pnpm install first`);
  }

  if (!existsSync(join(NPM_GRAMMAR_DIR, 'grammar.js'))) {
    throw new WasmBuildError(`grammar.js not found in tree-sitter-rust package at ${NPM_GRAMMAR_DIR}`);
  }

  // Skip rebuild when wasm is newer than the grammar package.
  if (existsSync(WASM_PATH)) {
    const wasmMtime = statSync(WASM_PATH).mtimeMs;
    const grammarJsMtime = statSync(join(NPM_GRAMMAR_DIR, 'grammar.js')).mtimeMs;
    if (wasmMtime > grammarJsMtime) {
      console.log('[build-wasm] tree-sitter-rust.wasm is up to date — skipping build');
      return;
    }
  }

  mkdirSync(GRAMMAR_DIR, { recursive: true });

  const treeSitterInstallDir = run('mise', ['where', 'tree-sitter']).trim();
  if (treeSitterInstallDir === '') {
    throw new WasmBuildError('mise where tree-sitter returned empty output — run mise install first');
  }
  const treeSitterBin = join(treeSitterInstallDir, 'tree-sitter');

  const wasiSdkPath = run('mise', ['where', 'http:wasi-sdk']).trim();
  if (wasiSdkPath === '') {
    throw new WasmBuildError('mise where http:wasi-sdk returned empty output — run mise install first');
  }

  run(treeSitterBin, ['build', '--wasm', '.', '--output', WASM_PATH], {
    cwd: NPM_GRAMMAR_DIR,
    env: { ...process.env, TREE_SITTER_WASI_SDK_PATH: wasiSdkPath },
  });

  if (!existsSync(WASM_PATH) || statSync(WASM_PATH).size === 0) {
    throw new WasmBuildError('tree-sitter build --wasm exited 0 but produced no nonempty tree-sitter-rust.wasm');
  }

  console.log(`[build-wasm] built ${WASM_PATH} (${statSync(WASM_PATH).size} bytes)`);
};

try {
  main();
} catch (error) {
  if (error instanceof WasmBuildError) {
    console.error(`[build-wasm] FAIL: ${error.message}`);
  } else {
    console.error('[build-wasm] FAIL:', error);
  }
  process.exit(1);
}
