// Corpus: sammons/s7-constructor tools/worktree-mediator. The live extraction
// of `src/server.ts` reports exactly two diagnostics, both of this shape:
//   "Orphaned entity 'StoreConfig'" and "Orphaned entity 'AllocationFailure'"
//
// Both types are real and used: `StoreConfig` is the `LeaseStore` constructor's
// parameter type and `AllocationFailure` is half of `allocate`'s return union.
//
// Root cause (language/grammar layer): a class fused into a ClassFile records
// its methods as BARE NAMES only — `ClassFileNode.methods` is
// `readonly string[]` (lib/typed-mind/src/ast/class-file-node.ts:12), emitted
// as `=> [allocate, list]`. The grammar has no slot for a method's parameter
// or return types, so every type reachable ONLY through a method signature
// loses its referent.
//
// The ClassFile's `-> [...]` export list does name them, but `check-orphans.ts`
// deliberately does not count exports as references (the rule is stated in that
// file's own header: "Exports are NOT referenced"). So the emitted
//   LeaseStore #: src/store.ts
//     => [allocate, list]
//     -> [Lease, StoreConfig, AllocationFailure, LeaseStore]
// leaves `StoreConfig` and `AllocationFailure` with no referent at all, while
// `Lease` survives only because `server.ts` imports it by name directly.
//
// This is a knownGap, not a small local fix: closing it needs either a grammar
// slot for method signatures (a language change) or a decision to count a
// ClassFile's exports as references (which would weaken the orphan check
// repo-wide). Both are operator-level calls above one rung's bar.
import { LeaseStore, type Lease } from './store.ts';

export const runServer = (): readonly Lease[] => {
  const store = new LeaseStore({ rangeBase: 41000, rangeCount: 10 });
  store.allocate('/tmp/worktree-a');
  return store.list();
};
