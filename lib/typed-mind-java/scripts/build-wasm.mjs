#!/usr/bin/env node
// Copies the pre-built tree-sitter-java.wasm from the npm package into
// grammar/tree-sitter-java.wasm (gitignored, never committed). Skips the
// copy when the existing wasm is newer than the source.

import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = dirname(SCRIPTS_DIR);
const GRAMMAR_DIR = join(PACKAGE_DIR, 'grammar');
const WASM_PATH = join(GRAMMAR_DIR, 'tree-sitter-java.wasm');

const main = () => {
  const require = createRequire(import.meta.url);
  const treeSitterJavaDir = dirname(require.resolve('tree-sitter-java/package.json'));
  const sourceWasm = join(treeSitterJavaDir, 'tree-sitter-java.wasm');

  if (!existsSync(sourceWasm)) {
    console.error(`[build-wasm] tree-sitter-java.wasm not found in npm package at ${sourceWasm}`);
    process.exit(1);
  }

  if (existsSync(WASM_PATH)) {
    const destMtime = statSync(WASM_PATH).mtimeMs;
    const srcMtime = statSync(sourceWasm).mtimeMs;
    if (destMtime >= srcMtime) {
      console.log('[build-wasm] tree-sitter-java.wasm is up to date — skipping copy');
      return;
    }
  }

  mkdirSync(GRAMMAR_DIR, { recursive: true });
  copyFileSync(sourceWasm, WASM_PATH);
  console.log(`[build-wasm] copied tree-sitter-java.wasm (${statSync(WASM_PATH).size} bytes)`);
};

main();
