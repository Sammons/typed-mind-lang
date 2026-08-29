// RFC-TM-10 Q3 (D-LEG-6) visited-set-guard fixture. `handler` is imported
// normally (so the traversal loop visits `shared/handler.ts` through the
// existing import-edge enqueue site FIRST, marking it in `visitedModules`)
// AND separately named again through the SST `handler: "path.member"`
// string convention — the recognizer must not double-enqueue or
// double-analyze a module the loop has already visited/queued.
import { handler } from '../shared/handler.ts';

export const apiFn = {
  handler: 'shared/handler.handler',
};

export const directHandlerRef = handler;
