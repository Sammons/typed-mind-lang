// Corpus: sammons/artifice-with-intelligence
// `server/serialize-post-actions.ts:18` and
// `server/coordinators/lifecycle-coordinator.ts:30`, which each
// independently declare `export type PublishState = (typeof
// publishStates)[number]` over their own local `publishStates` tuple.
//
// This WAS a known gap, same root cause as fixture 77, DIFFERENT converter
// path: fixture 77 hit the defect on `convertInterfaceToDTO`, this one
// travels `convertTypeAliasToDTO`, a separate call site reached by a
// separate TypeScript declaration form. Both used to derive the entity name
// via `createEntityName` (the identity function) and reject against ONE
// global `this.entityNames` set, so the second declaration raised
// `Duplicate entity name: PublishState` and `convert()` returned
// `success: false`.
//
// Blast radius measured on the real target: this single collision used to
// turn a clean 349-entity extraction of `server/index.ts` into a failed
// conversion with a nonzero CLI exit and partial output.
//
// FIXED: decision-same-named-entities PR 1 made the naming decision that
// spans all six call sites — a colliding declaration is renamed with its
// sanitized module basename as an owner qualifier (`LifecycleFile.PublishState`)
// instead of aborting the conversion. RFC-TM-13 A2 (gap 77 and gap 96,
// origin-directed type rewriting) then made every signature reference
// resolve to its own actual declaration's identity, closing the reference
// half too — no interim collision warnings survive. See the 'FIXED GAP 96'
// describe block in rung-artifice-with-intelligence.test.ts and
// https://git.tail4ea214.ts.net/sammons/typed-mind-lang/pulls/181.
import { nextState, type PublishState as StoredPublishState } from './lifecycle.ts';

export type PublishState = 'draft' | 'published';

export const advance = (state: PublishState): StoredPublishState => {
  return nextState(state);
};
