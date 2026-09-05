/**
 * TypedMind grammar — RFC-TM-2 (rfc-tm-2-diamond.md).
 *
 * GENERATED ARTIFACTS: this file is the source of truth. `src/parser.c`,
 * `src/grammar.json`, and `src/node-types.json` are `tree-sitter generate`
 * output, committed (doc §3 "Layout"), and diff-gated against this file by
 * `scripts/check-generated.mjs` steps 1-2 — any edit here that changes
 * `tree-sitter generate`'s output requires regenerating and committing those
 * three files in the same change, or `pnpm run check:generated` fails.
 * `grammar.wasm` is never committed (`.gitignore` + `check:generated` step 5);
 * CI builds it fresh pre-merge (step 4) and post-merge (the deploy wasm step).
 *
 * FROZEN PATH: `lib/typed-mind/grammar/` is the frozen path named by the doc's
 * §3 "Layout" and referenced by `check-toolchain.mjs`, `check-generated.mjs`,
 * and `.gitea/workflows/deploy-static-site.yml` — do not relocate this
 * directory without updating every one of those references in the same
 * change (S-ARTIFACT-1).
 *
 * See rfc-tm-2-diamond.md §2 ("Grammar architecture") for the full design
 * rationale behind every mechanism below, and its "Rejected Alternatives"
 * appendix for the `extras: []` GLR-crash design, the external-C-scanner
 * option (narrowly amended by RFC-TM-13 C for atomic opaque angle groups),
 * and the generic key-value object grammar this file deliberately does NOT use.
 *
 * Q0 (spike, merged to main) proved and shipped four load-bearing mechanisms
 * that this Q1 change extends without redesigning:
 * - extras are [' ', '\t'] with only '\n' significant; NO zero-width
 *   anonymous tokens anywhere (the v1 `extras: []` design crashed GLR
 *   error recovery — doc §2, Rejected Alternatives).
 * - The S-GRAMMAR-3 whitespace-prefix invariant: `_indent: token(/[ \t]+/)`
 *   is preferred over the extras at column 0 (generate-time verified).
 * - Error recovery is path A: no catch-all `error_line`; malformed lines
 *   rely on built-in recovery producing genuine ERROR nodes.
 * - Keyword strategy is design (a): keywords are reserved in block-header
 *   position ONLY, via compound header tokens (`kw ws name ws? {` as one
 *   token). Everywhere else a keyword lexes as a plain entity_name.
 * - Inline comment (S-GRAMMAR-1b role c) is chunk-based: free-text line
 *   tails (signatures, field types) are repeat1 of whitespace-free chunk
 *   tokens, and the inline_comment token requires whitespace AFTER the
 *   '#'. Longest match then splits a padded trailing comment off the
 *   signature, while an un-padded '#' inside signature text stays inside
 *   its chunk.
 *
 * Q1 (merged to main) shipped all 11 entity declarations, all 15
 * continuation forms, D2/D3/D4, and both directions of S-GRAMMAR-4b
 * name-class normalization.
 *
 * Q2 scope (this change, doc §4 "Q2 — Braced longform"): all 12 braced
 * longform header forms H1-H12 with typed name extraction, property lines
 * P1-P7 (scalar, quoted, array, nested field blocks, inline field objects,
 * comments, total free-text fallback), one-level nesting, mandatory `{`,
 * shortform/longform mixing, the colon-longform-yields-ERROR fixture
 * (S-GRAMMAR-2), and the unterminated-block-recovers-as-ERROR fixture.
 *
 * H1-H12 name-extraction design (resolves the Q0-deferred question named in
 * this Quantum's brief — "the compound header token buries the name"):
 *
 * Empirically re-verified before choosing this design (matches the doc's
 * own Q0 findings in §2/FAQ-6, reproduced independently here): a keyword
 * token that stops at `keyword+ws` (no identifier-shaped suffix baked in)
 * is *always* the longest match at that position when whitespace alone
 * follows, so it wins over `entity_name` regardless of what comes next —
 * `class :: (x) => y` mis-lexes `class ` as the keyword and strands `::`.
 * This holds whether the keyword is a raw string, a `token()`, wrapped in
 * `prec.dynamic` (a parse-level tool with no lexer authority), or supplied
 * via automatic keyword extraction (`word: $.entity_name` plus bare string
 * literals — tree-sitter's keyword-extraction optimization prefers the
 * literal unconditionally, the same failure GE-4/FAQ-6 documented). No
 * lookaround exists to make the keyword token conditional on what follows
 * without consuming it.
 *
 * The fix: keep the ENTIRE disambiguating run — keyword + whitespace + the
 * name's first identifier character — as one atomic token (`block_kw`).
 * That first name-character is what makes `block_kw`'s match fail on
 * `class :: ...` (no identifier character follows the space there), so the
 * token only wins when a real name is actually present — restoring exactly
 * Q0's proven safety property. The REST of the name (chars 2..n, absent for
 * single-character names) is lexed as an immediately-adjacent sibling token
 * (`header_name_rest`, `token.immediate` — no extras may intervene) rather
 * than living inside the same opaque token. `header_name` is a small
 * wrapper production aliasing that split back onto one named node so
 * consumers see a single typed name node per header, exactly like every
 * other declaration's `entity_name` — its two children reassemble to the
 * full name (`block_kw`'s last character + `header_name_rest`'s text, the
 * latter possibly absent). This is the only mechanism found (here and in
 * the doc's own round of testing) that is both scanner-free and produces a
 * distinguishable name node; a true un-split single-node extraction would
 * require a separate external scanner. RFC-TM-13 C amends S-GRAMMAR-3
 * only for atomic, stateless opaque angle groups; header names stay structured.
 */

// X-TYPE-7 (rfc-tm-8-diamond.md §5): `typedef` gains full longform support
// (`typedef Name { ... }`) for free through the shared block_header/
// LONGFORM_KIND_BY_KEYWORD machinery every other keyword already uses — no
// new longform mechanism, same H1-H11 shape.
const KEYWORDS = [
  'program',
  'file',
  'function',
  'class',
  'dto',
  'component',
  'asset',
  'constants',
  'parameter',
  'dependency',
  'classfile',
  'typedef',
];

// block_kw: keyword + required whitespace + the name's first identifier
// character, baked into ONE atomic token. This is the minimal disambiguating
// suffix — see the header comment above for why anything shorter (bare
// `keyword+ws`) reproduces the doc's documented mis-lex on `class :: ...`.
const blockKwToken = (keyword) => token(seq(keyword, /[ \t]+/, /[A-Za-z_]/));

// H10's quoted-name variant: `dependency "..."` disambiguates the same way
// as every identifier-named header, but the required suffix baked into the
// atomic token is the OPENING QUOTE (never a valid `entity_name` character)
// instead of an identifier's first letter — a quote right after
// `dependency `'s whitespace can only mean the quoted-header form, so
// `dependency ^ "..."` (E11 shortform) and `dependency :: ...` (sigil
// position) are both unaffected, exactly like the identifier-suffix design.
const dependencyQuotedKwToken = token(seq('dependency', /[ \t]+/, '"'));

// X-TYPE-1 (rfc-tm-8-diamond.md §1): the `readonly` array-type prefix
// (`readonly string[]`, `readonly (A | B)[]`) needs the SAME blockKwToken
// disambiguation as every header keyword — `readonly` is not itself a
// reserved word (it lexes as a plain `entity_name`/`type_named` everywhere
// else), so `readonly[]` (no whitespace before the suffix) must keep lexing
// as the named type `readonly` with an array suffix, never as the
// readonly-array keyword. Three concrete compound tokens cover the three
// legal continuations after `readonly `'s whitespace (an identifier's first
// character, the `(` that opens a parenthesized group, or the `{` that opens
// an inline object-literal element type — corpus-confirmed regression fix:
// lib/typed-mind-typescript/architecture.tmd:102 `readonly { name: string;
// value?: string }[]`) because — per the H10 precedent (header_quoted_name)
// — the token can only bake in ONE disambiguating suffix character, and that
// character's grammar-visible re-lexing differs by shape (identifier rest,
// a flat paren-group rest, or a flat brace-group rest, all mirroring
// `_paren_group`'s non-recursive one-level grouping — the brace-rest form
// inherits the same "no corpus-attested nested-brace element" simplification
// the paren form already makes). Adversarial case, answered (doc §1):
// `readonly[]` has no whitespace-plus-[identifier-start|`(`|`{`] after the
// keyword, so NO compound token matches, and the text lexes as `type_named`
// "readonly" + an array suffix — the readings never collide.
const readonlyIdentKwToken = token(seq('readonly', /[ \t]+/, /[A-Za-z_]/));
const readonlyParenKwToken = token(seq('readonly', /[ \t]+/, '('));
const readonlyBraceKwToken = token(seq('readonly', /[ \t]+/, '{'));

// X-SUPP-1 (rfc-tm-8-diamond.md §7): `suppress` needs the SAME blockKwToken
// disambiguation as every header keyword and as `readonly` above — `suppress`
// is not itself a reserved word (a bare literal would become an
// independently-lexable token and mis-lex `suppress` used as an entity name
// in sigil positions, e.g. `suppress -> Main`, the same GE-4/FAQ-6 failure
// class the header comment documents at length for `dependency`). Two
// concrete compound tokens cover the two legal continuations: the shortform
// line's target-name identifier, and the longform block's opening brace.
const suppressIdentKwToken = token(seq('suppress', /[ \t]+/, /[A-Za-z_]/));
const suppressBraceKwToken = token(seq('suppress', /[ \t]+/, '{'));

