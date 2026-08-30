// Callgraph increment negative-control repro — never imported by
// index.ts's own transitive graph. Calls `testOnlyHelper`, but since this
// file is never enqueued by the analyzer's entrypoint traversal, the call
// is invisible to the extraction — `testOnlyHelper` must still flag
// `checker/orphaned-entity`.
import { testOnlyHelper } from './helpers.ts';

console.log(testOnlyHelper());
