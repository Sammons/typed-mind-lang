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
// Copies of it are tracked in git, because they ship inside artifacts that are not
// built from source at install time (the bundled LSP, the .vsix payload). Nothing
// regenerated-and-diffed those, so they could drift from the canonical artifact and
// nothing failed. check:generated does not cover them: its step 5 only asserts that
// no wasm is tracked under the grammar dir or the package root, which is a different
// (and still correct) assertion. That gap is what let the tracked copies sit at a
// byte sequence no pinned toolchain reproduces.
//
// The set of tracked copies is ENUMERATED FROM GIT (`git ls-files -z -- '*.wasm'`),
// not hand-maintained. A hardcoded list is only correct until the next bundling
// target lands: a new target that commits its own wasm copy would inherit exactly
// the drift this gate exists to prevent, silently, because the list would not
// mention it. Enumerating from git inverts that — a new tracked wasm is visible to
// this check the moment it is committed, and an unclassified basename FAILS rather
// than being skipped.
//
// Each tracked wasm is classified by basename, and every class compares BYTES
// (sha256), never sizes:
//   - grammar.wasm          -> must equal the canonical build output.
//   - web-tree-sitter.wasm  -> must equal the installed web-tree-sitter package's
//                              copy. That package is an exact pin in
//                              lib/typed-mind/package.json, so node_modules is the
//                              provenance root and the lockfile is what pins it.
//   - anything else         -> FAIL with "unclassified tracked wasm, add a rule".
//
// This check deliberately does NOT run the bundlers — `validate` already runs
// `pnpm run build` and `build:bundled-all` upstream, and the trailing
// check:clean-tree step catches any write those make. Comparing against the
// reference artifacts directly keeps this check fast and makes its failure message
// name the real invariant.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CORE_PACKAGE_DIR = join(REPO_ROOT, 'lib', 'typed-mind');
const CANONICAL_WASM_PATH = join(CORE_PACKAGE_DIR, 'grammar', 'grammar.wasm');

class BundledWasmCheckError extends Error {}

const run = (command, args, options = {}) => {
  return execFileSync(command, args, { encoding: 'utf8', cwd: REPO_ROOT, ...options });
};

const sha256 = (filePath) => {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
};

// The canonical grammar artifact, rebuilt from the pinned toolchain. build-wasm.mjs
// skips the compile when the existing wasm is newer than grammar.js and grammar/src/,
// so this is cheap on a warm tree and correct on a cold one. A missing toolchain
// makes build-wasm.mjs exit nonzero, which propagates out of execFileSync — the
// fail-safe direction: this check never passes because a reference was unavailable.
const resolveCanonicalGrammarWasm = () => {
  run('node', [join(CORE_PACKAGE_DIR, 'scripts', 'build-wasm.mjs')], { stdio: ['pipe', 'inherit', 'inherit'] });
  if (!existsSync(CANONICAL_WASM_PATH)) {
    throw new BundledWasmCheckError(`canonical grammar artifact missing after build: ${CANONICAL_WASM_PATH}`);
  }
  return CANONICAL_WASM_PATH;
};

// web-tree-sitter ships its own emscripten runtime wasm. It is resolved through the
// core package's resolution scope because web-tree-sitter is that package's
// dependency, not the workspace root's — pnpm's strict node_modules means it is not
// hoisted here. Same scope the LSP bundler uses (tsup.bundled.config.ts).
const resolveInstalledRuntimeWasm = () => {
  const require = createRequire(join(CORE_PACKAGE_DIR, 'package.json'));
  let entryPath;
  try {
    entryPath = require.resolve('web-tree-sitter');
  } catch (error) {
    throw new BundledWasmCheckError(
      `cannot resolve web-tree-sitter from ${CORE_PACKAGE_DIR} (${error.message}) — run \`pnpm install\` first`,
    );
  }
  const runtimeWasmPath = join(dirname(entryPath), 'web-tree-sitter.wasm');
  if (!existsSync(runtimeWasmPath)) {
    throw new BundledWasmCheckError(`web-tree-sitter runtime wasm missing at ${runtimeWasmPath} — run \`pnpm install\` first`);
  }
  return runtimeWasmPath;
};

// Basename -> how to obtain that class's reference artifact, and how to describe it.
// Resolvers are lazy so a repo with no tracked copy of a class never pays to build
// or resolve that class's reference.
const CLASSIFICATION_RULES = {
  'grammar.wasm': {
    label: 'canonical grammar build',
    resolveReferencePath: resolveCanonicalGrammarWasm,
    remediation: [
      'pnpm run build',
      'pnpm run build:bundled-all',
      'git add -- <the listed paths>',
      '',
      'If the bytes changed because the toolchain moved, that bump belongs in the',
      'mise.toml paired-bump procedure — the canonical artifact, the npm tarball, and',
      'these copies must all come from the same pinned tree-sitter CLI + wasi-sdk.',
    ],
  },
  'web-tree-sitter.wasm': {
    label: 'installed web-tree-sitter package',
    resolveReferencePath: resolveInstalledRuntimeWasm,
    remediation: [
      'pnpm install',
      'pnpm run build:bundled-all',
      'git add -- <the listed paths>',
      '',
      "If the bytes changed because web-tree-sitter's exact pin moved, that bump belongs",
      'in the mise.toml paired-bump procedure alongside the tree-sitter CLI and wasi-sdk.',
    ],
  },
};

