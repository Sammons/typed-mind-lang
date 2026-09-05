// Corpus: sammons/s7-constructor tools/worktree-mediator. The live extraction
// of `src/server.ts` used to report two diagnostics, both of this shape:
//   "Orphaned entity 'StoreConfig'" and "Orphaned entity 'AllocationFailure'"
//
// Both types are real and used: `StoreConfig` is the `LeaseStore` constructor's
// parameter type and `AllocationFailure` is half of `allocate`'s return union.
//
// Root cause (language/grammar layer): a class fused into a ClassFile recorded
// its methods as BARE NAMES only — `ClassFileNode.methods` is
// `readonly string[]` (lib/typed-mind/src/ast/class-file-node.ts:15) — so
// every type reachable ONLY through a method signature had no referent. The
// ClassFile's `-> [...]` export list did name them, but `check-orphans.ts`
// deliberately does not count exports as references (its own header states
// the rule: "Exports are NOT referenced").
//
// FIXED (RFC-TM-13 B3): `ClassMembers` now carries a typed `signature` per
// method and constructor (`ConstructorDeclarationNode.signature`,
// `MethodDeclarationNode.signature` in lib/typed-mind/src/ast/class-members.ts),
// and B1/G's structural type-reference walk (check-orphans.ts's own header)
// resolves types named inside those signatures as real references. The
// bare-name `methods: readonly string[]` projection is unchanged and the
// "exports are not referenced" rule still holds — the fix adds a second,
// signature-based reference path rather than replacing either. See the
// 'TM13 B3' test in rung-s7-constructor.test.ts and
// https://git.tail4ea214.ts.net/sammons/typed-mind-lang/pulls/181.
import { LeaseStore, type Lease } from './store.ts';

export const runServer = (): readonly Lease[] => {
  const store = new LeaseStore({ rangeBase: 41000, rangeCount: 10 });
  store.allocate('/tmp/worktree-a');
  return store.list();
};
