// Corpus: sammons/s7-constructor lib/ui/src/api.ts and lib/ui/src/parse.ts.
// RFC-TM-13 B1 closes the two signature-only orphan findings. The generic
// types have no explicit input/output slots: only the function signatures
// carry their references. The ladder test pins unchanged emission bytes.
import { fetchWrapped, countBoxes } from './api.ts';

// A side-effect-shaped entrypoint, matching the real corpus's lib/ui/src/index.ts:
// nothing here re-exports `Wrapped`/`Boxed`, so neither name lands in the
// Program's `exports:` list. That is what leaves the generic-nested function
// signature as their ONLY referent.
export const boot = async (): Promise<number> => {
  const rows = await fetchWrapped();
  return countBoxes(rows.map((row) => ({ count: row.value.length })));
};
