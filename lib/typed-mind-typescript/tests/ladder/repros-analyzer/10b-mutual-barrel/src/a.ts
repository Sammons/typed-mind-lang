// RFC-TM-9 X-AN-3 — mutual-barrel cycle guard fixture: a.ts and b.ts star
// re-export each other. The visited-set on module paths (mirroring
// `visitedModules`) must terminate the transitive export-fold instead of
// looping forever.
export * from './b.ts';

export function fromA(): string {
  return 'a';
}
