// toggle-fidelity audit (2026-08-31, claude-home knowledge/projects/typedmind/
// toggle-fidelity-audit-2026-08-31.md) — the shared quoting choke point every
// emitter call site routes a description/purpose/reason/string-literal value
// through before wrapping it in `"..."`.
//
// The grammar's `string` token is `/"[^"\n]*"/` (grammar.js) — there is no
// escape production for an embedded double quote (confirmed: no `\"`
// handling anywhere in grammar.js, and a backslash-escaped quote still
// closes the string early since `\` is just an ordinary char inside
// `[^"\n]*`). A literal `"` inside emitted text is therefore structurally
// UNREPRESENTABLE in `.tmd` source — no alternative grammar production could
// recover it either, since the constraint is lexical, not a parse-precedence
// choice (contrast issue #103's GLR precedence race, a different mechanism
// entirely).
//
// Same fix shape as issue #113's typescript-to-typedmind-converter.ts
// escapeDescriptionQuotes: swap every embedded `"` for `'` — a
// meaning-preserving substitution the string token CAN carry (`'` is not
// excluded by `/"[^"\n]*"/`), not a strip or truncation. `'113` fixed this at
// the EXTRACTION-PIPELINE layer only; this module closes the same gap at the
// SyntaxEmitter layer so toggleFormat/emitShortform/emitLongform never
// corrupt output for every AST field that happens to carry a literal quote,
// regardless of how that field's value was constructed.
export const quoteStringLiteral = (text: string): string => `"${text.replace(/"/g, "'")}"`;
