// Ladder rung: sammons/slat-harness (RFC-TM-9 §8 X-LADDER-2 re-evaluation),
// PR #162 review blockers 1 and 2.
//
// Fixture 69 established the shape rule: a method-bearing interface converts
// to a Class so its methods survive. This fixture pins the rule's EDGES —
// the cases where "method-bearing" is not a property of the interface's own
// declaration, and the cases where the Class lane drops something.
//
// BLOCKER 2 — the shape decision must read the RESOLVED HERITAGE CHAIN, not
// own members. `isMethodBearingInterface` originally read `iface.methods`
// alone, so `ChildOfMethodIface` below took the DTO lane and emitted a
// fieldless `ChildOfMethodIface %` with no `<: HasMethod` edge and no
// diagnostic. The inherited `doIt` contract was unreachable through the
// child, and a `class X implements ChildOfMethodIface` resolved against an
// empty DTO. That is gap 69's own symptom one level up — a method vanishing
// with zero signal — so it is fixed the same way: the decision now walks the
// chain (`resolveInterfaceIsMethodBearing`).
//
// BLOCKER 1 — the Class lane has no field surface, so a MIXED interface's
// properties are dropped. That loss is unavoidable inside the current grammar
// (adding fields to Class or methods to DTO is a language change) but it must
// not be SILENT: fixture 69's own header names silent loss as the most severe
// finding on this rung, and the fix must not reintroduce it pointed the other
// way. Both mixed interfaces below emit a property-loss warning naming every
// dropped property.
//
// The four cases, one per interface pair:

// 1. Method-bearing parent. Class lane, the control.
export interface HasMethod {
  doIt(): void;
}

// 2. Child declaring NOTHING, extending a method-bearing parent.
//    Class lane via inherited methods, and keeps its `<: HasMethod` edge.
//    No property-loss warning: it has no properties to lose.
export interface ChildOfMethodIface extends HasMethod {}

// 3. Child with its OWN properties, extending a method-bearing parent.
//    Class lane (inherited methods win), so `label` is dropped — WITH a
//    warning that says "inherits methods", not "declares methods", because
//    the declaration below contains no method for a reader to find.
export interface ChildWithOwnProps extends HasMethod {
  label: string;
}

// 4. Property-only parent and a property-only child. BOTH stay on the DTO
//    lane, unchanged by this fix. This is the negative half: without it, a
//    regression that swept every interface with a heritage clause onto the
//    Class lane would still pass every assertion above.
export interface PropertyOnlyParent {
  size: number;
}

export interface ChildOfPropertyOnly extends PropertyOnlyParent {
  color: string;
}

export const inspect = (a: ChildOfMethodIface, b: ChildWithOwnProps, c: ChildOfPropertyOnly): void => {
  void a;
  void b;
  void c;
};
