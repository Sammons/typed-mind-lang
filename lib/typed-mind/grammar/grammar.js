/**
 * TypedMind grammar — RFC-TM-2 Q0 spike (rfc-tm-2-diamond.md §2, §4).
 *
 * Q0 scope: the spike productions only. Q1 adds the remaining continuation
 * forms and corrected declaration details; Q2 adds full longform blocks
 * (H1-H12, P1-P7). Skeletal declaration productions for every sigil exist
 * here because the keyword-by-sigil fixture matrix requires them.
 *
 * Decided in this spike (evidence in the Q0 PR body):
 * - extras are [' ', '\t'] with only '\n' significant; NO zero-width
 *   anonymous tokens anywhere (the v1 `extras: []` design crashed GLR
 *   error recovery — doc §2, Rejected Alternatives).
 * - The S-GRAMMAR-3 generate-time verification PASSED with the plain
 *   `_indent` token: with [' ', '\t'] in extras, the lexer still matches
 *   the expected explicit `_indent` token at column 0 of a
 *   whitespace-prefixed line (verified for 2-space AND the 1-space
 *   equal-length tie against the ' ' extra) instead of skipping the
 *   whitespace as extras. No token precedence and no scanner needed.
 * - Error recovery is path A: no catch-all `error_line`; malformed lines
 *   rely on built-in recovery producing genuine ERROR nodes (S-GRAMMAR-4a
 *   decision rule; fuzz evidence in the PR body).
 * - Keyword strategy is design (a): keywords are reserved in block-header
 *   position ONLY, via compound header tokens (`kw ws name ws? {` as one
 *   token). In every other position a keyword lexes as a plain
 *   entity_name, so `class :: (x) => y` is a Function named `class`
 *   (census: 3 corpus hits require this). The header token buries the
 *   block name inside the token text; Q2 owns name extraction when the
 *   typed block productions land.
 * - Inline comment (S-GRAMMAR-1b role c) is chunk-based: free-text line
 *   tails (signatures) are repeat1 of whitespace-free chunk tokens, and
 *   the inline_comment token requires whitespace AFTER the '#'. Longest
 *   match then splits a padded trailing comment off the signature, while
 *   an un-padded '#' inside signature text stays inside its chunk.
 */

const KEYWORDS = ['program', 'file', 'function', 'class', 'dto', 'component', 'asset', 'constants', 'parameter', 'dependency', 'classfile'];

// Design (a) compound header token: the whole `keyword name {` prefix is ONE
// token, so the keyword never exists as a standalone token and cannot be
// mis-lexed ahead of a sigil (`class :: ...`). Tree-sitter regex has no
// lookaround; this is the doc-named scanner-free candidate.
const headerToken = (keyword) => token(seq(keyword, /[ \t]+/, /[A-Za-z_]\w*/, /[ \t]*\{/));

module.exports = grammar({
  name: 'typed_mind',

  // Spaces and tabs are skippable INSIDE a line; only \n is significant.
  extras: () => [' ', '\t'],

  rules: {
    source_file: ($) => repeat($._line),

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
        $._ws_line,
        $._newline,
      ),

    // --- document-level (D1, D3, D4) -------------------------------------

    // D1: full-line comment at column 0.
    comment_line: ($) => seq($.comment, $._newline),

    // D3: `@import "path" [as Alias]` / `import "path" [as Alias]`. The
    // intro is one compound token for the same reason as block headers:
    // a bare `import` followed by a sigil must stay a valid entity name.
    import_statement: ($) => seq($.import_head, optional(seq('as', $.entity_name)), optional($.inline_comment), $._line_end),

    // --- longform block (spike-skeletal; typed H/P productions are Q2) ---

    longform_block: ($) => seq($.block_header, $._newline, repeat($._block_line), '}', $._line_end),

    block_header: () => choice(...KEYWORDS.map(headerToken)),

    _block_line: ($) => choice($._newline, seq($.block_line_text, $._newline)),

    // --- top-level entity declarations (E1-E11, spike-skeletal) ----------

    program_declaration: ($) =>
      seq($.entity_name, '->', $.entity_name, optional($.string), optional($.version), optional($.inline_comment), $._line_end),

    file_declaration: ($) => seq($.entity_name, '@', $.path, ':', optional($.inline_comment), $._line_end),

    function_declaration: ($) => seq($.entity_name, '::', $.signature, optional($.inline_comment), $._line_end),

    class_declaration: ($) => seq($.entity_name, '<:', optional($.inherit_list), optional($.inline_comment), $._line_end),

    classfile_declaration: ($) =>
      seq($.entity_name, '#:', $.path, optional(seq('<:', $.inherit_list)), optional($.inline_comment), $._line_end),

    constants_declaration: ($) =>
      seq($.entity_name, '!', $.path, optional(seq(':', $.entity_name)), optional($.inline_comment), $._line_end),

    dto_declaration: ($) => seq($.entity_name, '%', optional($.string), optional($.inline_comment), $._line_end),

    asset_declaration: ($) => seq($.entity_name, '~', $.string, optional($.inline_comment), $._line_end),

    uicomponent_declaration: ($) => seq($.entity_name, choice('&!', '&'), $.string, optional($.inline_comment), $._line_end),

    runparameter_declaration: ($) =>
      seq($.entity_name, $.param_type, $.string, optional($.param_marker), optional($.inline_comment), $._line_end),

    // E11: name class is the code's [@\w\-/]+ incl. leading '-' and
    // @scope/pkg. Keyword-free names of the plain identifier shape lex as
    // entity_name (equal-length tie goes to the earlier-defined rule), so
    // the name accepts both tokens.
    dependency_declaration: ($) =>
      seq(choice($.entity_name, $.dependency_name), '^', $.string, optional($.version), optional($.inline_comment), $._line_end),

    // --- continuation lines (spike: C11 only; the rest are Q1) -----------

    // S-GRAMMAR-1a: ships verbatim from the doc (empirically verified).
    dto_field: ($) =>
      seq($._indent, '-', $.field_name, optional('?'), ':', $.field_type, optional($.string), optional($.optional_marker), $._line_end),

    field_type: ($) => repeat1(choice(token(prec(-1, /[^"()\n]+/)), $._paren_group)),

    signature: ($) => repeat1(choice($._sig_chunk, $.string)),

    inherit_list: ($) => seq($.entity_name, repeat(seq(',', $.entity_name))),

    // A line of only whitespace is blank, not an ERROR.
    _ws_line: ($) => seq($._indent, $._newline),

    // --- tokens ----------------------------------------------------------

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
    // the header note on the generate-time verification).
    _indent: () => token(/[ \t]+/),

    _newline: () => token(/\r?\n/),

    _line_end: ($) => $._newline,
  },
});
