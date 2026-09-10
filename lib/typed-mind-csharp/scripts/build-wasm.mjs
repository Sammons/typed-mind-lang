#!/usr/bin/env node

// Provides grammar/tree-sitter-c_sharp.wasm for web-tree-sitter.
// Strategy: copy the pre-built .wasm from tree-sitter-c-sharp@0.23.5 if
// present; fall back to building from source via `tree-sitter build --wasm`.

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = dirname(SCRIPTS_DIR);
const GRAMMAR_DIR = join(PACKAGE_DIR, 'grammar');
const WASM_PATH = join(GRAMMAR_DIR, 'tree-sitter-c_sharp.wasm');

class WasmBuildError extends Error {}

const run = (command, args, options = {}) => {
  return execFileSync(command, args, { encoding: 'utf8', ...options });
};

const resolveNpmPackageDir = () => {
  const candidates = [
    join(PACKAGE_DIR, 'node_modules', 'tree-sitter-c-sharp'),
    join(PACKAGE_DIR, '..', '..', 'node_modules', 'tree-sitter-c-sharp'),
    join(PACKAGE_DIR, '..', '..', 'node_modules', '.pnpm', 'node_modules', 'tree-sitter-c-sharp'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
};

const main = () => {
  mkdirSync(GRAMMAR_DIR, { recursive: true });

  if (existsSync(WASM_PATH) && statSync(WASM_PATH).size > 0) {
    console.log('[build-wasm] tree-sitter-c_sharp.wasm already exists — skipping');
    return;
  }

  const npmDir = resolveNpmPackageDir();

  // Strategy 1: copy pre-built wasm from npm package
  if (npmDir !== undefined) {
    const prebuiltWasm = join(npmDir, 'tree-sitter-c_sharp.wasm');
    if (existsSync(prebuiltWasm) && statSync(prebuiltWasm).size > 0) {
      copyFileSync(prebuiltWasm, WASM_PATH);
      console.log(`[build-wasm] copied pre-built wasm from npm package (${statSync(WASM_PATH).size} bytes)`);
      return;
    }
  }

  // Strategy 2: build from source using tree-sitter CLI
  if (npmDir === undefined || !existsSync(join(npmDir, 'grammar.js'))) {
    throw new WasmBuildError('tree-sitter-c-sharp package not found — run pnpm install first');
  }

  console.log(`[build-wasm] no pre-built wasm found, building from source at ${npmDir}`);

  const treeSitterInstallDir = run('mise', ['where', 'tree-sitter']).trim();
  if (treeSitterInstallDir === '') {
    throw new WasmBuildError('mise where tree-sitter returned empty output — run mise install first');
  }
  const treeSitterBin = join(treeSitterInstallDir, 'tree-sitter');

  const wasiSdkPath = run('mise', ['where', 'http:wasi-sdk']).trim();
  if (wasiSdkPath === '') {
    throw new WasmBuildError('mise where http:wasi-sdk returned empty output — run mise install first');
  }

  run(treeSitterBin, ['build', '--wasm', npmDir, '--output', WASM_PATH], {
    cwd: GRAMMAR_DIR,
    env: { ...process.env, TREE_SITTER_WASI_SDK_PATH: wasiSdkPath },
  });

  if (!existsSync(WASM_PATH) || statSync(WASM_PATH).size === 0) {
    throw new WasmBuildError('tree-sitter build --wasm exited 0 but produced no nonempty wasm');
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
