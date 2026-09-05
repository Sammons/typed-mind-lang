# 126 — a same-file `new` of a class that fused into a ClassFile credits the class

RFC-TM-14 (`rfc-tm-14-diamond.md`) §S1/§S2, leaf **R1a-conv**, Quantum U1.
The doc assigns this fixture number 126 (S2-14, S3-2: 112 was taken by Q11).

## Shapes

- `src/walker.ts`: exported `Walker` is the file's only class, so it fuses into
  the ClassFile `Walker` (the live `CstToAstWalker` shape, `live-02:399`);
  `walk` constructs it.
- `src/cursor.ts`: non-exported `Cursor` is the file's only class and still fuses
  into the ClassFile `Cursor` (the live `TextCursor` / `SignatureSource` shape,
  `live-02:440,467`); `scan` constructs it.
- `src/main.ts` is the entry and imports `walk` and `scan`.

## Expected

- `walk ~> [Walker.constructor]`, `scan ~> [Cursor.constructor]`.
- Zero `checker/orphaned-entity` findings.
- Removing either `new` restores exactly that class's orphan finding.

## Before

`resolveSameFileCallEdges` folded a same-file `new` only for an exported class
that converted as a plain `ClassNode` (`calls.to` excluded ClassFile), so both
ClassFiles were orphans; `Cursor` was refused on the export test first.
