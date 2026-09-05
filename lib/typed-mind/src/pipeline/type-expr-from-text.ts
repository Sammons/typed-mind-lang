// RFC-TM-8 §1 (rfc-tm-8-diamond.md, X-TYPE-1) — a hand-rolled recursive-
// descent parser over a bare type-expression STRING, mirroring the grammar's
// own precedence (type_union → type_intersection → type_postfix → type_atom)
// and its six structured kinds plus the type_opaque fallback (doc §1). Two
// call sites cannot get a nested CST tree straight from tree-sitter and need
// this instead:
//   - the longform `type:` property's value is a QUOTED STRING at the
//     grammar level (corpus: every longform-fixture `type: "string[]"`
//     spelling — snippets/dto-longform.tmd, hero-longform.tmd,
//     constants-longform.tmd) — its inner text is opaque to tree-sitter, so
//     the structure the checker (Q2) will walk has to come from parsing that
//     extracted string;
//   - type_readonly_array's parenthesized element (`readonly (A | B)[]`) —
//     readonly_paren_rest is a FLAT, non-recursive token (mirrors
//     _paren_group's one-level grouping, grammar.js), so its inner text
//     needs the same re-parse to become a real TypeExprNode tree rather than
//     staying a flat string.
//
// This parser is per `handroll_validation_at_boundaries` (no parser-
// generator dependency for a second grammar surface) and stays a pure
// function: text in, TypeExprNode out, no tree-sitter/wasm involved. It is
// NOT the grammar — the grammar (X-TYPE-1) is the single source of truth for
// what shortform accepts; this text parser exists only because two positions
// hand this module a string instead of a CST subtree, and it recognizes the
// identical vocabulary so a longform `type: "string | number"` field
// resolves to the same union structure a shortform field would.

import type { Position, Span } from '../ast/span.ts';
import type { TypeExprNode, TypeNamedNode } from '../ast/type-expr-node.ts';
import { scanQuotedString } from '../quoted-string.ts';

export interface ParseTypeExprTextOptions {
  // The 1-based line/column where `text[0]` sits in the real document —
  // spans are computed relative to this offset so a readonly-array element
  // or a longform quoted-string's inner type carries a real position, not a
  // text-relative one starting at (1,1). Defaults to (1, 1) for isolated use
  // (e.g. tests).
  readonly baseLine?: number;
  readonly baseColumn?: number;
}

export interface ParseTypeExprTextResult {
  readonly typeExpr: TypeExprNode;
  // Unconsumed trailing text, if any — always empty for a well-formed type
  // expression; the doc's opaque fallback absorbs anything the six
  // structured kinds don't recognize, so a non-empty remainder signals a
  // parser bug, not a legitimately-unparsable input.
  readonly remainder: string;
}

