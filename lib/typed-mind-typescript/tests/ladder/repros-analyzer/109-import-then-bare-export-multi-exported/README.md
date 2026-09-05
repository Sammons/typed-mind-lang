# 109 — import-then-bare-export: issue #62's documented residual

Corpus: `sammons/typed-mind-lang`, `lib/typed-mind/src/emitter/syntax-emitter.ts:14-20`.

```ts
import { detectFormat, type FormatDetectionResult, type SyntaxFormat } from './detect-format.ts';
export type { FormatDetectionResult, SyntaxFormat };
export { detectFormat };
```

## Historical finding

`checker/multi-exported` — `Entity 'detectFormat' is exported by multiple files`
(3 instances on the 2026-08-29 core run, `core-diagnostic-disposition-2026-08-29.md:44`).
The analyzer recorded the source-less `export { detectFormat }` with no
`source`, `isReExport` therefore treated it as the forwarding file's own
declaration, and both `detect-format.ts` and `syntax-emitter.ts` listed the
name in `exports:`. Issue #62's closing comment deferred this exact shape;
RFC-TM-13 draft residual 2 (`rfc-tm-13-draft.md:97`) asked for a separate
reproduction on current main.

## Outcome: CLEAN — closed by RFC-TM-13 unit R (barrel provenance)

Unit R makes the analyzer resolve a bare `export { X }` / `export type { X }`
whose `X` was bound by an import to that import's specifier, so
`ParsedExport.source` carries the provenance and `isReExport` routes the
name to `reExports`. On current main the fixture converts with zero
warnings and checks with zero diagnostics:

```
DetectFormatFile @ src/detect-format.ts:
  -> [FormatDetectionResult, detectFormat]

FormatApiFile @ src/format-api.ts:
  <- [detectFormat, FormatDetectionResult]
  -> [formatLabel]
  <-> [FormatDetectionResult, detectFormat]

classfile SyntaxEmitter {
  path: src/syntax-emitter.ts
  imports: [detectFormat, FormatDetectionResult]
  exports: [EmitOptions, SyntaxEmitter]
}
```

Two forwarders are present on purpose:

- `syntax-emitter.ts` declares a class, so it fuses into a ClassFile — the
  corpus entity shape the finding was observed on. A ClassFile carries no
  `reexports:` slot (RFC-TM-11 §RX-1); the provenance fact is the ABSENCE
  of the two names from its `exports:`.
- `format-api.ts` declares no class, so it is a plain File and shows the
  provenance fact positively as `<-> [FormatDetectionResult, detectFormat]`.

## What the test pins

`reexport-provenance-residuals.test.ts` (Q7 item 1) asserts the exact
absence of `checker/multi-exported`, the declaring file as sole exporter,
both forwarders' export lists, and a fully clean check. The golden is
`goldens-tmd/109-import-then-bare-export-multi-exported.tmd`.
