// decision-same-named-entities PR 1 — name-uniqueness guard.
//
// Three modules, two of which collide on `Options` while a third declares the
// exact qualified name the loser would be renamed to. Every emitted entity
// name must still be unique, and the emitted .tmd must carry zero
// `checker/duplicate-name` findings.
// Import order matters for the REPRO (not for the outcome, which is now
// order-independent): BFS traversal follows import order, so listing
// `settings.ts` BEFORE `collide.ts` makes the colliding rename run first and
// claim `Settings__Options` — the exact later-claim ordering that, before the
// fix, left `collide.ts` silently taking a name already held.
import { readConfig } from './config.ts';
import { readSettings } from './settings.ts';
import { readCollide } from './collide.ts';

export const runAll = (): boolean => {
  readConfig();
  readSettings();
  return readCollide().fromCollide;
};
