#!/usr/bin/env node
// The bundled-wasm drift gate.
//
// `lib/typed-mind/grammar/grammar.wasm` is the canonical grammar artifact: it is
// what `lib/typed-mind/scripts/build-wasm.mjs` produces from the frozen grammar/
// dir using the mise-pinned tree-sitter CLI + wasi-sdk, it is what
// `scripts/stage-published-wasm.mjs` stages into the npm tarball, and it is what
// every runtime consumer resolves. It is gitignored, because a fresh checkout
// rebuilds it byte-for-byte from the pinned toolchain.
//
// Two COPIES of it are tracked in git, because they ship inside artifacts that are
// not built from source at install time:
//   - lib/typed-mind-lsp/dist-bundled/grammar.wasm          (the bundled LSP)
//   - lib/typed-mind-vscode-extension/lsp-bundled/grammar.wasm (the .vsix payload)
//
// Nothing regenerated-and-diffed those two, so they could drift from the canonical
// artifact and nothing failed. check:generated does not cover them: its step 5 only
// asserts that no wasm is tracked under the grammar dir or the package root, which
// is a different (and still correct) assertion. That gap is what let the tracked
// copies sit at a byte sequence no pinned toolchain reproduces.
//
// This check closes it by comparing bytes, not sizes: it builds the canonical
// artifact, then asserts each tracked copy is byte-identical to it. It deliberately
// does NOT run the bundlers — `validate` already runs `pnpm run build` and
// `build:bundled` upstream, and the trailing check:clean-tree step catches any
// write those make. Comparing against the canonical artifact directly keeps this
// check fast and makes its failure message name the real invariant.
//
// web-tree-sitter.wasm is NOT checked here: it is copied verbatim out of the
// web-tree-sitter package, whose version is an exact pin in
// lib/typed-mind/package.json, so its provenance gate is the lockfile.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CORE_PACKAGE_DIR = join(REPO_ROOT, 'lib', 'typed-mind');
const CANONICAL_WASM_PATH = join(CORE_PACKAGE_DIR, 'grammar', 'grammar.wasm');

// Every tracked copy of the canonical grammar artifact. A new bundling target that
// commits its own copy must be added here, or it inherits the exact drift this
// check exists to prevent.
const TRACKED_COPY_PATHSPECS = ['lib/typed-mind-lsp/dist-bundled/grammar.wasm', 'lib/typed-mind-vscode-extension/lsp-bundled/grammar.wasm'];

class BundledWasmCheckError extends Error {}

const run = (command, args, options = {}) => {
  return execFileSync(command, args, { encoding: 'utf8', cwd: REPO_ROOT, ...options });
};

const sha256 = (filePath) => {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
};

const main = () => {
  // Build the canonical artifact. build-wasm.mjs skips the compile when the existing
  // wasm is newer than grammar.js and grammar/src/, so this is cheap on a warm tree
  // and correct on a cold one.
  run('node', [join(CORE_PACKAGE_DIR, 'scripts', 'build-wasm.mjs')], { stdio: ['pipe', 'inherit', 'inherit'] });
  if (!existsSync(CANONICAL_WASM_PATH)) {
    throw new BundledWasmCheckError(`canonical artifact missing after build: ${CANONICAL_WASM_PATH}`);
  }
  const canonicalHash = sha256(CANONICAL_WASM_PATH);
  const canonicalSize = readFileSync(CANONICAL_WASM_PATH).length;
  console.log(`[check:bundled-wasm] canonical ${CANONICAL_WASM_PATH} (${canonicalSize} bytes, sha256 ${canonicalHash.slice(0, 8)})`);

  // Each listed copy must actually be tracked. A copy that silently became
  // gitignored would pass a bytes comparison while shipping nothing to consumers.
  const trackedFiles = new Set(
    run('git', ['ls-files', ...TRACKED_COPY_PATHSPECS])
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== ''),
  );

  const failures = [];
  for (const pathspec of TRACKED_COPY_PATHSPECS) {
    if (!trackedFiles.has(pathspec)) {
      failures.push(`${pathspec} is not tracked in git (expected a committed copy of the canonical artifact)`);
      continue;
    }
    const absolutePath = join(REPO_ROOT, pathspec);
    if (!existsSync(absolutePath)) {
      failures.push(`${pathspec} is tracked but missing from the working tree`);
      continue;
    }
    const copyHash = sha256(absolutePath);
    if (copyHash !== canonicalHash) {
      const copySize = readFileSync(absolutePath).length;
      failures.push(
        `${pathspec} differs from the canonical artifact\n` +
          `      canonical: ${canonicalSize} bytes, sha256 ${canonicalHash}\n` +
          `      this copy: ${copySize} bytes, sha256 ${copyHash}`,
      );
      continue;
    }
    console.log(`[check:bundled-wasm] ${pathspec} matches canonical (OK)`);
  }

  if (failures.length > 0) {
    throw new BundledWasmCheckError(
      `tracked bundled grammar.wasm copies drifted from the canonical artifact:\n` +
        failures.map((failure) => `  - ${failure}`).join('\n') +
        `\n\n  Regenerate and commit them:\n` +
        `    pnpm run build\n` +
        `    pnpm run build:bundled\n` +
        `    pnpm --dir lib/typed-mind-vscode-extension run bundle-lsp\n` +
        `    git add ${TRACKED_COPY_PATHSPECS.join(' ')}\n` +
        `\n  If the bytes changed because the toolchain moved, that bump belongs in the\n` +
        `  mise.toml paired-bump procedure — the canonical artifact, the npm tarball, and\n` +
        `  these copies must all come from the same pinned tree-sitter CLI + wasi-sdk.`,
    );
  }

  console.log('[check:bundled-wasm] PASS');
};

try {
  main();
} catch (error) {
  if (error instanceof BundledWasmCheckError) {
    console.error(`[check:bundled-wasm] FAIL: ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`[check:bundled-wasm] FAIL: ${error.message}`);
    if (error.stdout) {
      console.error(error.stdout.toString());
    }
    if (error.stderr) {
      console.error(error.stderr.toString());
    }
  } else {
    console.error('[check:bundled-wasm] FAIL: unknown error', error);
  }
  process.exit(1);
}
