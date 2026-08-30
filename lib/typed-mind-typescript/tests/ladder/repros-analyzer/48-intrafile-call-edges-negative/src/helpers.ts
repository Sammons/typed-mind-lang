// Callgraph increment negative-control repro — three exported functions:
// `usedHelper` is called cross-file (from index.ts, via the import above),
// `deadHelper` has zero callers anywhere (genuinely dead code, mirroring
// ingest's `storePayload`), and `testOnlyHelper` is called only from
// `helpers.test.ts` (a sibling file the entrypoint's own traversal never
// reaches, mirroring ops-cli's `getFormat`/`isVerbose` test-only shape).
// Both `deadHelper` and `testOnlyHelper` must STILL flag
// `checker/orphaned-entity` after the callgraph fix — this fixture proves
// the fix does not over-credit liveness to code that has no real same-file
// OR cross-file caller within the entrypoint's own reachable graph.

export function usedHelper(): string {
  return 'used';
}

export function deadHelper(): string {
  return 'dead, zero callers anywhere';
}

export function testOnlyHelper(): string {
  return 'called only from helpers.test.ts, never from production code';
}