// X-TYPE-7 (rfc-tm-8-diamond.md §5): the shortform TypeDef declaration's enum
// variant (`Name = enum [A, B]`) needs the SAME blockKwToken-style
// disambiguation as `readonly` — `enum` is not a reserved word anywhere else
// (it lexes as a plain `entity_name`/`type_named`), so a TypeDef alias whose
// aliased type is literally the bare name `enum` (`Name = enum`, no `[`
// following) must keep lexing as the named type "enum", never as the
// enum-variant keyword. UNLIKE readonly's compound tokens (which bake in only
// ONE disambiguating character and let a sibling `token.immediate` rest
// production reclaim the remainder), this token bakes in the FULL `enum [`
// prefix INCLUDING the opening bracket, and typedef_enum_variant's member
// list is a bespoke `name_list`-shaped body (not a reuse of the shared
// `name_list` production) that starts directly at the first list entry — no
// second `[` token to consume, since enumKwToken already consumed it. An
// earlier draft reused `$.name_list` here, which independently re-matches its
// own leading `token(prec(1, '['))`; with the bracket already eaten by
// enumKwToken, that second `[` was never in the input stream, producing an
// unparsable ERROR region (confirmed via `tree-sitter test --wasm` on the
// debug corpus fixture) — this bespoke body is the fix.
const enumKwToken = token(seq('enum', /[ \t]+/, '['));

