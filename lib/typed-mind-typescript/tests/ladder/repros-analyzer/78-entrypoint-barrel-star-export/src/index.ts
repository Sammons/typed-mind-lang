// Corpus: sammons/code-outline-cli packages/formatter/src/index.ts, whose
// ENTIRE body is `export * from './formatter.ts';`. The package entrypoint
// IS the barrel, so the analyzer's `namespace-reexport` ParsedExport (name
// `'*'`) lands in the entrypoint's own export registry entry and
// `extractPublicExportsFromEntrypoint` pushes the literal `'*'` into
// Program.exports — emitting the ungrammatical `exports: [*]`.
//
// 10-export-star does NOT cover this: there the barrel is a NON-entrypoint
// (`src/lib.ts`) and the entrypoint is an ordinary module, so `'*'` never
// reaches the Program's exports list.
export * from './formatter.ts';
