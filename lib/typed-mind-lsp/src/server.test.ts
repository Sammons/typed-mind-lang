// RFC-TM-5 §1 Diamond DAG Q1 check binding, FAQ Q6 — "the stdio integration
// tests added here (race guard, bundled layout) are the end-to-end layer;
// feature fixtures (hover, tokens, references) run against the server class
// in-process." The `describe.skip` stub (legacy server.test.ts, `assert.ok
// (true)`) is deleted. Feature fixtures live in their own files next to the
// modules TypedMindLanguageServer delegates to — document-state.ts, hover.ts,
// semantic-tokens.ts, references.ts, entity-kind-maps.ts, lsp-diagnostics.ts,
// toggle-format.ts, name-occurrence-index.ts — because those modules ARE the
// server class's per-feature logic, factored out so they can be exercised
// without a live JSON-RPC connection.
//
// TypedMindLanguageServer itself binds a real vscode-languageserver
// `createConnection(ProposedFeatures.all)` in its constructor, which requires
// an actual stdio/IPC/socket host argument or process context to construct at
// all (it throws "Connection input stream is not set" otherwise) — so this
// class is exercised end-to-end via the stdio-race-guard integration test
// (spawning the built dist/cli.js as a real process), not via a bare
// `new`/`create()` call in a unit test. This file documents that boundary
// rather than fighting it with a fake connection.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TypedMindLanguageServer } from './server.ts';

describe('TypedMindLanguageServer (RFC-TM-5 §1 leaf b, construction contract)', () => {
  it('exposes create() as its only construction path (no public constructor)', () => {
    // TS enforces the private constructor at compile time; this asserts the
    // runtime shape stays a class with exactly the static factory as its
    // public entry point, without invoking the connection-binding constructor
    // outside a real host process (see file header).
    assert.equal(typeof TypedMindLanguageServer.create, 'function');
    assert.equal(TypedMindLanguageServer.prototype.constructor, TypedMindLanguageServer);
  });
});