const listTrackedWasmPaths = () => {
  // -z keeps paths intact when they contain characters git would otherwise quote.
  return run('git', ['ls-files', '-z', '--', '*.wasm'])
    .split('\0')
    .filter((line) => line !== '');
};

const main = () => {
  const trackedWasmPaths = listTrackedWasmPaths();
  if (trackedWasmPaths.length === 0) {
    throw new BundledWasmCheckError(
      'no tracked *.wasm files found — the bundled LSP and .vsix payload copies are expected to be committed',
    );
  }

  // Classify first, so an unclassified basename fails before any reference artifact
  // is built or resolved.
  const unclassifiedPaths = trackedWasmPaths.filter((trackedPath) => CLASSIFICATION_RULES[basename(trackedPath)] === undefined);
  if (unclassifiedPaths.length > 0) {
    throw new BundledWasmCheckError(
      `unclassified tracked wasm, add a rule:\n` +
        unclassifiedPaths.map((trackedPath) => `  - ${trackedPath} (basename "${basename(trackedPath)}")`).join('\n') +
        `\n\n  Every tracked *.wasm must be byte-comparable against a reference artifact, or it\n` +
        `  can drift with nothing to catch it. Add a rule for this basename to\n` +
        `  CLASSIFICATION_RULES in ${'scripts/check-bundled-wasm.mjs'}, naming where its\n` +
        `  authoritative bytes come from. Known basenames: ${Object.keys(CLASSIFICATION_RULES).join(', ')}.`,
    );
  }

  // Resolve each needed reference artifact exactly once.
  const referenceCache = new Map();
  const referenceFor = (wasmBasename) => {
    const cached = referenceCache.get(wasmBasename);
    if (cached !== undefined) {
      return cached;
    }
    const rule = CLASSIFICATION_RULES[wasmBasename];
    const referencePath = rule.resolveReferencePath();
    const reference = { path: referencePath, hash: sha256(referencePath), size: readFileSync(referencePath).length, rule };
    referenceCache.set(wasmBasename, reference);
    console.log(
      `[check:bundled-wasm] reference ${wasmBasename} <- ${rule.label}: ${referencePath} (${reference.size} bytes, sha256 ${reference.hash.slice(0, 8)})`,
    );
    return reference;
  };

  const failures = [];
  const classifications = [];
  for (const trackedPath of trackedWasmPaths) {
    const wasmBasename = basename(trackedPath);
    const reference = referenceFor(wasmBasename);
    const absolutePath = join(REPO_ROOT, trackedPath);

    if (!existsSync(absolutePath)) {
      failures.push({ wasmBasename, message: `${trackedPath} is tracked but missing from the working tree` });
      classifications.push({ trackedPath, wasmBasename, label: reference.rule.label, verdict: 'MISSING' });
      continue;
    }
    const copyHash = sha256(absolutePath);
    if (copyHash !== reference.hash) {
      const copySize = readFileSync(absolutePath).length;
      failures.push({
        wasmBasename,
        message:
          `${trackedPath} differs from the ${reference.rule.label}\n` +
          `      reference: ${reference.size} bytes, sha256 ${reference.hash}\n` +
          `      this copy: ${copySize} bytes, sha256 ${copyHash}`,
      });
      classifications.push({ trackedPath, wasmBasename, label: reference.rule.label, verdict: 'DRIFTED' });
      continue;
    }
    classifications.push({ trackedPath, wasmBasename, label: reference.rule.label, verdict: 'OK' });
  }

  // The classification table — what was found, how it was classified, and the verdict.
  const pathColumnWidth = Math.max(...classifications.map((entry) => entry.trackedPath.length));
  const labelColumnWidth = Math.max(...classifications.map((entry) => entry.label.length));
  console.log(`[check:bundled-wasm] ${classifications.length} tracked wasm file(s):`);
  for (const entry of classifications) {
    console.log(
      `[check:bundled-wasm]   ${entry.trackedPath.padEnd(pathColumnWidth)}  ${entry.label.padEnd(labelColumnWidth)}  ${entry.verdict}`,
    );
  }

  if (failures.length > 0) {
    const affectedBasenames = [...new Set(failures.map((failure) => failure.wasmBasename))];
    const remediation = affectedBasenames.flatMap((wasmBasename) => [
      `  for ${wasmBasename}:`,
      ...CLASSIFICATION_RULES[wasmBasename].remediation.map((line) => (line === '' ? '' : `    ${line}`)),
    ]);
    throw new BundledWasmCheckError(
      `tracked wasm copies drifted from their reference artifacts:\n` +
        failures.map((failure) => `  - ${failure.message}`).join('\n') +
        `\n\n  Regenerate and commit them:\n` +
        remediation.join('\n'),
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
