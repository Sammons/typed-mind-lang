# Quoted callback types

RFC-TM-13 residual sequence item 3 closes a format fidelity defect in DTO fields.
A longform type `(mode: "read" | "write") => void` previously parsed, but emitting
shortform produced syntax errors at its quoted parameter types. A callback nested
inside an object type had the same problem.

The inner parameter-list and opaque-parenthesis bodies now admit balanced strings.
Both use the same choice: an opaque piece at precedence 1 or a string at precedence
-1. This resolves their repeat reduction against the outer opaque run without a
conflicts declaration. Applying precedence to the whole repetition did not resolve
the generator conflict. The outer continuation remains string-free, so the quoted
field description and optional marker remain outside the type. The external angle
scanner is unchanged.

Evidence relative to the integrated C baseline `52811bf`:

- All 234 tracked `.tmd` native parse trees are byte-identical after removing timing
  footers. Before and after use isolated parser caches.
- All 154 existing corpus fixtures pass on native and WASM, plus four new callback
  and malformed locality fixtures in `grammar/test/corpus/tm13-quoted-callbacks.txt`.
- The 207 quoting, toggle and callback tests pass, including current issue #103
  fixtures. That issue remains closed.
- `src/pipeline/quoted-callback-types.test.ts` preserves exact type text across
  LF/SF/LF, escaped quotes/backslashes, quoted closing delimiters, nested callbacks,
  structured string unions, descriptions and optional markers. Missing quotes or
  parentheses fail locally; valid-invalid-valid incremental trees match fresh trees
  at EOF. Native incremental checks also match fresh trees in both directions.

This change retains opaque type text. It does not evaluate TypeScript callback
assignability or introduce a new type expression kind. Existing physical multiline
literal limitations remain in force.
