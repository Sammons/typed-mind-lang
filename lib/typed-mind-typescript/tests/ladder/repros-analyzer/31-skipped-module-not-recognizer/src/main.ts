// RFC-TM-10 Q3 (D-LEG-6) guardrail negative fixture. `ts.resolveModuleName`
// treats a BARE (non-relative, no `./`/`../` prefix) specifier as a
// package-style import — it does not fall back to filesystem-relative
// resolution the way the recognizer's own `fs.existsSync` probe does. This
// bare specifier resolves to nothing (no such package in node_modules),
// producing the SAME "unresolved, target file exists on disk but is
// unreachable via TS module resolution" shape the recognizer's raw handler
// string has for the real webhookstorage clone — reached here through an
// ORDINARY import, never through the recognizer, proving the standalone-
// parse fallback (gated on `recognizerResolvedPaths`) never fires for it.
import { target } from 'excluded/target.ts';

export const usesTarget = target;
