// X-AN-11 — the `import.meta.url` self-invocation guard (census: "a
// self-invoking entrypoint not recognized as a graph root",
// packages/outbound-delivery/src/index.ts:213 in the real target).
// `runWorker` is invoked only under this guard: nothing else in the
// analyzed graph calls it, so without X-AN-11 it would be flagged as a
// false orphan even though it IS the program's own entry action.
export function runWorker(pollIntervalMs: number): void {
  void pollIntervalMs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runWorker(1000);
}
