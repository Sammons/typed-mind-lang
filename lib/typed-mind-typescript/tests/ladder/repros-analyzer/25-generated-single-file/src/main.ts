// RFC-TM-9 §9 (rfc-tm-9-diamond.md, X-SUPP-6) fixture — a module-private
// class (never exported from its declaring module), the census's
// `CstBlockKw`-shaped 'generated-single-file-scope' reason: "no cross-file
// import exists anywhere" is a fact TypeScript's own scoping GUARANTEES for
// a non-exported symbol, not a heuristic. `InternalRegistryEntry` is
// constructed only inside `describe`, this file's own exported function.
class InternalRegistryEntry {
  constructor(private readonly label: string) {}

  describe(): string {
    return this.label;
  }
}

export function describe(label: string): string {
  return new InternalRegistryEntry(label).describe();
}
