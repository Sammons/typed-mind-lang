// RC-B repro (ladder-diagnostic-disposition-2026-08-29.md rank 2, issue
// #100) — distilled from the real webhookstorage functions-api clone,
// where `packages/functions/src/api/db/events.ts` and
// `packages/functions/src/api/routes/events.ts` both existed and one's
// File entity clobbered the other's, leaving the loser's functions
// ownerless ("Function X is not exported by any file"). Both same-basename
// modules imported here, mirroring the real `index.ts`'s own shape.
import { listEvents } from './db/events.ts';
import { getEventRoute } from './routes/events.ts';

export function handler(): string {
  return `${listEvents()} ${getEventRoute()}`;
}
