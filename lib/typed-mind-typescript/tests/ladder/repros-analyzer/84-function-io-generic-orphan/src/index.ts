// Corpus: sammons/s7-constructor lib/ui/src/api.ts and lib/ui/src/parse.ts.
// The types live in src/api.ts; src/index.ts is the entrypoint barrel.
// The live extraction reports 3 of the ui-index entrypoint's diagnostics as
// "Orphaned entity 'ApiResult'" / "'ParseResult'" / "'LoadState'", even though
// each type IS used — but used ONLY nested inside a generic in a function
// signature, e.g.
//   fetchConstructs :: fetchConstructs() => Promise<ApiResult<Construct[]>>
//   parseConstructsBody :: parseConstructsBody(body: unknown) => ParseResult<Construct[]>
//
// Root cause (checker layer): `collectReferencedNames`
// (lib/typed-mind/src/checker/check-orphans.ts:77-81) adds `FunctionNode.input`
// and `FunctionNode.output` to the `referenced` set as RAW STRINGS:
//     if (entity.input !== undefined) { referenced.add(entity.input); }
// `input`/`output` are plain `string | undefined` on the AST node
// (lib/typed-mind/src/ast/function-node.ts:16-17), never parsed into a
// `TypeExprNode`. So the set gains the literal key "Promise<ApiResult>" and
// never the name "ApiResult".
//
// The asymmetry is the proof: `check-orphans.ts` ALREADY has a structured
// walker, `collectTypeExprReferences` (same file, lines 36-63), which recurses
// through `generic`/`union`/`array` nodes and adds `node.base.name` plus every
// argument. It is applied to DTO fields (the `DtoNode` branch, line ~100) and
// to nothing else. A DTO field typed `Promise<Wrapped>` marks `Wrapped`
// referenced; a function output typed `Promise<Wrapped>` does not.
//
// Verified against the checker directly: a function whose output is the BARE
// name `Wrapped` produces zero diagnostics, while `Promise<Wrapped>` produces
// "Orphaned entity 'Wrapped'". The generic wrapper is the entire trigger.
import { fetchWrapped, countBoxes } from './api.ts';

// A side-effect-shaped entrypoint, matching the real corpus's lib/ui/src/index.ts:
// nothing here re-exports `Wrapped`/`Boxed`, so neither name lands in the
// Program's `exports:` list. That is what leaves the generic-nested function
// signature as their ONLY referent.
export const boot = async (): Promise<number> => {
  const rows = await fetchWrapped();
  return countBoxes(rows.map((row) => ({ count: row.value.length })));
};
