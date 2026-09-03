// Ladder rung: sammons/slat-harness (RFC-TM-9 §8 X-LADDER-2 re-evaluation).
//
// An interface's METHODS are silently dropped. Every interface is routed
// unconditionally through `convertInterfaceToDTO`
// (typescript-to-typedmind-converter.ts:1934, called from :1202, :1492,
// :1589 with no method-count branch), and that function builds its field
// list from `iface.properties` only — `iface.methods` is parsed by the
// analyzer (types.ts:69 carries it, populated) and then never read.
//
// KNOWN GAP — deliberately left failing, no analyzer fix attached.
//
// This is the most severe finding on this rung because it is CHECKER-
// INVISIBLE: the emitted `.tmd` for the fixture below is
//
//   Repository %
//     - id: string
//
// and `typed-mind-cli --check` reports "No errors found!". The `save`
// method is gone with zero diagnostic — silent data loss, not a
// surfaced failure. Every other gap on this rung announces itself.
//
// Distilled from packages/hub/src/surface/route-module.ts:16-24 —
// `RouteModule` declares `handleRead?` and `handleWrite?` and nothing else,
// so its extracted DTO is entirely EMPTY. 16 route classes across
// packages/hub/src/surface/routes/*.ts implement it (e.g.
// machines-routes.ts:205,301), so the hub target's whole route-module
// contract is missing from the extracted architecture while the checker
// reports that target clean.
//
// Not fixed here: the sound repair is to classify a method-bearing
// interface as a Class-like entity rather than a DTO, which is exactly what
// the checker already assumes (valid-references.ts:51 — "In TypedMind,
// interfaces are represented as Classes") and would also resolve fixture
// 67. That is a classification change across all 4 convertInterfaceToDTO
// call sites with wide golden blast radius — a design decision for the
// operator, not a local patch.
export interface Repository {
  id: string;
  save(row: string): void;
}

export const persist = (repository: Repository): void => {
  repository.save('row');
};
