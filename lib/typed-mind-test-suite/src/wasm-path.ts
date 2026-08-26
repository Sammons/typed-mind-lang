// RFC-TM-4 §4 (rfc-tm-4-diamond.md) — S-TEST-1 helper, not a test file.
//
// `TypedMindParser.create()`'s default grammar.wasm resolution is
// `__dirname`-relative and only works from the compiled CommonJS output
// (typed-mind-parser.ts, resolveDefaultWasmPath). Tests in this package run
// the `.ts` source directly (type-stripped, per node_version_is_26), so any
// test that constructs `TypedMindParser` directly (bypassing the
// `@sammons/typed-mind` package's compiled `dist/`, which the `TypedMind`
// facade resolves through) must pass `wasmPath` explicitly — the same
// resolution the shadow-verdict harness uses
// (lib/typed-mind/scripts/shadow-verdict-harness.mjs `WASM_PATH`).

import { join } from 'node:path';

export const WASM_PATH = join(import.meta.dirname, '..', '..', 'typed-mind', 'grammar', 'grammar.wasm');
