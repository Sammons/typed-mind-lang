// Corpus: sammons/artifice-with-intelligence server/db.ts:83
// (`export const withTransaction = <T>(db: Database, run: () => T): T => {}`).
//
// A GENERIC arrow-const function's own type parameter leaks into the
// checker's reference slots. The analyzer never reads
// `node.typeParameters` (the same missing read knownGap 68 documents for
// interfaces and type aliases), so `T` is emitted as if it named a real
// entity, and the checker reports:
//   "Function output DTO 'T' not found"
//
// This is a DIFFERENT converter path from knownGap 68. Gap 68 travels
// `convertInterfaceToDTO` / `convertTypeAliasToDTO` and surfaces as
// "DTO 'X' field 'y' references undefined type 'T'". This one travels the
// FUNCTION path and surfaces on `FunctionNode.output`. A fix scoped to the
// DTO paths would leave this shape still failing, which is why it gets its
// own fixture.
//
// Controls: a non-generic function returning a real DTO, and a generic
// function whose type parameter never reaches input/output, both already
// behave correctly on main.
export type Ledger = {
  balance: number;
};

// The gap: `T` is this function's OWN type parameter, not an entity.
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
