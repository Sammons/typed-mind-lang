// Corpus: sammons/artifice-with-intelligence
// `server/serialize-post-actions.ts:18` and
// `server/coordinators/lifecycle-coordinator.ts:30`, which each
// independently declare `export type PublishState = (typeof
// publishStates)[number]` over their own local `publishStates` tuple.
//
// KNOWN GAP — same root cause as fixture 77, DIFFERENT converter path.
//
// Fixture 77 pins the same defect on `convertInterfaceToDTO`
// (typescript-to-typedmind-converter.ts:2072). This one travels
// `convertTypeAliasToDTO` (:2173), a separate call site reached by a
// separate TypeScript declaration form. Both derive the entity name via
// `createEntityName` (the identity function) and reject against ONE global
// `this.entityNames` set, so the second declaration raises
// `Duplicate entity name: PublishState` and `convert()` returns
// `success: false`.
//
// Blast radius measured on the real target: this single collision turns a
// clean 349-entity extraction of `server/index.ts` into a failed
// conversion with a nonzero CLI exit and partial output.
//
// The asymmetry that shows this is a defect rather than a policy: the
// Constants path (`createConstantEntity`, :2291) hits the identical
// condition and SKIPS silently, while five sibling paths call `addError`
// and fail the whole run. Whether a same-named declaration in two modules
// should be skipped, module-qualified, or fatal is one naming decision
// spanning all six call sites — an operator-level choice, not a local
// patch, which is why this ships pinned rather than fixed.
import { nextState, type PublishState as StoredPublishState } from './lifecycle.ts';

export type PublishState = 'draft' | 'published';

export const advance = (state: PublishState): StoredPublishState => {
  return nextState(state);
};
