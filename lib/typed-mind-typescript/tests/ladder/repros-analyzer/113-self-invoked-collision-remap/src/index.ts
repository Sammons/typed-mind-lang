// Q10 (typedmind residual burndown, 2026-09-05) — entrypoint whose
// self-invoked function LOST a bare-name collision. `src/engine.ts` also
// exports `runWorker` and sorts first, so this declaration is emitted as
// `IndexFile.runWorker`. `createProgramEntity` folded the self-invoked
// names (X-AN-11) into Program.exports as RAW source names while the
// public exports were already remapped, so Program.exports carried both
// `IndexFile.runWorker` and the bare `runWorker` — the bare one being the
// engine's entity, which `EngineFile` already exports:
// `checker/multi-exported`.
import { engineConcurrency } from './engine.ts';

export function runWorker(): number {
  return engineConcurrency();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runWorker();
}
