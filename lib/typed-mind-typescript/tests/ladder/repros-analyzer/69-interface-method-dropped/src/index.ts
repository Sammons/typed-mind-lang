// Ladder rung: sammons/slat-harness (RFC-TM-9 §8 X-LADDER-2 re-evaluation).
//
// An interface's METHODS used to be silently dropped. Every interface was
// routed unconditionally through `convertInterfaceToDTO`, and that function
// builds its field list from `iface.properties` only — `iface.methods` was
// parsed by the analyzer (types.ts:69 carries it, populated) and then never
// read.
//
// FIXED — regressions in tests/ladder/slat-harness-known-gaps.test.ts.
//
// This was the most severe finding on this rung because it was CHECKER-
// INVISIBLE: the emitted `.tmd` for the fixture below was
//
//   Repository %
//     - id: string
//
// and `typed-mind-cli --check` reported "No errors found!". The `save`
// method was gone with zero diagnostic — silent data loss, not a surfaced
// failure. Every other gap on this rung announces itself.
//
// Distilled from packages/hub/src/surface/route-module.ts:16-24 —
// `RouteModule` declares `handleRead?` and `handleWrite?` and nothing else,
// so its extracted DTO was entirely EMPTY. 16 route classes across
// packages/hub/src/surface/routes/*.ts implement it (e.g.
// machines-routes.ts:205,301), so the hub target's whole route-module
// contract was missing from the extracted architecture while the checker
// reported that target clean.
//
// THE FIX. `convertInterface` classifies BY SHAPE at all three
// `convertInterfaceToDTO` call sites: an interface carrying at least one
// `ts.MethodSignature` converts through `convertInterfaceToClass` (a
// ClassNode with a `=> [...]` methods continuation); a property-only
// interface keeps the DTO lane unchanged. This is what the checker already
// assumed (valid-references.ts, "In TypedMind, interfaces are represented as
// Classes") and what the language already models — `ClassNode.methods` is
// the only method surface, and check-method-calls.ts:36 states the matching
// rule from the other side: "Only Classes and ClassFiles can have methods".
//
// The emitted .tmd is now
//
//   Repository <:
//     => [save]
//
// The DISCLOSED COST, stated plainly because it is the mirror image of the
// bug being fixed: ClassNode has no field surface, so a MIXED interface
// (properties AND methods, like `Repository` here) loses its properties on
// the Class lane exactly as it lost its methods on the DTO lane. There is no
// third option inside the current grammar — a lossless fix would have to add
// fields to Class or methods to DTO, i.e. a language change. What this buys
// is that the loss now falls on the members the language CANNOT model
// instead of the ones it can: a method has no representation as a DTO field,
// while a property at least had one. Measured across typed-mind-lang,
// slat-harness, and code-outline-cli: 42 of 641 interfaces are
// method-bearing and 16 of those are mixed, so ~2.5% of interfaces make the
// trade and 97.5% are unaffected.
//
// A second, smaller consequence: `persist(repository: Repository)` no longer
// emits a `<- Repository` input edge, because `input`/`output` accept only
// DTO (check-function-graph.ts) — the same disclosed-loss exclusion
// `isDTOLikeType` already applied to a real `class` declaration. The type
// stays visible verbatim in the emitted signature.
export interface Repository {
  id: string;
  save(row: string): void;
}

export const persist = (repository: Repository): void => {
  repository.save('row');
};
