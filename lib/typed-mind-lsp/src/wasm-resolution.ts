// RFC-TM-5 §2 (rfc-tm-5-diamond.md) — bundled-build wasm resolution. Two wasm
// artifacts must resolve from whatever layout the server is running from:
// grammar.wasm (the language) and web-tree-sitter.wasm (web-tree-sitter's own
// emscripten runtime, requested through its glue's locateFile hook — see
// TypedMindParserOptions.runtimeWasmPath in
// ../../typed-mind/src/pipeline/typed-mind-parser.ts).
//
// Mechanism: explicit-path-first, mirroring the extension's existing
// three-way server-module fallback (extension.ts:14-36). Candidates, in
// order:
//   1. bundle-adjacent (thisDir) — the dist-bundled/ layout, where
//      tsup.bundled.config.ts's onSuccess step copies both wasms next to
//      cli.cjs;
//   2. the core package's layout via createRequire resolution — the dev
//      layout (dist/cli.js running against the workspace @sammons/typed-mind,
//      where the core's own default import.meta.url-relative resolution
//      already works) and the published layout (grammar.wasm staged
//      sibling-of-dist).
// When neither candidate exists, both fields resolve to undefined and
// TypedMind.create() falls through to its own default resolution — this
// keeps the dev layout behavior (§2, "the core default already works")
// unchanged rather than duplicating it here.

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// tsup's CJS bundle shims import.meta as an empty object (import_meta = {}),
// so import.meta.url is undefined there. Fall back to __dirname which CJS
// provides natively. ESM (dev/test via node --test) has import.meta.url but
// no __dirname — the ternary covers both.
const thisDir =
  typeof import.meta.url === 'string'
    ? dirname(fileURLToPath(import.meta.url))
    : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- __dirname exists only in CJS; guarded for ESM safety
      typeof __dirname === 'string'
      ? __dirname
      : process.cwd();

const esmRequire = typeof import.meta.url === 'string' ? createRequire(import.meta.url) : createRequire(__filename);

export interface ResolvedWasmPaths {
  readonly wasmPath?: string;
  readonly runtimeWasmPath?: string;
}

const firstExisting = (candidates: readonly string[]): string | undefined => {
  return candidates.find((candidate) => existsSync(candidate));
};

const resolveTypedMindPackageDir = (): string | undefined => {
  try {
    const typedMindEntry = esmRequire.resolve('@sammons/typed-mind');
    return dirname(dirname(typedMindEntry));
  } catch {
    return undefined;
  }
};

// The core package's own two-candidate layout (typed-mind-parser.ts
// resolveDefaultWasmPath): dev (grammar/grammar.wasm) then published
// (sibling-of-dist grammar.wasm).
const resolveCorePackageGrammarWasm = (): string | undefined => {
  const typedMindPackageDir = resolveTypedMindPackageDir();
  if (typedMindPackageDir === undefined) {
    return undefined;
  }
  return firstExisting([join(typedMindPackageDir, 'grammar', 'grammar.wasm'), join(typedMindPackageDir, 'grammar.wasm')]);
};

const resolveCorePackageRuntimeWasm = (): string | undefined => {
  const typedMindPackageDir = resolveTypedMindPackageDir();
  if (typedMindPackageDir === undefined) {
    return undefined;
  }
  let webTreeSitterDir: string;
  try {
    webTreeSitterDir = dirname(esmRequire.resolve('web-tree-sitter'));
  } catch {
    return undefined;
  }
  return firstExisting([join(webTreeSitterDir, 'web-tree-sitter.wasm')]);
};

// Ordered candidate resolution for both wasm artifacts: bundle-adjacent
// (thisDir) first, then the core/node_modules package layouts. Returns
// undefined for a field when no candidate exists so TypedMind.create() falls
// through to its own default (dev layout parity, doc §2).
export const resolveWasmPaths = (): ResolvedWasmPaths => {
  const bundleAdjacentGrammarWasm = join(thisDir, 'grammar.wasm');
  const bundleAdjacentRuntimeWasm = join(thisDir, 'web-tree-sitter.wasm');

  const wasmPath = existsSync(bundleAdjacentGrammarWasm) ? bundleAdjacentGrammarWasm : resolveCorePackageGrammarWasm();
  const runtimeWasmPath = existsSync(bundleAdjacentRuntimeWasm) ? bundleAdjacentRuntimeWasm : resolveCorePackageRuntimeWasm();

  // exactOptionalPropertyTypes: only set a key when it has a value — an
  // explicit `undefined` value on an optional property is a distinct (and
  // disallowed) state from the key being absent.
  return {
    ...(wasmPath === undefined ? {} : { wasmPath }),
    ...(runtimeWasmPath === undefined ? {} : { runtimeWasmPath }),
  };
};
