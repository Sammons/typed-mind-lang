// Ladder rung: sammons/slat-harness, PR #162 review blocker 2 — the
// UNRESOLVABLE half of the heritage rule.
//
// `resolveInterfaceIsMethodBearing` walks the `extends` chain to decide the
// lane. A parent it cannot find in the program (an external interface from
// node_modules, a type alias used as a parent, or a module the traversal
// never reached) has unknowable members: the walk can neither prove nor
// disprove a method.
//
// The rule in that case: fall back to the OWN-MEMBER decision and WARN. The
// fallback is deliberately conservative — an unresolvable parent never flips
// a property-only interface onto the Class lane, because doing so would strip
// its fields on nothing more than a guess. But it is also never silent, which
// is the standard the rest of this rung is held to.
//
// `ExternalShape` is declared in no module of this program; nothing imports
// it and nothing defines it. That is exactly what an unresolved parent looks
// like to the converter.
export interface ExtendsUnknown extends ExternalShape {
  id: string;
}

export const read = (value: ExtendsUnknown): string => {
  return value.id;
};