const NAMED_TOKEN = /^[A-Za-z_]\w*/;
const NUMBER_TOKEN = /^-?\d+(\.\d+)?/;
const READONLY_PREFIX = /^readonly[ \t]+(?=[A-Za-z_(])/;
// Mirrors grammar.js's _qualified_name_opaque_token: a dotted/qualified type
// reference (`ts.CompilerOptions`) has no structured production and must
// fall to type_opaque, exactly like the grammar-side fix for the same shape
// (review finding B1) — this is the longest-match check at the SAME position
// a bare NAMED_TOKEN would also match, so it must be tried FIRST.
const QUALIFIED_NAME_TOKEN = /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+/;

class TextCursor {
  readonly text: string;
  index = 0;
  readonly baseLine: number;
  readonly baseColumn: number;

  constructor(text: string, baseLine: number, baseColumn: number) {
    this.text = text;
    this.baseLine = baseLine;
    this.baseColumn = baseColumn;
  }

  positionAt(index: number): Position {
    // Type-expression text is always single-line (field_type/readonly_paren_rest/
    // a longform quoted string's inner text never carry a real newline — the
    // grammar excludes '\n' from every text-carrying token in this family).
    return { line: this.baseLine, column: this.baseColumn + index };
  }

  skipWhitespace(): void {
    while (this.index < this.text.length) {
      const char = this.text[this.index];
      if (char === undefined || !isWhitespaceChar(char)) {
        break;
      }
      this.index += 1;
    }
  }

  peek(): string {
    return this.text.slice(this.index);
  }

  startsWith(literal: string): boolean {
    return this.text.startsWith(literal, this.index);
  }
}

// An opaque leaf's text is emitted verbatim into a single grammar token, and
// every text-carrying token in that family excludes '\n' (see TextCursor.
// positionAt's own note). A multi-line source type — a function type authored
// across lines, the corpus shape from sammons/code-outline-cli's
// `tree-utils.ts` — must therefore collapse to one line before it can be
// re-parsed. Runs of whitespace (including newlines) become a single space,
// which preserves token separation without inventing or dropping any text.
//
// The single space is then REMOVED immediately inside a PAREN or BRACKET pair
// and before a comma: the grammar's own opaque-run tokens reject `( a: T )`
// and `(a: T , b: U)` while accepting `(a: T, b: U)` (verified against the
// checker). Collapsing a newline to a space is what makes the text
// single-line; dropping the space at those positions is what keeps it inside
// the token the grammar actually accepts. Whitespace BETWEEN tokens (`=> T`,
// `A | B`) is preserved, since the grammar requires it there.
//
// BRACES are deliberately excluded from that tightening: an inline object
// literal's canonical spelling in this codebase is `{ a: string, b: number }`
// WITH the inner spaces (see type-expr-from-text.test.ts's object-literal
// cases and lib/typed-mind-typescript/architecture.tmd:102), so stripping
// them would rewrite a shape the corpus already fixes.
//
// The whole transform is a NO-OP unless the text actually spans lines. A
// single-line opaque leaf is already inside the grammar's token — it only
// needs the pre-existing `trim()`. Scoping the rewrite to the multi-line case
// keeps this fix confined to the shape it exists for and leaves every
// already-correct single-line spelling byte-identical.
//
// LITERAL-AWARENESS (PR #156 review finding): the rewrite is a single
// left-to-right scan, not a chain of text-blind regexes. A regex pass cannot
// tell a structural bracket from one INSIDE a string literal, so
// `'( x )' | Foo` (a legal literal-type member whose own text carries spaces
// next to brackets) would silently become `'(x)' | Foo` — changing the type's
// MEANING, since a string-literal type's value is its exact characters. This
// scan copies any single-quoted, double-quoted, or backtick-quoted span
// through byte-for-byte (honoring backslash escapes) and applies whitespace
// rules only to the structural text between literals.
const isWhitespaceChar = (char: string): boolean => {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r';
};

const normalizeOpaqueWhitespace = (text: string): string => {
  if (!/[\n\r]/.test(text)) {
    return text.trim();
  }

  const trimmed = text.trim();
  let result = '';
  let index = 0;

  while (index < trimmed.length) {
    const char = trimmed[index];
    if (char === undefined) {
      break;
    }

    // A quoted span is copied verbatim — including its own whitespace and
    // brackets — so literal text is byte-preserved.
    if (char === "'" || char === '"' || char === '`') {
      const quote = char;
      let cursor = index + 1;
      while (cursor < trimmed.length) {
        const inner = trimmed[cursor];
        if (inner === '\\') {
          cursor += 2;
          continue;
        }
        if (inner === quote) {
          cursor += 1;
          break;
        }
        cursor += 1;
      }
      result += trimmed.slice(index, Math.min(cursor, trimmed.length));
      index = Math.min(cursor, trimmed.length);
      continue;
    }

    if (isWhitespaceChar(char)) {
      // Collapse the whole run, then decide whether it survives at all.
      let cursor = index;
      while (cursor < trimmed.length) {
        const runChar = trimmed[cursor];
        if (runChar === undefined || !isWhitespaceChar(runChar)) {
          break;
        }
        cursor += 1;
      }
      const previousChar = result[result.length - 1];
      const nextChar = trimmed[cursor];
      // Drop the space just inside a paren/bracket pair and before a comma —
      // the grammar's opaque-run tokens reject `( a: T )` and `(a: T , b: U)`.
      // Braces are excluded on purpose (see the object-literal note above).
      const dropsBefore = nextChar === ')' || nextChar === ']' || nextChar === ',';
      const dropsAfter = previousChar === '(' || previousChar === '[';
      if (nextChar !== undefined && !dropsBefore && !dropsAfter) {
        result += ' ';
      }
      index = cursor;
      continue;
    }

    result += char;
    index += 1;
  }

  return result;
};

const spanFrom = (cursor: TextCursor, startIndex: number, endIndex: number): Span => {
  return { start: cursor.positionAt(startIndex), end: cursor.positionAt(endIndex) };
};

const parseNamed = (cursor: TextCursor): TypeNamedNode | undefined => {
  const match = NAMED_TOKEN.exec(cursor.peek());
  if (match === null) {
    return undefined;
  }
  const startIndex = cursor.index;
  cursor.index += match[0].length;
  return { kind: 'named', name: match[0], span: spanFrom(cursor, startIndex, cursor.index) };
};

const parseStringLiteral = (cursor: TextCursor): TypeExprNode | undefined => {
  const startIndex = cursor.index;
  const literal = scanQuotedString(cursor.text, startIndex);
  if (literal === undefined) {
    return undefined;
  }
  cursor.index = literal.endIndex;
  return {
    kind: 'literal',
    literalKind: 'string',
    value: literal.value,
    span: spanFrom(cursor, startIndex, cursor.index),
  };
};

const parseNumberLiteral = (cursor: TextCursor): TypeExprNode | undefined => {
  const match = NUMBER_TOKEN.exec(cursor.peek());
  if (match === null) {
    return undefined;
  }
  const startIndex = cursor.index;
  cursor.index += match[0].length;
  return { kind: 'literal', literalKind: 'number', value: match[0], span: spanFrom(cursor, startIndex, cursor.index) };
};

// Balances (), [], {} to arbitrary depth exactly like the grammar's
// _opaque_run/_opaque_piece family — the text-parser twin of that recursive
// production, since this module cannot invoke the grammar recursively.
//
// `<`/`>` are NOT tracked on the same bracket-closer stack as `()`/`[]`/`{}`
// (issue #118). A generic's `<...>` is not a reliably-paired bracket the way
// `(`/`[`/`{` are: an opaque leaf's own text can carry an UNMATCHED `>` that
// opens nothing, most commonly an arrow-function-type's `=>` (`(result:
// string) => void`, a corpus-confirmed opaque category per RFC-TM-8 §1) —
// treating a bare `>` as a stack closer there would end the opaque run one
// character early and truncate `=>` to `=`. That is exactly the defect
// `splitObjectLiteralProperties`'s own doc comment records finding and fixing
// the same way (typescript-to-typedmind-converter.ts): track angle-bracket
// depth SEPARATELY, clamp it at zero, and never let an unmatched `>` corrupt
// the count.
//
// So `<`/`>` only matter here when `inGenericArgs` is true — i.e. this scan
// runs while parsing one of a generic's comma-separated arguments
// (`parseAtom`'s `<...>` branch passes it down). In that context a bare `>`
// at angle-depth 0 is the generic's OWN closing `>` and must end the opaque
// run unconsumed (mirroring how an unmatched `)`/`]`/`}` at depth 0 ends it
// unconsumed) so the caller's `cursor.startsWith('>')` check can consume it;
// leaving it consumed here is issue #118's bug — a union member like
// `{ b: string }` swallowed the generic's closing `>` into its own opaque
// text and the parse never returned to the outer union/generic.
//
// Review finding (PR #119): the angleDepth counter alone is not enough. An
// arrow-function-typed generic ARGUMENT (`Record<string, (result: string) =>
// void>` — an event-handler-map shape, not just the top-level case the first
// version of this fix guarded) puts `=>` at bracket-depth 0 INSIDE the
// generic's args, same as a real closing `>` would sit. angleDepth is 0 in
// both cases (no `<` was ever opened to balance), so the counter alone
// cannot tell "this `>` closes the enclosing generic" from "this `>` is the
// second half of `=>` and opens/closes nothing." The two are distinguished
// by lookback: a `>` immediately preceded by `=` is `=>` and is never a
// generic closer (TypeScript's arrow token is the only bare, unbracketed
// `=>`/`>=`/`<=` shape the opaque fallback needs to admit — a generic can
// never itself end in `=>`). That `=>`/`>=`/`<=` lookback is scanned
// regardless of `inGenericArgs` so the same protection also applies while
// PARSING an arrow-typed opaque leaf found inside a generic's own args as
// itself a candidate for this branch (defensive: the `<`/`>` characters of
// `<=`/`>=` must never bump angleDepth either, for the same reason).
// A `<` the run opens itself must be balanced WITHIN the run, so a `|` sitting
// inside one of those pairs is not mistaken for a top-level union operator.
// That is counted unconditionally in the loop below (see its own comment), and
// is deliberately NOT folded into `inGenericArgs`, whose contract is the
// opposite one: `inGenericArgs` means an unmatched `>` at depth 0 belongs to an
// ENCLOSING generic and must END the run unconsumed. Both conditions can hold
// at once (a function type nested inside a generic's argument list), and the
// single depth counter serves both: it only ever ends the run at depth 0.
const scanOpaqueRun = (cursor: TextCursor, inGenericArgs = false): string => {
  const startIndex = cursor.index;
  const stack: string[] = [];
  const closerFor: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  let angleDepth = 0;
  while (cursor.index < cursor.text.length) {
    const ch = cursor.text[cursor.index];
    const prevCh = cursor.index > startIndex ? cursor.text[cursor.index - 1] : undefined;
    if (ch === '"' && stack.length === 0) {
      break;
    }
    if (ch === undefined) {
      break;
    }
    if (ch === '(' || ch === '[' || ch === '{') {
      stack.push(closerFor[ch] ?? '');
      cursor.index += 1;
      continue;
    }
    if (ch === ')' || ch === ']' || ch === '}') {
      if (stack.length > 0 && stack[stack.length - 1] === ch) {
        stack.pop();
        cursor.index += 1;
        continue;
      }
      // An unmatched closer at depth 0 ends the opaque run (mirrors the
      // grammar: an opaque leaf never consumes a closer it did not open).
      if (stack.length === 0) {
        break;
      }
      cursor.index += 1;
      continue;
    }
    // `=>`/`>=`/`<=` are two-character tokens whose `<`/`>` half opens or
    // closes nothing — never let them touch angleDepth or the generic-closer
    // check below, at any bracket depth (mirrors splitObjectLiteralProperties's
    // own `=>` carve-out, PR #84 finding).
    const isArrowOrComparisonAngle = (ch === '>' || ch === '<') && (prevCh === '=' || cursor.text[cursor.index + 1] === '=');
    // Angle depth is counted REGARDLESS of `inGenericArgs`, because the
    // `|`/`&` check below consults `angleDepth` regardless of it too. Gating
    // only the increment on `inGenericArgs` made the two halves disagree: at
    // the top level (`inGenericArgs === false`) a `<` never bumped the depth,
    // so a `|` nested inside a generic's arguments read as depth 0 — i.e. as
    // a TOP-LEVEL union — and ended the opaque run mid-type.
    //
    // The corpus shape is an arrow-function type whose RETURN is a generic
    // over a union, reached through `parseAtom`'s `=>` rescan (which passes
    // the enclosing `inGenericArgs`, false at the top level):
    // `(pk: string, sk: string) => Promise<DedupRecord | null>` split into
    // the bogus union `(pk: string, sk: string) => Promise<DedupRecord` plus
    // `null`, orphaning the trailing `>` into `remainder` — the non-empty
    // remainder this module's own doc comment calls a parser bug. Corpora:
    // sammons/bens-almanac packages/{nhtsa,usda}-ingestion/src/handler.ts
    // (`IngestionDeps`, fixture 86) and sammons/s7-constructor
    // `lib/harness/src/model-client.ts` (`S7ModelClient`) plus
    // `lib/harness/src/forks.ts` (`S7ForkRunner`) (fixture 82).
    //
    // Only the BREAK on a closing `>` at depth 0 stays gated on
    // `inGenericArgs`: that `>` belongs to the enclosing generic and must be
    // left unconsumed for the caller (issue #118). At the top level there is
    // no enclosing generic, so an unmatched `>` is ordinary opaque text —
    // clamping at zero rather than breaking preserves that.
    //
    // This supersedes the earlier `trackOwnAngles` parameter (PR #159), which
    // solved the same defect by opting individual CALL SITES into counting the
    // angles a run opens itself. Counting unconditionally is a strict superset:
    // it needs no parameter, and it covers the third call site — `parseAtom`'s
    // bare-identifier opaque fallback — that the opt-in never reached.
    if (stack.length === 0 && !isArrowOrComparisonAngle) {
      if (ch === '<') {
        angleDepth += 1;
        cursor.index += 1;
        continue;
      }
      if (ch === '>') {
        if (angleDepth === 0) {
          if (inGenericArgs) {
            // The enclosing generic's own closing '>' — end the run
            // unconsumed, same as an unmatched bracket closer at depth 0.
            break;
          }
          // Top level: nothing encloses this '>', so it is opaque text.
          // Clamp at zero (never negative) per the doc comment above.
          cursor.index += 1;
          continue;
        }
        angleDepth -= 1;
        cursor.index += 1;
        continue;
      }
    }
    if (stack.length === 0 && angleDepth === 0 && (ch === '|' || ch === '&')) {
      // Top-level union/intersection operators end an opaque run so
      // `union: string | number` still splits on '|' even when 'string'
      // itself fell through to opaque for some other reason; inside a
      // bracket/paren group (or, when inGenericArgs, inside a nested `<>`),
      // '|'/'&' are part of the opaque text (e.g. a function-type union
      // return position) and stay consumed.
      break;
    }
    if (inGenericArgs && stack.length === 0 && angleDepth === 0 && ch === ',') {
      // A generic's own argument separator ends the run unconsumed so the
      // caller's comma-loop (parseAtom's `<...>` branch) sees it, mirroring
      // the '>' case above — a top-level ',' inside a generic's args is
      // never part of one argument's opaque text.
      break;
    }
    cursor.index += 1;
  }
  return cursor.text.slice(startIndex, cursor.index);
};

// `inGenericArgs` (default false) is threaded down from a generic's
// comma-separated argument list (this function's own `<...>` branch below)
// through every level of the recursive descent so `scanOpaqueRun` — however
// deeply nested inside a union/intersection/postfix inside one argument —
// knows a bare top-level `>`/`,` belongs to the ENCLOSING generic, not to its
// own opaque text (issue #118). A parenthesized group resets it to `false`:
// `(...)` is its own closed boundary with its own `)`, independent of any
// outer generic's `>` — `Pick<(A | B), "x">`'s parenthesized argument must
// not let a stray unmatched `>` inside it escape past the group.
const parseAtom = (cursor: TextCursor, inGenericArgs = false): TypeExprNode => {
  cursor.skipWhitespace();
  const readonlyMatch = READONLY_PREFIX.exec(cursor.peek());
  if (readonlyMatch !== null) {
    const startIndex = cursor.index;
    cursor.index += readonlyMatch[0].length;
    const element = parseAtom(cursor, inGenericArgs);
    cursor.skipWhitespace();
    if (cursor.startsWith('[]')) {
      cursor.index += 2;
      return { kind: 'array', element, readonly: true, spelling: 'suffix', span: spanFrom(cursor, startIndex, cursor.index) };
    }
    // No trailing `[]` after all — `readonly` was not actually the array
    // prefix (defensive: the grammar-level compound token already prevents
    // this from occurring at a real call site; kept for a text parser that
    // may see hand-constructed input in isolation, e.g. tests).
    cursor.index = startIndex;
  }
  if (cursor.startsWith('(')) {
    const startIndex = cursor.index;
    cursor.index += 1;
    const inner = parseUnion(cursor, false);
    cursor.skipWhitespace();
    if (cursor.startsWith(')')) {
      cursor.index += 1;
      // A `(`-led run is a parenthesized type GROUP only when nothing
      // follows it; when the next token is `=>`, the parens were a function
      // type's PARAMETER LIST, not a group (`(node: NodeInfo) => T`).
      // Returning `inner` there silently dropped both the parens and the
      // `=> T` return type into `remainder`, which every caller discards
      // (`parseTypeExprText(...).typeExpr`) — the module's own doc comment
      // states a non-empty remainder "signals a parser bug". The observable
      // damage: a function-type alias emitted its bare parameter text as the
      // whole TypeDef (`TreeVisitor = node: NodeInfo,` + two orphan lines),
      // which the grammar then rejected as `syntax/error`. Corpus:
      // sammons/code-outline-cli `packages/parser/src/tree-utils.ts`
      // (`TreeVisitor`, `NodePredicate`).
      //
      // A function type has no structured kind in this grammar (RFC-TM-8 §1
      // lists arrow-function types as a corpus-confirmed OPAQUE category),
      // so the whole `(params) => Return` run is rescanned as one opaque
      // leaf from the original `(`.
      const afterGroupIndex = cursor.index;
      cursor.skipWhitespace();
      if (cursor.startsWith('=>')) {
        cursor.index = startIndex;
        // The return position may be a generic carrying a union
        // (`(a: X) => Promise<Y | Z>`); `scanOpaqueRun` counts the angles the
        // run opens itself unconditionally, so that `|` stays inside the run.
        const text = scanOpaqueRun(cursor, inGenericArgs);
        return { kind: 'opaque', text: normalizeOpaqueWhitespace(text), span: spanFrom(cursor, startIndex, cursor.index) };
      }
      cursor.index = afterGroupIndex;
      return inner;
    }
    // Unbalanced — fall through to opaque scanning from the original start.
    //
    // This is the path a real function type takes. `parseUnion` above stops at
    // the `:` of a PARAMETER LIST (`(a: X) => ...` parses `a` then halts on
    // `:`), so `cursor.startsWith(')')` is false and the `=>` rescan branch
    // above is never reached — only a parameterless `()` or a true type group
    // gets there. The same angle-counting protection therefore matters here as
    // well: the run may still span a return-position generic carrying a union
    // (`(a: X) => Promise<Y | Z>`), whose `|` must not be read as a top-level
    // union operator. `scanOpaqueRun` counts those angles unconditionally, so
    // this site needs no opt-in. See its own comment for the full rationale.
    cursor.index = startIndex;
    const text = scanOpaqueRun(cursor, inGenericArgs);
    return { kind: 'opaque', text: normalizeOpaqueWhitespace(text), span: spanFrom(cursor, startIndex, cursor.index) };
  }
  const stringLiteral = parseStringLiteral(cursor);
  if (stringLiteral !== undefined) {
    return stringLiteral;
  }
  const numberLiteral = parseNumberLiteral(cursor);
  if (numberLiteral !== undefined) {
    return numberLiteral;
  }
  // Qualified/dotted name check BEFORE the plain named-type check (review
  // finding B1): both match the SAME leading identifier at this position,
  // but the qualified form is the objectively longer match, so it must win
  // outright — routing straight to opaque exactly like grammar.js's
  // _qualified_name_opaque_token does for the identical shape.
  const qualifiedMatch = QUALIFIED_NAME_TOKEN.exec(cursor.peek());
  if (qualifiedMatch !== null) {
    const startIndex = cursor.index;
    cursor.index += qualifiedMatch[0].length;
    return { kind: 'opaque', text: qualifiedMatch[0], span: spanFrom(cursor, startIndex, cursor.index) };
  }
  const namedStartIndex = cursor.index;
  const named = parseNamed(cursor);
  if (named !== undefined) {
    cursor.skipWhitespace();
    if (cursor.startsWith('<')) {
      cursor.index += 1;
      const args: TypeExprNode[] = [parseUnion(cursor, true)];
      cursor.skipWhitespace();
      while (cursor.startsWith(',')) {
        cursor.index += 1;
        args.push(parseUnion(cursor, true));
        cursor.skipWhitespace();
      }
      if (cursor.startsWith('>')) {
        cursor.index += 1;
      }
      const genericSpan = spanFrom(cursor, namedStartIndex, cursor.index);
      // Review finding B3 / lead ruling: mirror type-expr-from-cst.ts's
      // Array<T> normalization (doc §2 — Array only, one argument, base
      // name literally "Array"; no other generic base normalizes).
      const [onlyArg] = args;
      if (named.name === 'Array' && args.length === 1 && onlyArg !== undefined) {
        return { kind: 'array', element: onlyArg, readonly: false, spelling: 'generic', span: genericSpan };
      }
      return { kind: 'generic', base: named, args, span: genericSpan };
    }
    return named;
  }
  const startIndex = cursor.index;
  const text = scanOpaqueRun(cursor, inGenericArgs);
  if (text.length === 0) {
    // Nothing recognizable and nothing to balance-scan (e.g. a stray
    // operator at the very start) — consume one character so the parser
    // always makes progress, matching the grammar's own always-terminates
    // guarantee (doc's "parsing never throws on malformed input").
    cursor.index += 1;
    return { kind: 'opaque', text: cursor.text.slice(startIndex, cursor.index), span: spanFrom(cursor, startIndex, cursor.index) };
  }
  return { kind: 'opaque', text: normalizeOpaqueWhitespace(text), span: spanFrom(cursor, startIndex, cursor.index) };
};

const parsePostfix = (cursor: TextCursor, inGenericArgs = false): TypeExprNode => {
  const elementStartIndex = cursor.index;
  let result = parseAtom(cursor, inGenericArgs);
  cursor.skipWhitespace();
  while (cursor.startsWith('[]')) {
    cursor.index += 2;
    // The array's own span covers the WHOLE expression (element through the
    // closing `]`), not just the `[]` suffix — spanFrom's start must be the
    // element's own start position, captured BEFORE parseAtom advanced the
    // cursor past it (a prior bug here used cursor.index at the `[` position,
    // producing a span that started after the element instead of before it).
    result = {
      kind: 'array',
      element: result,
      readonly: false,
      spelling: 'suffix',
      span: spanFrom(cursor, elementStartIndex, cursor.index),
    };
    cursor.skipWhitespace();
  }
  return result;
};

const parseIntersection = (cursor: TextCursor, inGenericArgs = false): TypeExprNode => {
  const startIndex = cursor.index;
  const members = [parsePostfix(cursor, inGenericArgs)];
  cursor.skipWhitespace();
  while (cursor.startsWith('&')) {
    cursor.index += 1;
    members.push(parsePostfix(cursor, inGenericArgs));
    cursor.skipWhitespace();
  }
  if (members.length === 1) {
    const [only] = members;
    if (only !== undefined) {
      return only;
    }
  }
  return { kind: 'intersection', members, span: spanFrom(cursor, startIndex, cursor.index) };
};

const parseUnion = (cursor: TextCursor, inGenericArgs = false): TypeExprNode => {
  const startIndex = cursor.index;
  const members = [parseIntersection(cursor, inGenericArgs)];
  cursor.skipWhitespace();
  while (cursor.startsWith('|')) {
    cursor.index += 1;
    members.push(parseIntersection(cursor, inGenericArgs));
    cursor.skipWhitespace();
  }
  if (members.length === 1) {
    const [only] = members;
    if (only !== undefined) {
      return only;
    }
  }
  return { kind: 'union', members, span: spanFrom(cursor, startIndex, cursor.index) };
};

export const parseTypeExprText = (text: string, options: ParseTypeExprTextOptions = {}): ParseTypeExprTextResult => {
  const cursor = new TextCursor(text, options.baseLine ?? 1, options.baseColumn ?? 1);
  cursor.skipWhitespace();
  const typeExpr = parseUnion(cursor);
  return { typeExpr, remainder: cursor.text.slice(cursor.index) };
};