module.exports = grammar({
  name: 'typed_mind',

  // Lexical design (S-GRAMMAR-3, doc §2 "Newline significance"): spaces and
  // tabs are skippable INSIDE a line; only `\n` is significant. This is the
  // REVISED-after-empirical-testing design — the original `extras: []` plus
  // anonymous zero-width spacing tokens crashed/hung tree-sitter's GLR error
  // recovery (see the file-header pointer to "Rejected Alternatives" above).
  extras: () => [' ', '\t'],

  // Atomic and stateless: only opaque derivations offer this token. Ordinary
  // generic types continue to use the structured productions below.
  externals: ($) => [$._opaque_angle_group],

  rules: {
    // Q1 refinement (spike report item): the last line of a file must
    // parse without a MISSING _newline. `_line_end` still requires `\n`
    // for the common case (every corpus fixture is newline-terminated),
    // but the final `_line` in the file may omit it — this is expressed
    // as an alternate top-level rule rather than making `_newline` itself
    // optional (which would let every _line_end silently accept no
    // newline and break line-boundary disambiguation everywhere else).
    source_file: ($) => seq(repeat($._line), optional($._final_line_no_newline)),

    // Error recovery (S-GRAMMAR-4a): PATH A shipped — there is deliberately
    // NO catch-all `error_line` alternative below. A line matching none of
    // these choices falls through to tree-sitter's built-in GLR recovery,
    // producing a genuine `(ERROR)` node with real ranges (doc §2 "Q0 SPIKE
    // QUESTION with a decision rule"; Q0's fuzz gate proved this terminates
    // cleanly under the revised extras design above). Downstream consumers
    // (TM-3's S-PARSE-3 diagnostics mapper) walk `(ERROR)`/`(MISSING)` only —
    // the standard idiom, not a second node shape to scan for.
    _line: ($) =>
      choice(
        $.comment_line,
        $.import_statement,
        $.suppress_line,
        $.suppression_block,
        $.longform_block,
        $.classfile_block_sigil,
        $.program_declaration,
        $.file_declaration,
        $.function_declaration,
        $.class_declaration,
        $.classfile_declaration,
        $.constants_declaration,
        $.dto_declaration,
        $.asset_declaration,
        $.uicomponent_declaration,
        $.runparameter_declaration,
        $.dependency_declaration,
        $.typedef_declaration,
        $.dto_field,
        $._continuation,
        $._description_line,
        $._ws_line,
        $._newline,
      ),

    // The EOF-without-trailing-newline case: reuse of every top-level
    // production's body via `_line_end_final` (no trailing `\n` consumed).
    // Only entity declarations, continuations, and comments are legal as
    // the last line of a file with no newline; blank/whitespace-only
    // "lines" at EOF need no representation since there is nothing after
    // them to delimit.
    _final_line_no_newline: ($) =>
      choice(
        $.comment_line_final,
        $.import_statement_final,
        $.suppress_line_final,
        $.program_declaration_final,
        $.file_declaration_final,
        $.function_declaration_final,
        $.class_declaration_final,
        $.classfile_declaration_final,
        $.constants_declaration_final,
        $.dto_declaration_final,
        $.asset_declaration_final,
        $.uicomponent_declaration_final,
        $.runparameter_declaration_final,
        $.dependency_declaration_final,
        $.typedef_declaration_final,
        $.dto_field_final,
        $._continuation_final,
        $._description_line_final,
      ),

    // --- document-level (D1, D3, D4) -------------------------------------

    // D1: full-line comment at column 0.
    comment_line: ($) => seq($.comment, $._newline),
    comment_line_final: ($) => seq($.comment),

    // D3: `@import "path" [as Alias]` / `import "path" [as Alias]`. The
    // intro is one compound token for the same reason as block headers:
    // a bare `import` followed by a sigil must stay a valid entity name.
    // D2 scoping: import lines do NOT admit an inline comment
    // (parser.ts:667-678 passes the raw line to parseImport with no
    // extractInlineComment call) — no `optional($.inline_comment)` here,
    // unlike every declaration/continuation production below.
    import_statement: ($) => seq($.import_head, optional(seq('as', $.entity_name)), $._line_end),
    import_statement_final: ($) => seq($.import_head, optional(seq('as', $.entity_name))),

    // --- suppression (X-SUPP-1, rfc-tm-8-diamond.md §7) -------------------
    // Document-level, like import_statement: a suppression's target entity
    // may not exist (the absence IS the stale case I-10 requires the checker
    // to see), so this cannot be an entity-attached continuation — it is a
    // sibling top-level line/block, never closing or attaching to the open
    // entity (mirrors #handleImport's "does not close the open entity"
    // precedent, not #handleLongform's close-on-block precedent, because a
    // suppression is not itself a declaration).
    //
    // Shortform: `suppress Target checker/some-code "reason"` — keyword,
    // target entity name, check code, MANDATORY quoted reason. `suppress`'s
    // trailing whitespace-plus-first-name-character is baked into one atomic
    // token (suppressIdentKwToken, defined above) via the SAME header_name
    // split mechanism H1-H11 use (block_kw's last consumed char +
    // header_name_rest reassemble the full target name) — reused verbatim
    // rather than inventing a second name-splitting shape.
    suppress_line: ($) =>
      seq(
        alias(suppressIdentKwToken, $.suppress_kw),
        field('target', optional($.header_name_rest)),
        field('code', $.check_code),
        field('reason', $.string),
        optional($.inline_comment),
        $._line_end,
      ),
    suppress_line_final: ($) =>
      seq(
        alias(suppressIdentKwToken, $.suppress_kw),
        field('target', optional($.header_name_rest)),
        field('code', $.check_code),
        field('reason', $.string),
        optional($.inline_comment),
      ),

    // Longform: `suppress { <entry>* }`, one entry per line, entry shape
    // identical to the shortform tail (`target code "reason"`, no leading
    // keyword). The block token bakes `suppress`-plus-`{` the same way H10's
    // `dependencyQuotedKwToken` bakes its opening quote — a bare `'suppress'`
    // string literal would become its own independently-lexable token and
    // reproduce the GE-4/FAQ-6 mis-lex this Quantum's header comment (above,
    // at suppressIdentKwToken/suppressBraceKwToken) already guards against.
    suppression_block: ($) =>
      seq(
        alias(suppressBraceKwToken, $.suppress_block_kw),
        $._newline,
        repeat(choice($._newline, $.block_comment_line, $.suppression_entry)),
        '}',
        $._line_end,
      ),

    // One suppression entry inside a longform block: `target code "reason"`,
    // no keyword (the block header already established suppression context,
    // mirroring dto_fields_block's per-field lines carrying no repeated
    // `fields` keyword). Reason is mandatory at the grammar level here too —
    // a reasonless entry does not parse, same as the shortform line.
    suppression_entry: ($) =>
      seq(
        $._block_indent,
        field('target', $.entity_name),
        field('code', $.check_code),
        field('reason', $.string),
        optional($.inline_comment),
        $._newline,
      ),

    // check_code: `checker/orphaned-entity`-shaped, used ONLY inside
    // suppression productions (suppress_line/suppress_line_final's tail and
    // suppression_entry) — tree-sitter's contextual lexing (the grammar
    // position after a suppression's target name never also admits `path`,
    // which is a document-level-file-declaration/classfile token) keeps this
    // token from colliding with `path`'s much wider `/[^ \t\n:{}]+/` class,
    // per the doc's explicit collision callout (§7).
    check_code: () => /[a-z]+\/[a-z][a-z0-9-]*/,

    // --- longform block (H1-H12, P1-P7 — RFC-TM-2 §2 "Longform blocks") --

    // H1-H11: `keyword Name {`. The 10 plain-keyword headers (H1-H10's
    // non-dependency members plus H11 `classfile`) share one shape; H10
    // `dependency` additionally admits a QUOTED name (the scoped-package
    // asymmetry fix, doc §1 "The `dependency` header (H10) additionally
    // admits a QUOTED name" — `dependency "@types/node" {`,
    // snippets/dependency-longform.tmd:17,22). `header_name` is the typed
    // name wrapper described in the file header comment above: its two
    // children (`_header_name_head`, an inline/hidden alias of block_kw's
    // trailing character, is NOT re-emitted — the visible child is
    // `header_name_rest`) sum to the full name text together with
    // block_kw's own last character. The quoted-name alternative for
    // `dependency` is the `string` token directly — no `block_kw` split
    // needed since a quote is never an identifier char.
    longform_block: ($) =>
      seq($.block_header, $._newline, repeat(choice($._newline, $.block_comment_line, $.block_property)), '}', $._line_end),

    // No explicit whitespace token before '{': `extras` already skips
    // spaces/tabs between grammar-level tokens. An earlier draft added a
    // bare `/[ \t]*/` here; that zero-width-capable anonymous token
    // collided with `_block_indent` at the lexer level (both are
    // `[ \t]`-shaped and registered as competing candidates at the SAME
    // input position once a nested field body's indentation is being
    // lexed), causing indentation before a field's closing `}` to be
    // mis-consumed as a phantom `block_header` continuation instead of
    // `_block_indent`. Removed — the exact zero-width-anonymous-token
    // pathology the doc's §2 "Newline significance" section already
    // warns against in a different guise (GE-1's `extras: []` crash was
    // the same family of bug at the top-level extras design; this was its
    // ordinary-grammar-token echo).
    block_header: ($) =>
      choice(
        ...KEYWORDS.filter((k) => k !== 'dependency').map((k) =>
          seq(
            alias(blockKwToken(k), $.block_kw),
            field('name', optional($.header_name_rest)),
            ...(['dto', 'typedef', 'function', 'class', 'classfile'].includes(k) ? [optional($.type_parameters)] : []),
            '{',
          ),
        ),
        // H10: `dependency Name {` (identifier form, same shape as the rest)
        // OR `dependency "quoted-name" {` (H10's quoted-name liberalization,
        // scoped-package headers — snippets/dependency-longform.tmd:17,22
        // `dependency "@types/node" {`). The quoted-name alternative CANNOT
        // use a bare `'dependency'` string literal here: an earlier draft
        // did, and that literal became its OWN independently-lexable token
        // (tree-sitter registers every distinct literal as a token symbol
        // in its own right), which mis-lexed `dependency -> Main` and every
        // other keyword×sigil case for `dependency` — the exact GE-4/FAQ-6
        // failure this Quantum's brief called out, reproduced here for a
        // literal instead of a `word`-extracted keyword. Fixed the same way
        // as every other header: bake the disambiguating suffix (here, the
        // OPENING QUOTE — a quote can never start a plain `entity_name`) into
        // one atomic `block_kw`-shaped token, then let the string body lex
        // as an immediately-adjacent sibling token.
        seq(alias(blockKwToken('dependency'), $.block_kw), field('name', optional($.header_name_rest)), '{'),
        seq(alias(dependencyQuotedKwToken, $.block_kw), field('name', $.header_quoted_name), '{'),
      ),

    // header_quoted_name: the string body immediately following the opening
    // quote that `dependencyQuotedKwToken` already consumed (`token.immediate`
    // — no extras between the quote and its content). Reassembling the full
    // quoted literal is the opening `"` (inside block_kw's text) + this
    // node's text; downstream consumers needing the true declared-string
    // shape can also re-derive it as `"` + header_quoted_name.text.
    header_quoted_name: () => token.immediate(/([^"\\\r\n]|\\[^\r\n])*"/),

    // header_name_rest: chars 2..n of a header name (token.immediate — no
    // extras may intervene between block_kw's baked-in first character and
    // this token, keeping the split invisible to any whitespace-tolerant
    // reassembly). Absent for single-character names (`dto X {`).
    header_name_rest: () => token.immediate(/\w*(?:\.[A-Za-z_]\w*)*/),

    // H12: sigil-with-brace ClassFile (S-GRAMMAR-2a) — `Name #: path [<:
    // Base[, Iface...]] {`. Starts with a plain `entity_name`, so it needs
    // no compound-token disambiguation (a quote/sigil can never be mistaken
    // for a keyword-header prefix here). Observed: hero-longform.tmd:8
    // `TodoService #: api.ts {`, classfile-longform.tmd:24,31.
    classfile_block_sigil: ($) =>
      seq(
        $.entity_name,
        optional($.type_parameters),
        '#:',
        $.path,
        optional(seq('<:', $.inherit_list)),
        '{',
        $._newline,
        repeat(choice($._newline, $.block_comment_line, $.block_property)),
        '}',
        $._line_end,
      ),

    // Block bodies are P1-P7 property lines plus P6 comments plus blank
    // lines, repeated (inlined at each use site — a hidden `repeat()`-only
    // rule that can match empty is rejected by tree-sitter except as the
    // grammar's start rule). An unterminated block (no closing `}` before
    // EOF) simply runs out of matchable alternatives and falls through to
    // built-in ERROR recovery at EOF — the same path-A mechanism Q0 proved
    // terminates without a scanner (doc §2 "an unterminated block hits EOF
    // as an ERROR-class node").

    // P6: `#` comment line inside a block body (same comment token as D1,
    // scoped to block-body position for its own fixture-bindable node).
    block_comment_line: ($) => seq($._block_indent, $.comment, $._newline),

    // Property lines share a common prefix (indent + key + ':') then
    // branch on value shape. Each shape is its own named production per
    // the doc's "typed productions with named nodes... rather than a
    // generic object grammar" (§2) so node-types.json carries typed field
    // shapes for TM-3's codegen.
    block_property: ($) =>
      choice(
        $.property_string, // P1: key: "string"
        $.property_list, // P2: key: [a, b]
        $.dto_fields_block, // P5: fields: { <nested per-field blocks> }
        $.property_nested_block, // P5 (non-`fields` nested object; same shape, generic key)
        $.dto_field_inline, // P5b named ONLY inside a fields block — see below
        $.property_bool, // P4: key: true|false
        $.property_identifier, // P3: key: identifier
        $.property_freetext, // P7: total fallback — key: <rest-of-line>
      ),

    // P1: `key: "string"`.
    property_string: ($) => seq($._block_indent, $.property_key, ':', $.string, optional($.inline_comment), $._newline),

    // P2: `key: [a, b]`. Reuses C1-C15's `name_list` token class
    // (list_entry already widened for dotted/scoped/dashed entries, e.g.
    // `calls: [Database.delete]` — scenario-31-mixed-syntax.tmd:30).
    property_list: ($) => seq($._block_indent, $.property_key, ':', $.name_list, optional($.inline_comment), $._newline),

    // P4: `key: true|false`.
    property_bool: ($) => seq($._block_indent, $.property_key, ':', $.bool_literal, optional($.inline_comment), $._newline),

    // P3: `key: identifier` (e.g. `entry: api`, `extends: BaseController`).
    // The value token is `choice($.entity_name, alias($.bool_prefixed_identifier,
    // $.entity_name))` — see `bool_prefixed_identifier`'s definition for why
    // a plain `$.entity_name` reference alone is not enough to correctly
    // handle identifiers that start with `true`/`false` (`trueClassName`,
    // `falseAlarmHandler`).
    property_identifier: ($) =>
      seq(
        $._block_indent,
        $.property_key,
        ':',
        choice(alias($._property_identifier_name, $.entity_name), alias($.bool_prefixed_identifier, $.entity_name)),
        optional($.inline_comment),
        $._newline,
      ),

    // P5: `fields: {` with per-field blocks `fieldName: {` ... `}` (ONE
    // nesting level — doc §1 "Nested field objects stop at ONE level").
    // `fields` is the corpus-attested key (dto-longform.tmd, hero-longform,
    // classfile-longform); the production is named for it directly since
    // it is the only nested-container key observed with per-field bodies.
    dto_fields_block: ($) =>
      seq(
        $._block_indent,
        alias('fields', $.property_key),
        ':',
        '{',
        $._newline,
        repeat(choice($._newline, $.block_comment_line, $.dto_field_block)),
        optional($._block_indent),
        '}',
        $._newline,
      ),

    // A single field's own one-level-nested body: `fieldName: { <props> }`
    // multi-line, OR the P5b single-line inline form. Both are field-level
    // alternatives inside a `fields:` container.
    dto_field_block: ($) =>
      choice(
        seq(
          $._block_indent,
          $.property_key,
          ':',
          '{',
          $._newline,
          repeat(choice($._newline, $.block_comment_line, $.block_property)),
          optional($._block_indent),
          '}',
          $._newline,
        ),
        $.dto_field_inline,
      ),

    // P5b: single-line inline field object — `fieldName: { type: "string",
    // description: "..." }` (corpus: scenario-31-mixed-syntax.tmd:41-42,
    // snippets/{class,file,classfile}-longform.tmd). Comma-separated
    // `key: value` pairs on one line, closing `}` on the same line.
    dto_field_inline: ($) =>
      seq(
        $._block_indent,
        $.property_key,
        ':',
        '{',
        $.inline_field_pair,
        repeat(seq(',', $.inline_field_pair)),
        '}',
        optional($.inline_comment),
        $._newline,
      ),

    // Value alternatives include `alias($.bool_prefixed_identifier,
    // $.entity_name)` alongside the plain `$.entity_name` — this position
    // also pits `bool_literal` against an identifier alternative
    // (`optional: true` vs `type: trueClassName`), same fix as
    // `property_identifier`.
    inline_field_pair: ($) =>
      seq(
        $.property_key,
        ':',
        choice(
          $.string,
          $.bool_literal,
          alias($._property_identifier_name, $.entity_name),
          alias($.bool_prefixed_identifier, $.entity_name),
        ),
      ),

    // P5 generic form: a nested object under a non-`fields` key (one level,
    // multi-line). No corpus-attested non-`fields` nested container exists
    // today (dto_fields_block covers every observed case), but the grammar
    // admits the shape per S-GRAMMAR-1's "typed productions" generality —
    // property parsing inside it reuses `block_property` at the nested
    // level via `dto_field_block`'s multi-line arm, so this alternative
    // exists for completeness without duplicating grammar surface.
    property_nested_block: ($) =>
      seq(
        $._block_indent,
        $.property_key,
        ':',
        '{',
        $._newline,
        repeat(choice($._newline, $.block_comment_line, $.dto_field_block)),
        optional($._block_indent),
        '}',
        $._newline,
      ),

    // P7: TOTAL free-text fallback. A `key:` followed by a value matching
    // none of P1-P5b parses as property_freetext with the rest-of-line as
    // its value — property parsing never ERRORs on a well-formed `key:
    // value` line (doc §1). Corpus: `signature: (id: string) => User`
    // (snippets/getting-started-dto-longform.tmd:19, unquoted, containing
    // parens and a nested colon — matches none of P1/P2/P4/P3's grammar).
    property_freetext: ($) => seq($._block_indent, $.property_key, ':', $.freetext_value, optional($.inline_comment), $._newline),

    // tm10 (issue #103): the value alternation here is the SAME one
    // `signature` uses (`repeat1(choice($._sig_chunk, $.string))`, see its
    // definition below) and must stay that way. `toggleFormat` emits a
    // Function's signature into this P7 position verbatim — the identical
    // text the shortform `Name :: signature` production accepts — so any
    // shape `signature` admits and `freetext_value` does not is a
    // round-trip break by construction. `_sig_chunk` alone (`[^ \t\n"]+`)
    // cannot represent a quote AT ALL, so a quoted-string-literal union
    // (`setMode(mode: "read" | "write") => void`) was structurally
    // unrepresentable in longform while parsing cleanly in shortform. The
    // `$.string` alternative closes that gap.
    //
    // The one deliberate difference from `signature`: a freetext value must
    // OPEN with a `_sig_chunk`, and only then may mix chunks and strings.
    // `signature` sits in a position with no competing production, so it can
    // afford `repeat1(choice(...))`; P7 shares its position with P1
    // (`key: "string"`), and a `freetext_value` that could be a lone string
    // makes `description: "text"` genuinely ambiguous between the two — an
    // LR conflict, not a precedence nudge. Requiring a leading chunk leaves
    // P1 the sole owner of a bare-quoted value while admitting every
    // signature shape the corpus and the emitter actually produce (a
    // signature always opens with a name, `async`, or `(` — never with a
    // bare string literal; grep-confirmed across the corpus).
    //
    // `_freetext_open` is the second half of the #103 fix and follows the
    // same longest-match precedent as `_paramlist_opaque_open` /
    // `_typeof_opaque_open` / `_qualified_name_opaque_token` below: bake the
    // minimal disambiguating run into ONE atomic token so it wins the lexer
    // race outright, rather than tuning parser precedence. The race it wins:
    // when a freetext value's FIRST chunk is itself a bare identifier
    // (`signature: async storePayload(...)`, `signature: foo bar`), P3's
    // `entity_name` matches that leading chunk at the same start position
    // and — being a complete P3 derivation — reduces first, stranding the
    // rest of the line in an ERROR. `_sig_chunk` alone cannot break the tie
    // because it matches the SAME span as `entity_name` there (`async` is
    // exactly an identifier); it only out-lengths `entity_name` when the
    // first chunk itself carries non-identifier characters
    // (`path: src/app.ts`), which is why single-chunk P7 values already
    // worked and multi-chunk ones did not. `_freetext_open` reaches PAST
    // the first chunk to the whitespace and the next chunk's first
    // character, so it is strictly longer than `entity_name` whenever the
    // value continues — and does not exist at all when the value is a lone
    // identifier, leaving P3 the sole owner of `entry: cli` / `extends: Base`.
    freetext_value: ($) =>
      choice(
        seq($._freetext_open, repeat(choice($._sig_chunk, $.string))),
        seq($._freetext_open_string, repeat(choice($._sig_chunk, $.string))),
        $._sig_chunk,
      ),

    // One chunk, its trailing whitespace, and the first character of the
    // chunk that follows — the minimal span that beats `entity_name` on
    // length. That trailing character is consumed by this token rather than
    // peeked at (tree-sitter tokens have no zero-width lookahead), which is
    // why it is excluded from being a `"`: a swallowed opening quote would
    // strand the rest of a string literal. A value whose second chunk IS a
    // string (`signature: foo "bar"`) therefore does not match here and is
    // covered by `_freetext_open_string` instead.
    _freetext_open: () => token(seq(/[^ \t\n"]+/, /[ \t]+/, /[^ \t\n"]/)),

    // The string-led sibling of `_freetext_open`, for a value whose second
    // chunk is a string literal (`signature: setMode "read"`). It cannot
    // stop after the opening `"` — that would strand the literal's body — so
    // it spans the WHOLE first string, which keeps it strictly longer than
    // P3's bare `entity_name` and leaves the literal intact. The string it
    // swallows is not re-exposed as a separate `string` node; the CST
    // consumer (`longform-builder.ts` `classifyBlockProperty`) reads
    // `freetext_value`'s whole `.text` and never walks its children, so the
    // node's text — the only thing anything downstream reads — is unchanged.
    _freetext_open_string: () => token(seq(/[^ \t\n"]+/, /[ \t]+/, /"([^"\\\r\n]|\\[^\r\n])*"/)),

    // Qualified entity tokens are deliberately excluded from generic property
    // values: path: api.ts must retain the freetext precedence.
    _property_identifier_name: () => /[A-Za-z_]\w*/,

    property_key: () => /[A-Za-z_]\w*/,

    // P4/P3 tie-break — REVISED after PR #17 review found the original fix
    // over-fired. `true`/`false` are equal-length matches against
    // `entity_name` (both 4/5-char identifiers); tree-sitter's default (no
    // precedence anywhere) resolves that exact-length lexer tie in favor of
    // the identifier-class regex token, not the literal-string token, so
    // bare `flag: true` mis-lexed as `property_identifier` without help.
    // `prec(1)` here is what wins that exact tie for `bool_literal` and is
    // load-bearing — it is NOT the defect PR #17 found.
    //
    // The defect was in what `property_identifier` did with the REST of an
    // identifier that merely STARTS with `true`/`false`: a static
    // `prec()`'d token overrides tree-sitter's longest-match comparison
    // UNCONDITIONALLY, not just at ties — verified empirically
    // (`token(prec(1, /abc/))` beats a same-position `token(/[a-z]+/)` even
    // when the latter would match a strictly longer span). With only
    // `$.entity_name` as `property_identifier`'s value token,
    // `bool_literal` grabbed the leading `true`/`false` out of
    // `trueClassName` / `falseAlarmHandler` and stranded the remainder as
    // an ERROR — `bool_literal`'s prec(1) has no visibility into "but a
    // longer identifier was also possible here," because by the time the
    // lexer commits to `bool_literal`, `property_identifier`'s attempt at
    // the same span never got a chance to complete.
    //
    // Fix: `property_identifier` (and `inline_field_pair`) additionally
    // accept `bool_prefixed_identifier` below — an identifier that starts
    // with `true`/`false` and CONTINUES with more word characters, given
    // the SAME `prec(1)` so it competes with `bool_literal` on LENGTH
    // (`bool_prefixed_identifier` requires at least one more `\w` after
    // true/false, so it is never viable for the bare `true`/`false` case —
    // no genuine tie exists there, `bool_literal` is the only match — and
    // it always matches a strictly longer span than `bool_literal` alone
    // whenever it IS viable, so equal precedence lets length settle it).
    // This is scoped to exactly the two positions that ever set
    // `bool_literal` against an identifier alternative; `entity_name`'s own
    // precedence (default, untouched) still governs every other grammar
    // position (E1-E11, C1-C15, H1-H12), and `_sig_chunk`/`name_list`/
    // `word` are untouched — three earlier attempts that touched those
    // (a scoped `value_identifier` token, matching `_sig_chunk` precedence,
    // and `word: $.entity_name` keyword extraction) each cascaded into a
    // regression elsewhere (P7's freetext fallback, S-GRAMMAR-1b's inline
    // comment, and the `fields:` keyword literal respectively) before this
    // narrower fix was found.
    bool_literal: () => token(prec(1, choice('true', 'false'))),

    // See `bool_literal` above. One atomic token (not a two-token split) so
    // aliasing it to `entity_name` at each call site emits exactly one leaf
    // node, matching every other identifier-value position's shape.
    bool_prefixed_identifier: () => token(prec(1, seq(choice('true', 'false'), /\w+/))),

    // Block-body indentation: ONE shared required-whitespace token reused at
    // every nesting depth (the block's own property lines, and one level
    // deeper for fields inside a `fields:` container). Depth is expressed
    // structurally by which rule references the token — `dto_fields_block`'s
    // repeat vs `dto_field_block`'s repeat — not by counting or by a
    // distinct per-depth token (two lexically-identical `/[ \t]+/` tokens
    // produce an unresolvable lexer conflict since the lexer cannot tell
    // which one a given run of whitespace should become; tried and
    // generate-time-rejected during this Quantum's authoring). No scanner,
    // per S-GRAMMAR-3's "one boolean, no depth counting" applied one level
    // deeper. Closing braces need no separate token: ordinary
    // extras-skipped whitespace precedes the literal `}` at any depth.
    _block_indent: () => token(/[ \t]+/),

    // --- top-level entity declarations (E1-E11) --------------------------
    // Shortform: one sigil per line disambiguates the entity kind (`->` for
    // Program, `@` for File, `::` for Function, etc. — doc §1's inventory
    // table). Every declaration shares the shape `entity_name, sigil, body,
    // optional(inline_comment), line_end`; each has its own named production
    // (not one generic "declaration" node) so node-types.json carries a
    // distinct typed shape per kind for TM-3's codegen.

    // E1: `Name -> Entry ["Purpose"] [vX.Y.Z]`.
    program_declaration: ($) =>
      seq($.entity_name, '->', $.entity_name, optional($.string), optional($.version), optional($.inline_comment), $._line_end),
    program_declaration_final: ($) =>
      seq($.entity_name, '->', $.entity_name, optional($.string), optional($.version), optional($.inline_comment)),

    // E2: `Name @ path:`.
    file_declaration: ($) => seq($.entity_name, '@', $.path, ':', optional($.inline_comment), $._line_end),
    file_declaration_final: ($) => seq($.entity_name, '@', $.path, ':', optional($.inline_comment)),

    // E3: `Name :: signature-to-EOL`.
    function_declaration: ($) =>
      seq($.entity_name, optional($.type_parameters), '::', $.signature, optional($.inline_comment), $._line_end),
    function_declaration_final: ($) => seq($.entity_name, optional($.type_parameters), '::', $.signature, optional($.inline_comment)),

    // E4 — CORRECTED: `Name <: [Base[, Iface...]]`. The inheritance list
    // may be EMPTY (bare `Name <:` — scenario-34-cli-tool.tmd:127 `cli <:`,
    // :134 `taskRunner <:`, and 8 more instances in the same file).
    class_declaration: ($) =>
      seq($.entity_name, optional($.type_parameters), '<:', optional($.inherit_list), optional($.inline_comment), $._line_end),
    class_declaration_final: ($) =>
      seq($.entity_name, optional($.type_parameters), '<:', optional($.inherit_list), optional($.inline_comment)),

    // E5: `Name #: path [<: Base[, Iface...]]`.
    classfile_declaration: ($) =>
      seq(
        $.entity_name,
        optional($.type_parameters),
        '#:',
        $.path,
        optional(seq('<:', $.inherit_list)),
        optional($.inline_comment),
        $._line_end,
      ),
    classfile_declaration_final: ($) =>
      seq($.entity_name, optional($.type_parameters), '#:', $.path, optional(seq('<:', $.inherit_list)), optional($.inline_comment)),

    // E6: `Name ! path [: Schema]`.
    // RFC-TM-14 R6a (rfc-tm-14-diamond.md §S5): the schema slot is a full
    // `type_expr`, the exact shape `typedef_declaration` gives its aliased
    // type (same `optional(inline_comment), _line_end` tail), so a Constants
    // states the binding's whole annotation — `Record<string, Rule>`,
    // `ReadonlyMap<string, Rule>`, `"read" | "write"`, `Rule[]`, a qualified
    // generic base — instead of a bare `entity_name` the converter had to
    // reduce to `Record`/`Map`/`Array`. A bare name is still a `type_expr`
    // (`type_named`), so every existing document parses unchanged.
    constants_declaration: ($) => seq($.entity_name, '!', $.path, optional(seq(':', $.type_expr)), optional($.inline_comment), $._line_end),
    constants_declaration_final: ($) => seq($.entity_name, '!', $.path, optional(seq(':', $.type_expr)), optional($.inline_comment)),

    // E7: `Name %` or `Name % "Purpose"`.
    dto_declaration: ($) =>
      seq($.entity_name, optional($.type_parameters), '%', optional($.string), optional($.inline_comment), $._line_end),
    dto_declaration_final: ($) => seq($.entity_name, optional($.type_parameters), '%', optional($.string), optional($.inline_comment)),

    // E8: `Name ~ "Description"`.
    asset_declaration: ($) => seq($.entity_name, '~', $.string, optional($.inline_comment), $._line_end),
    asset_declaration_final: ($) => seq($.entity_name, '~', $.string, optional($.inline_comment)),

    // E9: `Name & "Purpose"` / `Name &! "Purpose"`.
    uicomponent_declaration: ($) => seq($.entity_name, choice('&!', '&'), $.string, optional($.inline_comment), $._line_end),
    uicomponent_declaration_final: ($) => seq($.entity_name, choice('&!', '&'), $.string, optional($.inline_comment)),

    // E10 — CORRECTED: `Name $type "Desc" [( identifier )]`. The trailing
    // marker is syntactically ANY parenthesized identifier — `param_marker`
    // already matches `(\w+)` (Q0), so `(optional)` and `(required)` both
    // parse here; marker legality is semantics (TM-3/TM-4), not grammar.
    // Corpus: scenario-34-cli-tool.tmd:99 `NODE_ENV $env "..." (optional)`,
    // naming-edge-cases-example.tmd `DB_CONNECTION_URL $env "..." (required)`.
    runparameter_declaration: ($) =>
      seq($.entity_name, $.param_type, $.string, optional($.param_marker), optional($.inline_comment), $._line_end),
    runparameter_declaration_final: ($) => seq($.entity_name, $.param_type, $.string, optional($.param_marker), optional($.inline_comment)),

    // E11 — CORRECTED: `Name ^ "Purpose" [version]`; version is
    // `optional('v') + [\d.\-\w]+` (bare `6.0.0` at scenario-62:90, `v`-
    // prefixed at scenario-38:6/9/12). Name class is the code's
    // `[@\w\-/]+` incl. leading '-' and `@scope/pkg` (dependency_name,
    // Q0) alongside plain entity_name for keyword-free identifier-shaped
    // dependency names.
    dependency_declaration: ($) =>
      seq(choice($.entity_name, $.dependency_name), '^', $.string, optional($.version), optional($.inline_comment), $._line_end),
    dependency_declaration_final: ($) =>
      seq(choice($.entity_name, $.dependency_name), '^', $.string, optional($.version), optional($.inline_comment)),

    // E12 (X-TYPE-7, rfc-tm-8-diamond.md §5): `Name = enum [Member1, Member2]`
    // (enum variant) or `Name = TypeExpr` (alias variant, the aliased type
    // reusing the SAME type-expression sub-grammar as a DTO field, per the
    // doc's "alias variants carry the aliased type as a TypeExprNode"). `=` is
    // unclaimed at top-level declaration position (it is C14's RunParameter
    // default-value sigil, but that production only fires INDENTED —
    // `$._indent, '='` — so an entity_name immediately followed by `=` at
    // column 0 cannot collide with it). The enum member list reuses
    // `name_list` (the same bracketed-list production C1/C2/C3/C6/C7/C8/C9/C15
    // share) so member names get identical list-entry lexing.
    typedef_declaration: ($) =>
      seq(
        $.entity_name,
        optional($.type_parameters),
        '=',
        choice($.typedef_enum_variant, $.type_expr),
        optional($.inline_comment),
        $._line_end,
      ),
    typedef_declaration_final: ($) =>
      seq($.entity_name, optional($.type_parameters), '=', choice($.typedef_enum_variant, $.type_expr), optional($.inline_comment)),

    // enumKwToken bakes in `enum` + whitespace + the opening `[` (see the
    // token's own definition above for why: enum is not itself reserved, so
    // `Name = enum` with no following list must keep lexing as the named
    // type "enum", not this production). typedef_enum_variant is listed
    // BEFORE type_expr in the choice above so a genuine `enum [...]` list
    // is tried first — matches type_generic's own self-documented ordering
    // rationale (a longer, more specific match should not be shadowed by a
    // shorter named-type read at the same starting position). The member
    // list body is BESPOKE (comma-separated list_entry, closing `]`) rather
    // than a `$.name_list` reuse: name_list's own production re-matches a
    // leading `[` token, which enumKwToken already consumed as part of its
    // compound token — reusing name_list here would ask the lexer to find a
    // second `[` that is no longer in the input stream (see the enumKwToken
    // comment above for the confirmed failure mode).
    typedef_enum_variant: ($) => seq(alias(enumKwToken, $.enum_kw), $.list_entry, repeat(seq(',', $.list_entry)), ']'),

    // --- continuation lines (C1-C15) --------------------------------------
    // Every continuation shares the same shape: `$._indent` then the body
    // then optional inline comment (D2: continuations DO admit it,
    // parser.ts:459) then `$._line_end`. Bare-name vs list variants are
    // separate named productions per the doc's C1-C15 enumeration so each
    // has its own fixture-bindable node.

    _continuation: ($) =>
      choice(
        $.import_list, // C1: <- [A,B]
        $.export_list, // C2: -> [A,B]
        $.reexports_list, // RFC-TM-11 §RX-1: <-> [A,B], File only
        $.calls_list, // C3: ~> [A,B]
        $.input_name, // C4: <- Name
        $.output_name, // C5: -> Name
        $.methods_list, // C6: => [A,B]
        $.affects_list, // C7: ~ [A,B]
        $.contains_list, // C8: > [A,B]
        $.contained_by_list, // C9: < [A,B]
        $.contains_program, // C10: >> Name
        $.default_value, // C14: = "value"
        $.consumes_list, // C15: $< [A,B]
        $.entity_comment, // C12: # text (indented form of D1's role, own node)
      ),

    _continuation_final: ($) =>
      choice(
        $.import_list_final,
        $.export_list_final,
        $.reexports_list_final,
        $.calls_list_final,
        $.input_name_final,
        $.output_name_final,
        $.methods_list_final,
        $.affects_list_final,
        $.contains_list_final,
        $.contained_by_list_final,
        $.contains_program_final,
        $.default_value_final,
        $.consumes_list_final,
        $.entity_comment_final,
      ),

    // C1: `<- [A,B]` imports.
    import_list: ($) => seq($._indent, '<-', $.name_list, optional($.inline_comment), $._line_end),
    import_list_final: ($) => seq($._indent, '<-', $.name_list, optional($.inline_comment)),

    // C2: `-> [A,B]` exports.
    export_list: ($) => seq($._indent, '->', $.name_list, optional($.inline_comment), $._line_end),
    export_list_final: ($) => seq($._indent, '->', $.name_list, optional($.inline_comment)),

    // RFC-TM-11 §RX-1 (rfc-tm-11-diamond.md) — `<-> [A,B]` re-exports. File
    // only (attachment-rules.ts's `reexports_list` rule scopes the target
    // kind; ClassFile never routes through isFileConsumed and always
    // auto-self-exports, so it has no honest use for this list — see the
    // Diamond Doc's RX-1 for the full argument). `<->` is a bare literal
    // token, same registration style as `<-`/`->` above and `<:`/`#:`
    // elsewhere in this file — no `blockKwToken`-style compound needed (it
    // contains no identifier character, so it can never collide with
    // `entity_name`). Tree-sitter's longest-match lexer prefers `<->` over
    // `<-` at the same starting position, the same mechanism `#:` already
    // relies on to win over `comment`'s bare `#` token.
    reexports_list: ($) => seq($._indent, '<->', $.name_list, optional($.inline_comment), $._line_end),
    reexports_list_final: ($) => seq($._indent, '<->', $.name_list, optional($.inline_comment)),

    // C3: `~> [A,B]` calls. List entries may be dotted (`UserService2.createUser`).
    calls_list: ($) => seq($._indent, '~>', $.name_list, optional($.inline_comment), $._line_end),
    calls_list_final: ($) => seq($._indent, '~>', $.name_list, optional($.inline_comment)),

    // C4: `<- Name` bare input (function input DTO, not a list).
    input_name: ($) => seq($._indent, '<-', $.entity_name, optional($.inline_comment), $._line_end),
    input_name_final: ($) => seq($._indent, '<-', $.entity_name, optional($.inline_comment)),

    // C5: `-> Name` bare output.
    output_name: ($) => seq($._indent, '->', $.entity_name, optional($.inline_comment), $._line_end),
    output_name_final: ($) => seq($._indent, '->', $.entity_name, optional($.inline_comment)),

    // C6: `=> [A,B]` methods.
    methods_list: ($) => seq($._indent, '=>', $.name_list, optional($.inline_comment), $._line_end),
    methods_list_final: ($) => seq($._indent, '=>', $.name_list, optional($.inline_comment)),

    // C7: `~ [A,B]` affects (UI components a function touches).
    affects_list: ($) => seq($._indent, '~', $.name_list, optional($.inline_comment), $._line_end),
    affects_list_final: ($) => seq($._indent, '~', $.name_list, optional($.inline_comment)),

    // C8: `> [A,B]` contains (UIComponent children).
    contains_list: ($) => seq($._indent, '>', $.name_list, optional($.inline_comment), $._line_end),
    contains_list_final: ($) => seq($._indent, '>', $.name_list, optional($.inline_comment)),

    // C9: `< [A,B]` containedBy.
    contained_by_list: ($) => seq($._indent, '<', $.name_list, optional($.inline_comment), $._line_end),
    contained_by_list_final: ($) => seq($._indent, '<', $.name_list, optional($.inline_comment)),

    // C10: `>> Name` containsProgram (Asset -> Program link).
    contains_program: ($) => seq($._indent, '>>', $.entity_name, optional($.inline_comment), $._line_end),
    contains_program_final: ($) => seq($._indent, '>>', $.entity_name, optional($.inline_comment)),

    // C14: `= "value"` RunParameter default.
    default_value: ($) => seq($._indent, '=', $.string, optional($.inline_comment), $._line_end),
    default_value_final: ($) => seq($._indent, '=', $.string, optional($.inline_comment)),

    // C15: `$< [A,B]` consumes (Function -> RunParameter link).
    consumes_list: ($) => seq($._indent, '$<', $.name_list, optional($.inline_comment), $._line_end),
    consumes_list_final: ($) => seq($._indent, '$<', $.name_list, optional($.inline_comment)),

    // C12: `# text` comment as a continuation (indented, still D1's comment
    // token but under an indented line so it gets its own node identity
    // for continuation-position fixtures, e.g.
    // naming-edge-cases-example.tmd:32 `  # Note: Methods can have ...`).
    entity_comment: ($) => seq($._indent, $.comment, $._newline),
    entity_comment_final: ($) => seq($._indent, $.comment),

    // C13: `"text"` description line — bare, top-level indented string.
    // D2 scoping: description lines are continuations, so they admit an
    // inline comment (theoretical only: a description string already
    // consumes to its closing quote, and content after it on the same
    // line is exactly where an inline comment could appear).
    _description_line: ($) => $.description_line,
    _description_line_final: ($) => $.description_line_final,
    description_line: ($) => seq($._indent, $.string, optional($.inline_comment), $._line_end),
    description_line_final: ($) => seq($._indent, $.string, optional($.inline_comment)),

    // C11: `- name[?]: type ["desc"] [(optional)]` DTO field — ships
    // verbatim from S-GRAMMAR-1a (Q0, empirically verified). D2 scoping:
    // DTO field lines are continuations and admit an inline comment; the
    // marker/comment adjacency fixture (an inline comment after a field
    // carrying `(optional)`) is bound in test/corpus/q1-*.txt.
    dto_field: ($) =>
      seq(
        $._indent,
        '-',
        $.field_name,
        optional('?'),
        ':',
        $.field_type,
        optional($.string),
        optional($.optional_marker),
        optional($.inline_comment),
        $._line_end,
      ),
    dto_field_final: ($) =>
      seq(
        $._indent,
        '-',
        $.field_name,
        optional('?'),
        ':',
        $.field_type,
        optional($.string),
        optional($.optional_marker),
        optional($.inline_comment),
      ),

    // X-TYPE-1 (rfc-tm-8-diamond.md §1): field_type is now the structured
    // type-expression sub-grammar shared verbatim by shortform dto_field/
    // dto_field_final and the longform `type:` property (property_freetext's
    // P7 fallback still owns the longform-string spelling of a type today —
    // Q1 leaves that consumer migration to X-TYPE-5/X-TYPE-2 write-side
    // builders, not the grammar; the grammar surface itself is uniform).
    field_type: ($) => $.type_expr,

    // type_union / type_intersection: `&` binds tighter than `|`, matching
    // TypeScript (doc §1). Left-associative — chained members without a
    // deliberate parenthesization all attach at the same level; precedence
    // numbers only need to differ, not carry semantic weight beyond ordering
    // union above intersection.
    type_expr: ($) => $.type_union,
    type_union: ($) => prec.left(1, seq($.type_intersection, repeat(seq('|', $.type_intersection)))),
    type_intersection: ($) => prec.left(2, seq($.type_postfix, repeat(seq('&', $.type_postfix)))),

    // type_postfix: suffix arrays, any depth (`number[][]`, corpus-attested
    // complex-dto-example.tmd:45).
    type_postfix: ($) => prec.left(3, seq($.type_atom, repeat(seq('[', ']')))),

    // type_atom: the six structured productions plus the flagged type_opaque
    // fallback leaf (doc §1 "Opaque fallback", authorized scope amendment).
    // type_generic is listed before type_named so a generic's base name does
    // not shadow-match as a bare type_named before the parser sees the `<`
    // (GLR tries both; ordering here is documentation of intent, not a
    // correctness requirement — the grammar is unambiguous at this position
    // because type_generic's `<...>` suffix makes it strictly longer).
    //
    // KNOWN GAP (documented, not silently accepted): a function-type field
    // whose parameter list carries a name:type pair — `(n: number) => void`
    // — is NOT reachable through type_opaque; it parses with a syntax/*
    // diagnostic. Root cause, confirmed by exhausting every precedence lever
    // tree-sitter exposes (static prec() both directions on _type_paren_group
    // AND type_opaque, prec.dynamic() on _type_paren_group, and choice-order
    // alone — all five reverted, none changed the outcome): `type_named`
    // reduces the bare parameter name (`n`) all the way up through
    // type_postfix/type_intersection/type_union/type_expr to a COMPLETE,
    // locally-valid type_atom the instant it sees `n`, one token before the
    // disambiguating `:` is even visible — the reduce-reduce tie against
    // type_opaque's identical single-token first piece resolves at that
    // point, discarding the opaque derivation before the later failure (the
    // stranded `: number) => void`) exists to weigh against it. This is the
    // grammar's own documented external-scanner boundary (file header,
    // "S-GRAMMAR-3 reserves [it] for stop-and-report") — reaching it is a
    // stop-and-report per that standing rule, not a Q1 defect to paper over.
    // Zero real .tmd corpus files contain this shape (grep-verified); the
    // doc's own cited representative example, `() => void` (empty parameter
    // list, no colon to create the ambiguity), parses correctly and is what
    // X-TYPE-1's "extrapolated function-type fixture" check binding exercises.
    // Qualified-name opaque fix (corpus-confirmed regression, single
    // instance: lib/typed-mind-typescript/architecture.tmd:107
    // `projectConfig: ts.CompilerOptions`): a dotted/qualified type
    // reference has no structured production (the doc's six kinds have no
    // member-access shape) and must fall to type_opaque — but a bare
    // type_named ALSO matches the qualified name's leading identifier at the
    // exact same token, and (per type_atom's "KNOWN GAP" comment above)
    // tree-sitter resolves that kind of tie by committing to whichever
    // alternative reduces first, discarding the correct-but-longer
    // derivation. Unlike the function-type gap, THIS tie is resolvable
    // without an external scanner: a qualified name is objectively the
    // LONGER match at the same starting position (identifier PLUS `.` PLUS
    // more), so a single dedicated token capturing the whole
    // `identifier(.identifier)+` run wins outright on length — no ambiguity,
    // no precedence tuning needed. Aliased to `type_opaque` so the CST→AST
    // layer (type-expr-from-cst.ts) needs no new case: this is never a new
    // structured kind (the doc never authorized a qualified-name
    // production) — opaque is where "type text outside the six structured
    // kinds" already belongs.
    type_atom: ($) =>
      choice(
        $.type_generic,
        $.type_readonly_array,
        alias($._paramlist_opaque_run, $.type_opaque),
        alias($._typeof_opaque_run, $.type_opaque),
        $.type_named,
        $.type_literal_string,
        $.type_literal_number,
        $._type_paren_group,
        $.type_opaque,
      ),

    _qualified_name_opaque_token: () => token(seq(/[A-Za-z_]\w*/, repeat1(seq('.', /[A-Za-z_]\w*/)))),

    // tm10-inc2-grammar (issue #50): _paramlist_opaque_open consumes the
    // minimal disambiguating prefix as ONE atomic token — '(' + identifier +
    // optional whitespace + ':' — mirroring block_kw's "bake the whole
    // disambiguating run into one token" mechanism and
    // _qualified_name_opaque_token's own longest-match precedent above. This
    // token is objectively LONGER than type_named's bare-identifier match at
    // the same start position (it reaches past the identifier to the ':'),
    // so it wins the lexer race outright — no parser-level precedence
    // involved, unlike the five reverted attempts the type_atom "KNOWN GAP"
    // comment above records. Once it wins, the surrounding production
    // consumes the rest of the balanced run via the existing _opaque_piece
    // machinery (already proven for nested object literals) so the WHOLE
    // '(x: number) => void' — not just the '(x:' prefix — lands in one
    // type_opaque leaf. Confirmed empirically against the real corpus
    // instance webhookstorage's outbound-delivery WorkerDeps DTO field
    // carries (multi-param, optional markers, generic return type) — see
    // this file's corpus fixtures. Scope: this closes every real TypeScript
    // function-type shape (a parameter always has `name: type` or the list
    // is empty, `() => void`, already covered pre-existing). It does NOT
    // close the `fn (custom)` sibling in type_atom's KNOWN GAP family — that
    // shape has no colon and no lexical signal to anchor a longest-match
    // token on; see the corpus fixture's comment for why it stays open.
    _paramlist_opaque_open: () => token(seq('(', /[A-Za-z_]\w*/, /[ \t]*/, ':')),

    _paramlist_opaque_run: ($) =>
      prec.right(seq($._paramlist_opaque_open, repeat(choice(prec(1, $._opaque_piece), prec(-1, $.string))), ')', repeat($._opaque_piece))),

    // tm10-inc2-grammar (issue #83): `(typeof X)[number]` — a TypeScript
    // `typeof` type query, optionally followed by indexed access. `typeof`
    // has no structured production (the doc's six kinds have no type-query
    // shape) and must fall to type_opaque, same rationale as the
    // qualified-name fix above. Distinguishing token: '(' + optional
    // whitespace + 'typeof' + REQUIRED trailing whitespace — objectively
    // longer than type_named's bare-'('-triggered _type_paren_group attempt
    // would consume before failing, so it wins the lexer race the same way
    // _paramlist_opaque_open does. The trailing content (the operand, the
    // closing paren, and an optional `[...]` indexed-access suffix with
    // arbitrary content — NOT the empty `[]` type_postfix already covers)
    // rides the same _opaque_piece continuation machinery already proven for
    // nested groups (it already balances `[`/`]` for nested object
    // literals, reused here for the indexed-access suffix with zero new
    // machinery). Confirmed empirically against the real corpus instance
    // `lib/typed-mind/src/checker/check-codes.ts:122`'s
    // `export type CheckCode = (typeof CHECK_CODES)[number];` — see this
    // file's corpus fixtures.
    _typeof_opaque_open: () => token(seq('(', /[ \t]*/, 'typeof', /[ \t]+/)),

    _typeof_opaque_run: ($) => prec.right(seq($._typeof_opaque_open, repeat($._opaque_piece), ')', repeat($._opaque_piece))),

    // type_named: a bare identifier reference (builtin primitive, generic
    // name, or an entity-table name — checker territory, Q2). Wraps
    // entity_name so the AST kind carries its own span distinct from a
    // generic's base-name span.
    type_named: ($) => choice($.entity_name, $._qualified_name_opaque_token),

    // type_generic: `Base<Arg1, Arg2, ...>` — commas separate arguments; the
    // `Pick<S3Client, "send">` census repro (doc §1) parses with two
    // arguments, the second a string literal.
    type_generic: ($) => seq(field('base', $.type_named), '<', $.type_expr, repeat(seq(',', $.type_expr)), '>'),

    type_literal_string: ($) => $.string,

    // type_literal_number: doc §1 — a new numeric token. Corpus-attested
    // unquoted numeric-literal union: complex-dto-example.tmd:42
    // `priority: 1 | 2 | 3 | 4 | 5`.
    type_literal_number: () => token(/-?\d+(\.\d+)?/),

    // Parenthesized grouping for precedence override (`(A | B)[]`). A real
    // recursive production (not a token) — full type_expr nests inside,
    // unlike the flat _paren_group signature/field_type fallback. No prec
    // annotation: neither static nor dynamic precedence changes the outcome
    // for the ambiguous `(name: type)` shape (see type_atom's "KNOWN GAP"
    // comment for the full root-cause account) — plain seq keeps this rule's
    // behavior easiest to reason about for the cases it DOES resolve
    // correctly (`(A | B)[]`, `Pick<S3Client, "send">`, readonly's paren
    // form), which is every case the doc's fixture-bound checks require.
    _type_paren_group: ($) => seq('(', $.type_expr, ')'),

    // type_readonly_array: `readonly T[]` / `readonly (A | B)[]`. Two
    // concrete forms per the readonlyIdentKwToken/readonlyParenKwToken
    // header comment above — both alias to the same visible `readonly_kw`
    // node so downstream AST code has one place to detect the prefix.
    type_readonly_array: ($) =>
      choice(
        seq(alias(readonlyIdentKwToken, $.readonly_kw), field('element', $.readonly_name_rest), '[', ']'),
        seq(alias(readonlyParenKwToken, $.readonly_kw), field('element', $.readonly_paren_rest), '[', ']'),
        seq(alias(readonlyBraceKwToken, $.readonly_kw), field('element', $.readonly_brace_rest), '[', ']'),
      ),

    // readonly_name_rest: chars 2..n of the element's identifier name,
    // mirroring header_name_rest exactly (token.immediate — no extras may
    // intervene between the compound token's consumed first character and
    // the rest of the name). May be followed by a generic's `<...>` — the
    // rest production stays a single node; a generic argument list after a
    // readonly-prefixed name is out of corpus scope (doc §1 fixture-bound
    // examples are both bare named types) and is intentionally not modeled
    // here to avoid inventing surface the doc does not carry.
    readonly_name_rest: () => token.immediate(/\w*(?:\.[A-Za-z_]\w*)*/),

    // readonly_paren_rest: the remainder of a parenthesized group after the
    // compound token has already consumed the opening `(` as raw text — a
    // flat, non-recursive continuation (mirrors _paren_group's one-level
    // grouping; doc §1's own example `(A | B)[]` needs no deeper nesting
    // under readonly). token.immediate keeps it adjacent to the compound
    // token with no extras between them.
    readonly_paren_rest: () => token.immediate(seq(/[^)\n]*/, ')')),

    // readonly_brace_rest: the remainder of an inline object-literal element
    // after the compound token has already consumed the opening `{` as raw
    // text — same flat, non-recursive continuation shape as
    // readonly_paren_rest (corpus-confirmed instance,
    // lib/typed-mind-typescript/architecture.tmd:102, has no nested braces;
    // deeper nesting under readonly is out of corpus scope, same
    // simplification the paren-rest form already makes).
    readonly_brace_rest: () => token.immediate(seq(/[^}\n]*/, '}')),

    // type_opaque (doc §1 "Opaque fallback", authorized scope amendment): a
    // flagged leaf catching type text outside the six structured
    // productions — object literals incl. index signatures (corpus:
    // complex-dto-example.tmd:44,83,42 depth-3 nesting at :42), tuples
    // (corpus: scenario-49-dto-complex-structures.tmd:40,
    // test-syntax.tmd:48,111), function types and conditional types
    // (extrapolated, no corpus instance — carried because today's chunk
    // token already accepts the shape). A real recursive production (not a
    // token): `_opaque_run` balances `(`/`)`, `[`/`]`, `{`/`}` groups to
    // arbitrary depth so nested object literals (complex-dto-example.tmd:42
    // `{ user: { profile: { settings: string[] } } }`) parse as ONE opaque
    // leaf rather than failing at the first nested brace. Stops at the same
    // boundary the legacy chunk token stopped at: an unescaped `"` (the
    // description slot) or newline, never consumed here.
    // prec(-1): structured productions win ties against opaque wherever both
    // fully succeed for the SAME complete input (e.g. a bare `string` must
    // resolve as type_named, not opaque's catch-all token) — this is a
    // genuinely different, working case from the function-type ambiguity
    // documented on type_atom above (there, the structured branch reduces a
    // SHORTER prefix than opaque would, so the two derivations are not
    // competing to consume the same complete input; precedence has no
    // opportunity to matter either way for that case, confirmed above).
    type_opaque: ($) => prec(-1, $._opaque_run),

    // prec.right on every repeat/group site below: each nested group must
    // greedily claim pieces for ITSELF before returning control to its
    // enclosing repeat — otherwise the grammar is genuinely ambiguous about
    // which of two active `repeat($._opaque_piece)` sites (the group just
    // opened vs. the run/group still open around it) claims the next piece,
    // since both loops recurse through the identical `_opaque_piece` symbol
    // (tree-sitter's own diagnosed conflict). Right-associating every site
    // consistently gives the innermost (most recently opened, unclosed)
    // group first claim, which is also the only reading that lets bracket
    // matching close correctly.
    _opaque_run: ($) => prec.right(repeat1($._opaque_piece)),

    // The `\]` escape below is REQUIRED — tree-sitter's own regex-to-token
    // compiler (not this file's JS runtime) rejects an unescaped `]` inside
    // this character class with "unclosed character class" (confirmed:
    // `tree-sitter generate` fails without it). Biome's JS-regex-engine lens
    // sees it as redundant; tree-sitter's does not — the biome-ignore
    // directly above the token() call suppresses that false positive.
    //
    // `$.string` alternative (issue-93 / ladder fixture 93): the chunk token
    // below deliberately EXCLUDES `"` so an opaque run stops at the
    // description slot's opening quote (see type_opaque's header comment,
    // "Stops at the same boundary the legacy chunk token stopped at"). That
    // boundary is correct at the START of an opaque run — a lone string must
    // reach `type_literal_string`, not opaque — but it also made a quoted
    // value INSIDE a balanced group structurally unrepresentable, which is
    // the whole of the fixture-93 gap: the house-style `kind`-tagged union
    // `{ kind: "ok"; value: T } | { kind: "err"; error: E }` that
    // `failures_are_local_tagged_unions` mandates ERRORed on its first
    // discriminant. Empirically the union is NOT the trigger — a single
    // `{ kind: "none"; reason: string }` reproduced identically, and the GLR
    // error recovery already materialized a `(string)` node inside the
    // ERROR, i.e. the LEXER produced the token and only this choice lacked
    // an alternative to accept it.
    //
    // Reusing `$.string` (the same sub-rule `type_literal_string` and
    // `property_string` already use) rather than widening the chunk regex is
    // deliberate, following PR #142's `freetext_value` precedent:
    // - It keeps the `"..."` span balanced, so a string CONTAINING `|`, `}`,
    //   or `(` cannot desynchronize the group matching around it (verified
    //   by the `{ a: "x|y}z"; b: string }` corpus case below).
    // - It adds no new token to the lexer, so no new longest-match race.
    // - It needs no `conflicts` block. The grammar has none and gains none:
    //   the lone reduce-reduce tie tree-sitter reported
    //   (`type_literal_string` vs the in-group piece, both over a bare
    //   `string`) is settled by the `prec(-1)` on the string alternative,
    //   which is resolution (1) of the three tree-sitter itself offered.
    //
    // WHERE the string alternative may appear is load-bearing, and is the
    // whole reason this rule splits in two below. The `"` boundary is NOT
    // merely a lexical stopping point — at the TOP level of an opaque run it
    // separates the type from the DTO field's DESCRIPTION SLOT. In
    // `- cb: (x: number) => void "desc" (optional)` the `"desc"` is a
    // sibling `string` node of `dto_field`, not part of `field_type`.
    // Admitting `$.string` into the top-level run makes the opaque run
    // greedily swallow that description into the type — caught by the
    // pre-existing spike.txt fixture "S-GRAMMAR-1a: DTO field with function
    // type, description, and marker as distinct nodes", which regressed on
    // the first attempt at this fix. That fixture is the guard rail; it is
    // not weakened here.
    //
    // Inside a BALANCED group the ambiguity does not exist: a `"` between
    // `{`/`}` cannot be a description, because the description slot only
    // begins after the type has closed. So the string alternative is added
    // inline at the brace and bracket group bodies below (reachable only
    // once a group is open) and is absent from `_opaque_piece` itself, which
    // is what the top-level run repeats.
    //
    // Conservation — nothing else moves:
    // - A lone string at the start of a type atom still reduces to
    //   `type_literal_string` (`type_opaque` carries `prec(-1)`), so
    //   `Status = "a" | "b"` (the #130/#113 knownGap) and a DTO field typed
    //   `"a" | "b"` parse EXACTLY as before — both pinned as conservation
    //   tests in q1-shortform.txt.
    // - The description slot keeps its `"` boundary, per the split above.
    //
    // Corpus proof (measured, not estimated): of the 268 `.tmd` files in the
    // repo, exactly ONE parses differently — `complex-dto-example.tmd`, whose
    // line 167 carries this very shape:
    //   - preferences: { theme: "light" | "dark", language: string } "User preferences"
    // Before, that field split into two ERROR nodes flanking a mis-parsed
    // fragment; after, it is one `type_opaque` spanning the whole type, with
    // the trailing string still the field's description. That is the fix
    // working, and it is the only S-expression that moves. The other 267 are
    // byte-identical.
    //
    // METHOD — required to reproduce: `~/.cache/tree-sitter/lib` is keyed by
    // grammar NAME, not by the content of grammar.js or parser.c, and
    // `--rebuild` does NOT reliably defeat it. Run each side with its own
    // `XDG_CACHE_HOME` (or `rm -rf ~/.cache/tree-sitter/lib` between runs) or
    // the comparison silently loads one side's parser for both. Also filter
    // `tree-sitter parse`'s timing footer (`Parse: 0.07 ms  6859 bytes/ms`)
    // before diffing — it differs on every run and is not tree structure.
    // Both traps produced wrong numbers in this change's first draft.
    _opaque_piece: ($) =>
      choice(
        $._opaque_paren_group,
        $._opaque_bracket_group,
        $._opaque_brace_group,
        $._opaque_angle_group,
        '<=',
        // biome-ignore lint/complexity/noUselessEscapeInRegex: required for tree-sitter's regex compiler, see comment above
        token(prec(-1, /[^ \t\n"(){}\[\]<]+/)),
      ),

    // The in-group choice is INLINED at the brace and bracket sites rather
    // than factored into a named `_opaque_group_piece` rule. Two factored
    // shapes were tried and both failed `tree-sitter generate` with an
    // unresolvable reduce-reduce tie, recorded here so neither is retried:
    //   (a) a sibling rule repeating `_opaque_piece`'s four alternatives —
    //       indistinguishable from `_opaque_piece` itself to the LR
    //       automaton;
    //   (b) a wrapper `choice($._opaque_piece, prec(-1, $.string))` — the
    //       extra indirection ties against `_paramlist_opaque_run`'s own
    //       repeat, which consumes bare `_opaque_piece`s at the same
    //       position.
    // Inlining keeps `_opaque_piece` the single owner of the shared
    // alternatives, so the top-level and in-group forms cannot drift apart
    // in what they accept.
    //
    // TM13 residual 3: both parameter-list and nested paren bodies accept
    // balanced strings. Keep their choices identical. Giving each inner
    // opaque piece precedence 1 resolves the repeat reduction against the
    // outer string-free run; precedence on the entire loop does not.
    // Strings retain precedence -1 so structured literal types still win.
    // Outer continuation pieces remain string-free: a trailing quoted DTO
    // description must be a sibling of field_type, never part of its text.
    // No conflicts declaration or scanner change is required. The corpus,
    // quoted-callback round trips, malformed-neighbor controls and tracked
    // tree census bound this change (see docs/quoted-callback-types.md).
    _opaque_paren_group: ($) => seq('(', prec.right(repeat(choice(prec(1, $._opaque_piece), prec(-1, $.string)))), ')'),
    _opaque_bracket_group: ($) => seq('[', prec.right(repeat(choice($._opaque_piece, prec(-1, $.string)))), ']'),
    _opaque_brace_group: ($) => seq('{', prec.right(repeat(choice($._opaque_piece, prec(-1, $.string)))), '}'),

    // --- bracketed lists (name_list, shared by C1/C2/C3/C6/C7/C8/C9/C15) --
    // One list production serves every list-shaped continuation sigil
    // (`<-`, `->`, `~>`, `=>`, `~`, `>`, `<`, `$<`) — the sigil that precedes
    // `name_list` is what tells the productions above apart, not a per-sigil
    // list shape. Entries are comma-separated and widened past strict
    // `entity_name` (see `list_entry` immediately below) because the live
    // parser's own list-splitting is permissive.

    // List entries (C1/C2/C3/C6/C7/C8/C9/C15) are NOT entity_name-strict:
    // the live parser splits on ',' and trims (parser.ts parseList), so any
    // non-']'/','-shaped token is tolerated between brackets. Corpus-attested
    // shapes: dotted calls (`cli.parse`, scenario-34-cli-tool.tmd:182),
    // scoped-package consumes (`@aws-sdk/client-s3`,
    // scenario-62-dependency-consumption.tmd:33). entity_name stays strict
    // for declaration positions (E1-E11, inherit_list) — only list
    // membership widens.
    list_entry: () => token(/[@\w][\w\-/.]*/),

    // prec(1) on the opening '[': without it, P7's `_sig_chunk`
    // (`[^ \t\n"]+`, used by `freetext_value`) greedily matches a leading
    // `[array, entries]` as ONE longer chunk at the same starting position
    // this literal wants, stealing property_freetext (P7) the array-shaped
    // P2 case was supposed to win — `block_property`'s choice ORDER lists
    // property_list before property_freetext, but choice order cannot
    // override a lexer that already returned the only/longest candidate
    // token before the parser had a branch to pick from. Raising this
    // literal's precedence lets it win the tie at that one position without
    // touching `_sig_chunk`'s default precedence elsewhere — an earlier
    // attempt lowered `_sig_chunk` globally instead and broke P7's OWN
    // freetext values that legitimately need to out-compete a same-prefix
    // `entity_name` by length (e.g. `path: src/app.ts` — `entity_name`
    // matches only `src`, `_sig_chunk` correctly matches the whole
    // `src/app.ts` and must keep winning that tie by length).
    name_list: ($) => seq(token(prec(1, '[')), $.list_entry, repeat(seq(',', $.list_entry)), ']'),

    signature: ($) => repeat1(choice($._sig_chunk, $.string)),

    type_parameters: ($) => seq(token.immediate('<'), $.type_parameter_name, repeat(seq(',', $.type_parameter_name)), '>'),
    type_parameter_name: () => /[A-Za-z_]\w*/,
    heritage_type: ($) => choice($.type_named, $.type_generic),
    inherit_list: ($) => seq($.heritage_type, repeat(seq(',', $.heritage_type))),

    // A line of only whitespace is blank, not an ERROR.
    _ws_line: ($) => seq($._indent, $._newline),

    // --- tokens ----------------------------------------------------------
    // Shared lexical atoms referenced by every section above: name/path/
    // string/version classes, the four `#` roles (S-GRAMMAR-1b: comment,
    // inline_comment, ClassFile's `#:` sigil, and the string token that
    // makes `#`-in-a-string a non-event), and the `_indent`/`_newline`
    // primitives the whitespace-prefix invariant (S-GRAMMAR-3) is built on.

    // S-GRAMMAR-4b: one name class for all kinds, both directions
    // disclosed and fixture-bound. WIDENS ClassFile (leading `_` now
    // legal — today's `CLASS_FILE` regex alone forbids it, the
    // `_ValidationService` silent drop) and NARROWS leading digits
    // everywhere (today's `\w+` patterns accept `123Name`; this grammar
    // does not — scenario-54-entity-name-boundaries.tmd:40 becomes an
    // ERROR-class fixture).
    entity_name: () => /[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*/,

    dependency_name: () => /[@\w\-/]+/,

    string: () => /"([^"\\\r\n]|\\[^\r\n])*"/,

    version: () => /v?[\d.\-\w]+/,

    path: () => /[^ \t\n:{}]+/,

    param_type: () => token(seq('$', /\w+/)),

    param_marker: () => token(seq('(', /\w+/, ')')),

    // The exact 10-character reserved sequence; prec 2 beats _paren_group.
    optional_marker: () => token(prec(2, '(optional)')),

    field_name: () => /[A-Za-z_]\w*/,

    comment: () => token(/#[^\n]*/),

    // Role (c): '#' must be followed by whitespace to be an inline comment;
    // un-padded '#' stays inside the surrounding chunk (S-GRAMMAR-1b).
    inline_comment: () => token(seq('#', /[ \t][^\n]*/)),

    import_head: () => token(seq(optional('@'), 'import', /[ \t]+/, '"', /([^"\\\r\n]|\\[^\r\n])*/, '"')),

    _sig_chunk: () => token(/[^ \t\n"]+/),

    _paren_group: () => token(seq('(', /[^)\n]*/, ')')),

    // S-GRAMMAR-3: the whitespace-prefix boolean — one token, no depth
    // counting, no scanner. Preferred over the extras at column 0 (see
    // the header note on the generate-time verification, Q0).
    _indent: () => token(/[ \t]+/),

    _newline: () => token(/\r?\n/),

    _line_end: ($) => $._newline,
  },
});
