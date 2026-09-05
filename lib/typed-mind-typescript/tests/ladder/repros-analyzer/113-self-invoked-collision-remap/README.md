# 113 — a collision-losing entrypoint's self-invoked function reached Program.exports under its raw name

Reproduced by the PR #186 reviewer on main (typedmind residual burndown Q10, 2026-09-05).

## Symptom

`src/index.ts` and `src/engine.ts` both export `runWorker`; `index.ts` sorts
later, so its declaration is emitted as `IndexFile.runWorker`. `index.ts`
also calls `runWorker()` under an `import.meta.url` guard. Program.exports
came out as `[IndexFile.runWorker, runWorker]` and the checker reported
`checker/multi-exported: Entity 'runWorker' is exported by multiple files: IndexApp, EngineFile`.

## Root cause

`typescript-to-typedmind-converter.ts`, `createProgramEntity`: the
self-invoked fold (X-AN-11, filtered by Q3's `emittedSelfInvokedFunctionNames`)
pushed RAW source names into the same list that `extractPublicExportsFromEntrypoint`
had already collision-remapped through `functionNameRemap`.

## Fix

The fold resolves each name through the hoisted `remapEntrypointExportName`
helper — the same `${entryFilePath}::${name}` chain the public exports use —
so it can only name the entrypoint's own emitted entity.

## Entrypoints

- `src/index.ts` — collision LOSER (`src/engine.ts` sorts first). Expected `Program.exports: [IndexFile.runWorker]`.
- `src/main.ts` — control, collision WINNER (`src/main.ts` < `src/support.ts`). Expected `Program.exports: [runWorker]`, unchanged.
