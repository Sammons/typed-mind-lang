#!/usr/bin/env node

// Copies tree-sitter-python.wasm from the tree-sitter-python npm package into
// grammar/tree-sitter-python.wasm. The npm package ships a pre-built wasm file,
// so no tree-sitter CLI or WASI SDK is needed.
//
// If the wasm file in the npm package is incompatible with web-tree-sitter 0.27,
// fall back to building from source using the tree-sitter CLI (requires mise
// with tree-sitter and wasi-sdk installed).

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = dirname(SCRIPTS_DIR);
const GRAMMAR_DIR = join(PACKAGE_DIR, 'grammar');
const WASM_PATH = join(GRAMMAR_DIR, 'tree-sitter-python.wasm');

const require = createRequire(import.meta.url);

const main = () => {
  mkdirSync(GRAMMAR_DIR, { recursive: true });

  // Locate tree-sitter-python package
  let tsPythonDir;
  try {
    const tsPythonPkg = require.resolve('tree-sitter-python/package.json');
    tsPythonDir = dirname(tsPythonPkg);
  } catch {
    throw new Error('tree-sitter-python not found. Run pnpm install first.');
  }

  const npmWasmPath = join(tsPythonDir, 'tree-sitter-python.wasm');

  if (existsSync(npmWasmPath)) {
    // The npm package ships a pre-built wasm — copy it
    if (existsSync(WASM_PATH)) {
      const srcStat = statSync(npmWasmPath);
      const dstStat = statSync(WASM_PATH);
      if (dstStat.mtimeMs >= srcStat.mtimeMs && dstStat.size > 0) {
        console.log('[build-wasm] tree-sitter-python.wasm is up to date — skipping copy');
        return;
      }
    }
    copyFileSync(npmWasmPath, WASM_PATH);
    console.log(`[build-wasm] copied tree-sitter-python.wasm (${statSync(WASM_PATH).size} bytes)`);
    return;
  }

  // Fallback: build from source using tree-sitter CLI
  console.log('[build-wasm] no pre-built wasm found, building from source...');

  const grammarJs = join(tsPythonDir, 'grammar.js');
  if (!existsSync(grammarJs)) {
    throw new Error(`grammar.js not found at ${grammarJs}`);
  }

  const treeSitterInstallDir = execFileSync('mise', ['where', 'tree-sitter'], {
    encoding: 'utf8',
  }).trim();
  if (treeSitterInstallDir === '') {
    throw new Error('mise where tree-sitter returned empty — run mise install first');
  }

  const treeSitterBin = join(treeSitterInstallDir, 'tree-sitter');

  const wasiSdkPath = execFileSync('mise', ['where', 'http:wasi-sdk'], {
    encoding: 'utf8',
  }).trim();
  if (wasiSdkPath === '') {
    throw new Error('mise where http:wasi-sdk returned empty — run mise install first');
  }

  execFileSync(treeSitterBin, ['build', '--wasm', '.', '--output', WASM_PATH], {
    cwd: tsPythonDir,
    env: { ...process.env, TREE_SITTER_WASI_SDK_PATH: wasiSdkPath },
  });

  if (!existsSync(WASM_PATH) || statSync(WASM_PATH).size === 0) {
    throw new Error('tree-sitter build --wasm exited 0 but produced no nonempty wasm');
  }

  console.log(`[build-wasm] built tree-sitter-python.wasm (${statSync(WASM_PATH).size} bytes)`);
};

try {
  main();
} catch (error) {
  console.error(`[build-wasm] FAIL: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
