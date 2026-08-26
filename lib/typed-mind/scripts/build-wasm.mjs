#!/usr/bin/env node
// RFC-TM-3 §4 (rfc-tm-3-diamond.md) — the pretest wasm build.
// Builds lib/typed-mind/grammar/grammar.wasm (gitignored, never committed) via
// the same mise-resolved tree-sitter CLI + TREE_SITTER_WASI_SDK_PATH env as
// scripts/check-generated.mjs, so local `pnpm test` and CI run the identical
// step. Skips the build when the existing wasm is newer than grammar.js and
// everything under grammar/src/.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = dirname(SCRIPTS_DIR);
const GRAMMAR_DIR = join(PACKAGE_DIR, 'grammar');
const WASM_PATH = join(GRAMMAR_DIR, 'grammar.wasm');

class WasmBuildError extends Error {}

const run = (command, args, options = {}) => {
  return execFileSync(command, args, { encoding: 'utf8', ...options });
};

const newestInputMtimeMs = () => {
  const inputPaths = [join(GRAMMAR_DIR, 'grammar.js')];
  const srcDir = join(GRAMMAR_DIR, 'src');
  const stack = [srcDir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else {
        inputPaths.push(entryPath);
      }
    }
  }
  let newest = 0;
  for (const inputPath of inputPaths) {
    const mtimeMs = statSync(inputPath).mtimeMs;
    if (mtimeMs > newest) {
      newest = mtimeMs;
    }
  }
  return newest;
};

const main = () => {
  if (!existsSync(join(GRAMMAR_DIR, 'grammar.js'))) {
    throw new WasmBuildError(`grammar.js not found under ${GRAMMAR_DIR}`);
  }
  if (existsSync(WASM_PATH) && statSync(WASM_PATH).mtimeMs > newestInputMtimeMs()) {
    console.log('[build-wasm] grammar.wasm is newer than grammar.js/src/ — skipping build');
    return;
  }
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
    cwd: GRAMMAR_DIR,
    env: { ...process.env, TREE_SITTER_WASI_SDK_PATH: wasiSdkPath },
  });
  if (!existsSync(WASM_PATH) || statSync(WASM_PATH).size === 0) {
    throw new WasmBuildError('tree-sitter build --wasm exited 0 but produced no nonempty grammar.wasm');
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
