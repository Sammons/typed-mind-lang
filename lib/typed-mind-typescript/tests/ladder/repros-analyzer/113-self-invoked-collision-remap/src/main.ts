// Control entrypoint — the collision WINNER. `src/main.ts` sorts before
// `src/support.ts`, so this `runWorker` keeps the bare name and the
// support module's declaration becomes `SupportFile.runWorker`. The
// self-invoked fold resolves to the bare name here, exactly as before.
import { supportLimit } from './support.ts';

export function runWorker(): number {
  return supportLimit();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runWorker();
}
