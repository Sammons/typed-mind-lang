// issue #87 repro — a same-directory module whose export is imported WITH
// an explicit `.ts` extension by main.ts, mirroring the real AstValidator
// shape (ast-validator.ts:18-32 imports `./check-orphans.ts` et al.).
export function checkOrphans(name: string): boolean {
  return name.length > 0;
}
