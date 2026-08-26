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
//   1. bundle-adjacent (__dirname) — the dist-bundled/ layout, where
//      tsup.bundled.config.ts's onSuccess step copies both wasms next to
//      cli.js;
//   2. the core package's layout via require resolution — the dev layout
//      (dist/cli.js running against the workspace @sammons/typed-mind, where
//      the core's own default __dirname-relative resolution already works)
//      and the published layout (grammar.wasm staged sibling-of-dist).
// When neither candidate exists, both fields resolve to undefined and
// TypedMind.create() falls through to its own default resolution — this
// keeps the dev layout behavior (§2, "the core default already works")
// unchanged rather than duplicating it here.
//
// __dirname/require are CJS globals: this package compiles to CommonJS both
// via tsc (dist/) and tsup's cjs format (dist-bundled/), so both are always
// available at runtime here — no createRequire/import.meta needed.

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface ResolvedWasmPaths {
  readonly wasmPath?: string;
  readonly runtimeWasmPath?: string;
}

const firstExisting = (candidates: readonly string[]): string | undefined => {
  return candidates.find((candidate) => existsSync(candidate));
};

const resolveTypedMindPackageDir = (): string | undefined => {
  try {
    const typedMindEntry = require.resolve('@sammons/typed-mind', { paths: [__dirname] });
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
    webTreeSitterDir = dirname(require.resolve('web-tree-sitter', { paths: [typedMindPackageDir] }));
  } catch {
    return undefined;
  }
  return firstExisting([join(webTreeSitterDir, 'web-tree-sitter.wasm')]);
};

// Ordered candidate resolution for both wasm artifacts: bundle-adjacent
// (__dirname) first, then the core/node_modules package layouts. Returns
// undefined for a field when no candidate exists so TypedMind.create() falls
// through to its own default (dev layout parity, doc §2).
export const resolveWasmPaths = (): ResolvedWasmPaths => {
  const bundleAdjacentGrammarWasm = join(__dirname, 'grammar.wasm');
  const bundleAdjacentRuntimeWasm = join(__dirname, 'web-tree-sitter.wasm');

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
