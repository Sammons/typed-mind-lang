// Callgraph increment negative-control repro — entrypoint importing only
// `usedHelper`; `deadHelper` and `testOnlyHelper` are exported from the same
// module but must STILL flag `checker/orphaned-entity` after the callgraph
// fix, because neither is reachable from any same-file OR cross-file call
// edge the entrypoint's own traversal ever sees.
import { usedHelper } from './helpers.ts';

export const app = usedHelper;
