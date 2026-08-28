// L-g4 (RFC-TM-9 X-CONV-3) — a script-shaped entrypoint whose OWN module
// shape (a plain constant initialized from an imported class, no locally
// declared classes/functions/interfaces/types) previously routed through
// `isPureTypesFile`'s pure-types path, so no FileNode was created and the
// Program's entry dangled. Distilled from the census's `export const app =
// new Hono()` shape (`framework.ts` stands in for the `hono` package so the
// fixture has zero external dependencies).
import { Framework } from './framework.ts';

export const app = new Framework();
