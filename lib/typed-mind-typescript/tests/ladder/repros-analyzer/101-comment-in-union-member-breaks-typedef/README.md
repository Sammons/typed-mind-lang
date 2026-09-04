# 101 — a comment inside a union member breaks the emitted TypeDef across lines

Corpus: `sammons/slat` (`products/slat`), fixtures 98-101 rung.

## Symptom

`ParseStampMaterialValueFailure` (7 variants, whose last member carries a
six-line JSDoc block) emitted a TypeDef spanning **six physical lines**. A
TypeDef emits on one line, so the comment's own newlines split the entity and
the parser reported a cascade of `Unparsable text` findings — the document is
structurally corrupt from that point forward, not merely one bad entity.

This is the highest-severity shape in the rung: the other three gaps lose
information, this one invalidates the rest of the document.

## Root cause

`typescript-analyzer.ts`, `parseTypeAlias`.

A comment attached to a union member is part of that member's source text, so
TypeScript's `getText()` carries it into the alias's type string verbatim,
newlines and all. Nothing downstream removes it before the emitter prints the
TypeDef on a single line.

## Fix

Strip comments from the alias's type text at the point where it is captured.
Block comments are removed first (they may contain `//`), then line comments,
then whitespace runs collapse to single spaces — so the result is
newline-free regardless of the source's formatting.

Comments carry no type information. The alias's own description is unaffected:
it comes from `extractJSDocDescription(node.name)`, which reads the
declaration's doc comment off the AST rather than out of the type text.
