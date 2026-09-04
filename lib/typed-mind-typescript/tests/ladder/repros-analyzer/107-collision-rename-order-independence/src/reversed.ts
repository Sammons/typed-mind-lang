// Entrypoint B. Byte-for-byte the same program as `main.ts` except the two
// import lines are SWAPPED, so BFS traversal reaches `src/zulu.ts` first.
// Under a first-occurrence-wins rule this alone would flip which declaration
// keeps the bare name. Under the canonical path-sort rule it must not.
import { readZulu } from './zulu.ts';
import { readAlpha } from './alpha.ts';

export const runReversed = (): number => {
  readAlpha();
  return readZulu().fromZulu;
};
