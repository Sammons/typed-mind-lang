/**
 * TypedMind grammar — RFC-TM-2 (rfc-tm-2-diamond.md).
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
 * Q1 scope (this change, doc §4 "Q1 — Full shortform"): all 11 entity
 * declarations with the corrected E4/E10/E11 forms, all 15 continuation
 * forms (C1-C15), D2's per-line-type inline-comment scoping (entity decls
 * and continuations admit it; import lines do not — parser.ts:191,459 vs
 * :667-678), D3/D4, and both directions of S-GRAMMAR-4b name-class
 * normalization. Q2 (braced longform H1-H12/P1-P7) and Q3 (corpus proof)
 * are out of scope here; `longform_block`/`block_header` stay at their Q0
 * skeletal shape (needed only for the keyword×sigil matrix fixture) and are
 * NOT the H1-H12 typed productions — those are Q2's job.
 */

const KEYWORDS = ['program', 'file', 'function', 'class', 'dto', 'component', 'asset', 'constants', 'parameter', 'dependency', 'classfile'];

// Design (a) compound header token: the whole `keyword name {` prefix is ONE
// token, so the keyword never exists as a standalone token and cannot be
// mis-lexed ahead of a sigil (`class :: ...`). Tree-sitter regex has no
// lookaround; this is the doc-named scanner-free candidate. Unchanged from
// Q0 — Q2 owns extracting the name and body from inside this token.
const headerToken = (keyword) => token(seq(keyword, /[ \t]+/, /[A-Za-z_]\w*/, /[ \t]*\{/));

module.exports = grammar({
  name: 'typed_mind',

  // Spaces and tabs are skippable INSIDE a line; only \n is significant.
  extras: () => [' ', '\t'],

  rules: {
    // Q1 refinement (spike report item): the last line of a file must
    // parse without a MISSING _newline. `_line_end` still requires `\n`
    // for the common case (every corpus fixture is newline-terminated),
    // but the final `_line` in the file may omit it — this is expressed
    // as an alternate top-level rule rather than making `_newline` itself
    // optional (which would let every _line_end silently accept no
    // newline and break line-boundary disambiguation everywhere else).
    source_file: ($) => seq(repeat($._line), optional($._final_line_no_newline)),

    _line: ($) =>
      choice(
        $.comment_line,
        $.import_statement,
        $.longform_block,
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

    // --- longform block (Q0/Q1-skeletal; typed H/P productions are Q2) ---

    longform_block: ($) => seq($.block_header, $._newline, repeat($._block_line), '}', $._line_end),

    block_header: () => choice(...KEYWORDS.map(headerToken)),

    _block_line: ($) => choice($._newline, seq($.block_line_text, $._newline)),

    // --- top-level entity declarations (E1-E11) --------------------------

    // E1: `Name -> Entry ["Purpose"] [vX.Y.Z]`.
    program_declaration: ($) =>
      seq($.entity_name, '->', $.entity_name, optional($.string), optional($.version), optional($.inline_comment), $._line_end),
    program_declaration_final: ($) =>
      seq($.entity_name, '->', $.entity_name, optional($.string), optional($.version), optional($.inline_comment)),

    // E2: `Name @ path:`.
    file_declaration: ($) => seq($.entity_name, '@', $.path, ':', optional($.inline_comment), $._line_end),
    file_declaration_final: ($) => seq($.entity_name, '@', $.path, ':', optional($.inline_comment)),

    // E3: `Name :: signature-to-EOL`.
    function_declaration: ($) => seq($.entity_name, '::', $.signature, optional($.inline_comment), $._line_end),
    function_declaration_final: ($) => seq($.entity_name, '::', $.signature, optional($.inline_comment)),

    // E4 — CORRECTED: `Name <: [Base[, Iface...]]`. The inheritance list
    // may be EMPTY (bare `Name <:` — scenario-34-cli-tool.tmd:127 `cli <:`,
    // :134 `taskRunner <:`, and 8 more instances in the same file).
    class_declaration: ($) => seq($.entity_name, '<:', optional($.inherit_list), optional($.inline_comment), $._line_end),
    class_declaration_final: ($) => seq($.entity_name, '<:', optional($.inherit_list), optional($.inline_comment)),

    // E5: `Name #: path [<: Base[, Iface...]]`.
    classfile_declaration: ($) =>
      seq($.entity_name, '#:', $.path, optional(seq('<:', $.inherit_list)), optional($.inline_comment), $._line_end),
    classfile_declaration_final: ($) => seq($.entity_name, '#:', $.path, optional(seq('<:', $.inherit_list)), optional($.inline_comment)),

    // E6: `Name ! path [: Schema]`.
    constants_declaration: ($) =>
      seq($.entity_name, '!', $.path, optional(seq(':', $.entity_name)), optional($.inline_comment), $._line_end),
    constants_declaration_final: ($) => seq($.entity_name, '!', $.path, optional(seq(':', $.entity_name)), optional($.inline_comment)),

    // E7: `Name %` or `Name % "Purpose"`.
    dto_declaration: ($) => seq($.entity_name, '%', optional($.string), optional($.inline_comment), $._line_end),
    dto_declaration_final: ($) => seq($.entity_name, '%', optional($.string), optional($.inline_comment)),

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

    field_type: ($) => repeat1(choice(token(prec(-1, /[^"()\n]+/)), $._paren_group)),

    name_list: ($) => seq('[', $.entity_name, repeat(seq(',', $.entity_name)), ']'),

    signature: ($) => repeat1(choice($._sig_chunk, $.string)),

    inherit_list: ($) => seq($.entity_name, repeat(seq(',', $.entity_name))),

    // A line of only whitespace is blank, not an ERROR.
    _ws_line: ($) => seq($._indent, $._newline),

    // --- tokens ----------------------------------------------------------

    // S-GRAMMAR-4b: one name class for all kinds, both directions
    // disclosed and fixture-bound. WIDENS ClassFile (leading `_` now
    // legal — today's `CLASS_FILE` regex alone forbids it, the
    // `_ValidationService` silent drop) and NARROWS leading digits
    // everywhere (today's `\w+` patterns accept `123Name`; this grammar
    // does not — scenario-54-entity-name-boundaries.tmd:40 becomes an
    // ERROR-class fixture).
    entity_name: () => /[A-Za-z_]\w*/,

    dependency_name: () => /[@\w\-/]+/,

    string: () => /"[^"\n]*"/,

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

    import_head: () => token(seq(optional('@'), 'import', /[ \t]+/, '"', /[^"\n]*/, '"')),

    block_line_text: () => token(/[^ \t\n}][^\n]*/),

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
