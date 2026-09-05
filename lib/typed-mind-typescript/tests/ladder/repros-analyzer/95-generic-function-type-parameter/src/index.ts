// Corpus: sammons/artifice-with-intelligence server/db.ts:83
// (`export const withTransaction = <T>(db: Database, run: () => T): T => {}`).
//
// A GENERIC arrow-const function's own type parameter used to leak into the
// checker's reference slots. The analyzer used to never read
// `node.typeParameters` (the same missing read gap 68 documented for
// interfaces and type aliases), so `T` was emitted as if it named a real
// entity, and the checker reported:
//   "Function output DTO 'T' not found"
//
// This was a DIFFERENT converter path from gap 68: gap 68 travels
// `convertInterfaceToDTO` / `convertTypeAliasToDTO` and surfaces as
// "DTO 'X' field 'y' references undefined type 'T'", while this one travels
// the FUNCTION path and surfaces on `FunctionNode.output`. A fix scoped to
// the DTO paths alone would have left this shape still failing, which is why
// it kept its own fixture.
//
// FIXED (RFC-TM-13 G, gap 95): the function's own type parameters are now
// declared on `FunctionNode.typeParameters` and bound lexically, so `T`
// resolves to the function's own binder instead of a fabricated global
// entity — see the 'FIXED GAP 95' describe block in
// rung-artifice-with-intelligence.test.ts and
// https://git.tail4ea214.ts.net/sammons/typed-mind-lang/pulls/181.
//
// Controls: a non-generic function returning a real DTO, and a generic
// function whose type parameter never reaches input/output, both already
// behaved correctly on main and still do.
export type Ledger = {
  balance: number;
};

// `T` is this function's OWN type parameter, not an entity.
export const withTransaction = <T>(run: () => T): T => {
  return run();
};

// Control: a concrete return type resolves to a real DTO. Correct on main.
export const readLedger = (): Ledger => {
  return { balance: 0 };
};

// Control: a generic whose parameter stays inside the body, never in the
// emitted signature slots. Correct on main.
export const countOf = (items: readonly Ledger[]): number => {
  return items.length;
};
