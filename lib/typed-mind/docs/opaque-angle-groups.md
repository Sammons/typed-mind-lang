# Opaque angle groups

RFC-TM-13 C gives the tree-sitter grammar one stateless external token,
`_opaque_angle_group`, for balanced angle groups inside an opaque type. For
example, a DTO field can retain this entire callback type:

```tmd
Data %
  - load: (id: string) => Promise<Result<string | null>>
```

The ordinary opaque chunk excludes `<`, so it cannot consume `Promise<`
before the scanner sees the opener. Structured generic types still use
`type_generic`. A union or description after the closing group remains outside
the opaque token. This is the narrow S-GRAMMAR-3 amendment accepted in RFC-TM-13;
header names and whitespace significance keep their existing grammar.

The scanner balances angles, parentheses, brackets and braces on one dynamic
stack. Quoted strings preserve escapes and delimiter characters. Backtick
interpolation resumes the surrounding template after its closing brace, even
when the interpolation contains a nested template. Arrows and `<=`/`>=` do not
close or open angle groups. A physical newline, unfinished quote, mismatched
closer or EOF before closure rejects the complete token. No scanner state is
serialized between tokens.

This token preserves syntax; it does not evaluate TypeScript types or find
references inside arbitrary opaque text. Comments are not a separate lexical
mode inside this token. Physical multiline literal types remain unsupported.

## Evidence

- [Native/WASM corpus](../grammar/test/corpus/tm13-opaque-angles.txt) pins nested
  returns, structured generic controls, quoted delimiters, nested templates,
  outer boundaries and recovery before the next declaration.
- [WASM tests](../src/pipeline/opaque-angle-scanner.test.ts) compare valid,
  malformed and fresh/incremental parses, including final lines without a
  trailing newline.
- [Original82 callback fixture](../../typed-mind-typescript/tests/ladder/rung-s7-constructor.test.ts)
  and [original86/87 fixtures](../../typed-mind-typescript/tests/ladder/rung-bens-almanac.test.ts)
  retain their complete emitted types and check clean. Removing the closing
  angle from86 restores a syntax error.

Before/after native comparison at the C implementation checkpoint covered234
tracked `.tmd` files, using separate native caches and identical input bytes.
Only three trees changed:86 and87 lost their syntax errors; scenario56 retained
the same error ranges, with three incidental identifier children removed inside
already-invalid multiline signature fragments. The other231 trees were
identical. All154 grammar corpus cases passed in both native and WASM builds.
Native and WASM fresh/incremental trees agreed for valid→invalid→valid edits.

The existing build freshness scan includes every file under `grammar/src/`,
including `scanner.c`. Native compilation with C11 warnings treated as errors,
WASM compilation, and generated parser/CST/documentation checks cover the same
source. WASM remains a generated build artifact under the existing packaging
rules.
