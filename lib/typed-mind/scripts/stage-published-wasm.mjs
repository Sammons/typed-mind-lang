#!/usr/bin/env node
// RFC-TM-4 §3 (rfc-tm-4-diamond.md, S-CORE-3 packaging) — stages grammar.wasm
// at the package root, dist-adjacent, for the published npm tarball. This is
// the second of TypedMindParser's two __dirname-relative resolution
// candidates (pipeline/typed-mind-parser.ts resolveDefaultWasmPath): the
// in-repo dev layout resolves ../../grammar/grammar.wasm from dist/pipeline/,
// the published layout resolves ../../grammar.wasm — i.e. <package
// root>/grammar.wasm, a sibling of dist/. build-wasm.mjs only produces the
// dev-layout path (grammar/grammar.wasm, gitignored); this script copies that
// build output to the published-layout path so `files` (which lists
// "grammar.wasm") actually ships it. Runs as `prepack`, after build-wasm.mjs
// has produced the source file.

import { copyFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = dirname(SCRIPTS_DIR);
const SOURCE_WASM_PATH = join(PACKAGE_DIR, 'grammar', 'grammar.wasm');
const PUBLISHED_WASM_PATH = join(PACKAGE_DIR, 'grammar.wasm');

class StageWasmError extends Error {}

const main = () => {
  if (!existsSync(SOURCE_WASM_PATH)) {
    throw new StageWasmError(`${SOURCE_WASM_PATH} not found — run \`node scripts/build-wasm.mjs\` first`);
  }
  copyFileSync(SOURCE_WASM_PATH, PUBLISHED_WASM_PATH);
  const size = statSync(PUBLISHED_WASM_PATH).size;
  if (size === 0) {
    throw new StageWasmError(`${PUBLISHED_WASM_PATH} is empty after copy`);
  }
  console.log(`[stage-published-wasm] staged ${PUBLISHED_WASM_PATH} (${size} bytes)`);
};

try {
  main();
} catch (error) {
  if (error instanceof StageWasmError) {
    console.error(`[stage-published-wasm] FAIL: ${error.message}`);
  } else {
    console.error('[stage-published-wasm] FAIL:', error);
  }
  process.exit(1);
}
