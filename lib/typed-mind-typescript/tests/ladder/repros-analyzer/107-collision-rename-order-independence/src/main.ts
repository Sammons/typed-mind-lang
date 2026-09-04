// Entrypoint A. Imports alpha BEFORE zulu, so BFS traversal reaches
// `src/alpha.ts` first.
import { readAlpha } from './alpha.ts';
import { readZulu } from './zulu.ts';

export const runMain = (): number => {
  readAlpha();
  return readZulu().fromZulu;
};
