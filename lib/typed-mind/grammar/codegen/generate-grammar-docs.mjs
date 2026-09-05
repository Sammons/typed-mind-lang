#!/usr/bin/env node
// RFC-TM-7 §1 (rfc-tm-7-diamond.md) — grammar.md regeneration from the real
// tree-sitter grammar. Dependency-free (node:fs/node:path only), sibling of
// generate-cst-nodes.mjs.
//
// Reads lib/typed-mind/grammar/src/grammar.json (the tree-sitter compiler's
// own output — it cannot drift from the shipped parser) and emits
// lib/typed-mind/grammar.md: one section per entity kind's shortform
// declaration shape (derived from each `*_declaration` rule), the
// continuation-operator table (derived from the `_continuation` choice), and
// the longform block forms (derived from `block_header`'s per-keyword
// alternatives). Example `tmd` blocks are NEVER synthesized from rules — they
// are read verbatim from grammar-doc-examples/*.tmd (hand-authored, validated
// by the real parser in validate-docs.test.ts). Synthesizing examples from
// rules is the mechanism that produced issue #7's invalid example.
//
// Regenerate: node lib/typed-mind/grammar/codegen/generate-grammar-docs.mjs
// CI diff-gates the committed lib/typed-mind/grammar.md via
// scripts/check-generated.mjs (the drift gate this Quantum adds).

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CODEGEN_DIR = dirname(fileURLToPath(import.meta.url));
const GRAMMAR_DIR = dirname(CODEGEN_DIR);
const PACKAGE_DIR = dirname(GRAMMAR_DIR);
const GRAMMAR_JSON_PATH = join(GRAMMAR_DIR, 'src', 'grammar.json');
const EXAMPLES_DIR = join(CODEGEN_DIR, 'grammar-doc-examples');
const OUTPUT_PATH = join(PACKAGE_DIR, 'grammar.md');

class GrammarDocError extends Error {}

const fail = (message) => {
  throw new GrammarDocError(message);
};

const loadGrammar = () => {
  if (!existsSync(GRAMMAR_JSON_PATH)) {
    fail(`grammar.json not found at ${GRAMMAR_JSON_PATH} — run tree-sitter generate first`);
  }
  return JSON.parse(readFileSync(GRAMMAR_JSON_PATH, 'utf8'));
};

const readExample = (name) => {
  const path = join(EXAMPLES_DIR, name);
  if (!existsSync(path)) {
    fail(`grammar-doc-examples/${name} not found — hand-author it (validated by validate-docs.test.ts)`);
  }
  // Examples are committed without a trailing blank line requirement; strip
  // exactly one trailing newline so the emitted fenced block doesn't carry a
  // blank line before the closing fence.
  return readFileSync(path, 'utf8').replace(/\n$/, '');
};

// ---------- grammar.json structural readers ----------
// Every reader below walks ONLY the SEQ/CHOICE/STRING/SYMBOL/BLANK node
// shapes tree-sitter's own grammar.json emits for THIS grammar. They fail
// loudly (never silently skip) when a rule's shape has moved out from under
// an assumption, per the doc's "cannot drift unnoticed" design goal.

const isBlank = (node) => node.type === 'BLANK';
const isString = (node) => node.type === 'STRING';
const isSymbol = (node, name) => node.type === 'SYMBOL' && (name === undefined || node.name === name);

// A `*_declaration` rule is always a SEQ of members. We render it as a
// sequence of syntax tokens: literal strings verbatim, symbol references as
// `<name>`, and optional members (CHOICE[symbol, BLANK]) as `[<name>]`.
const renderDeclarationShape = (ruleName, rule) => {
  if (rule.type !== 'SEQ') {
    fail(`${ruleName}: expected a SEQ rule, got ${rule.type}`);
  }
  const parts = [];
  for (const member of rule.members) {
    if (isString(member)) {
      parts.push(member.value);
      continue;
    }
    if (isSymbol(member)) {
      // The two trailing bookkeeping symbols never render into the shape.
      if (member.name === '_line_end') {
        continue;
      }
      parts.push(`<${member.name}>`);
      continue;
    }
    if (member.type === 'CHOICE') {
      // Optional single-symbol member.
      const optionalName = member.members.find((choiceMember) => isSymbol(choiceMember))?.name;
      const hasBlank = member.members.some(isBlank);
      if (optionalName !== undefined && hasBlank && member.members.length === 2) {
        if (optionalName === 'inline_comment') {
          continue; // every declaration allows a trailing inline comment; noise in the shape table
        }
        parts.push(`[<${optionalName}>]`);
        continue;
      }
      // Optional SEQ member (e.g. classfile_declaration's `<: inherit_list`).
      const seqMember = member.members.find((choiceMember) => choiceMember.type === 'SEQ');
      if (seqMember !== undefined && hasBlank && member.members.length === 2) {
        const rendered = seqMember.members
          .map((inner) => {
            if (isString(inner)) {
              return inner.value;
            }
            if (isSymbol(inner)) {
              return `<${inner.name}>`;
            }
            return fail(`${ruleName}: unsupported inner member type ${inner.type} inside optional SEQ`);
          })
          .join(' ');
        parts.push(`[${rendered}]`);
        continue;
      }
      // Two-way choice of literal strings (e.g. uicomponent_declaration's & / &!).
      if (member.members.every(isString)) {
        parts.push(member.members.map((choiceMember) => choiceMember.value).join('|'));
        continue;
      }
      // Choice of symbols (e.g. dependency_declaration's entity_name|dependency_name head).
      if (member.members.every((choiceMember) => isSymbol(choiceMember))) {
        parts.push(member.members.map((choiceMember) => `<${choiceMember.name}>`).join('|'));
        continue;
      }
      fail(`${ruleName}: unsupported CHOICE shape: ${JSON.stringify(member)}`);
      continue;
    }
    fail(`${ruleName}: unsupported member type ${member.type} in declaration rule`);
  }
  return parts.join(' ');
};

const ENTITY_KIND_BY_DECLARATION_RULE = {
  program_declaration: 'Program',
  file_declaration: 'File',
  function_declaration: 'Function',
  class_declaration: 'Class',
  classfile_declaration: 'ClassFile',
  constants_declaration: 'Constants',
  dto_declaration: 'DTO',
  asset_declaration: 'Asset',
  uicomponent_declaration: 'UIComponent',
  runparameter_declaration: 'RunParameter',
  dependency_declaration: 'Dependency',
  // RFC-TM-8 §5 (rfc-tm-8-diamond.md, X-TYPE-7): the TypeDef entity's
  // shortform declaration (`Name = enum [A, B]` / `Name = TypeExpr`).
  typedef_declaration: 'TypeDef',
};

// Declaration order mirrors grammar.json's rule declaration order (the
// generator's only ordering source — never a hand-picked list).
const declarationOrder = (grammarJson) => {
  return Object.keys(grammarJson.rules).filter((name) => name in ENTITY_KIND_BY_DECLARATION_RULE);
};

const buildShortformTable = (grammarJson) => {
  const rows = ['| Entity Kind | Shortform Declaration |', '|---|---|'];
  for (const ruleName of declarationOrder(grammarJson)) {
    const kind = ENTITY_KIND_BY_DECLARATION_RULE[ruleName];
    const shape = renderDeclarationShape(ruleName, grammarJson.rules[ruleName]);
    rows.push(`| ${kind} | \`${shape}\` |`);
  }
  return rows.join('\n');
};

// ---------- continuation-operator table ----------
// `_continuation`'s CHOICE member order is the grammar's own precedence
// order for these lines; the table walks it verbatim rather than re-sorting.
const CONTINUATION_LABELS = {
  import_list: 'Imports',
  export_list: 'Exports',
  reexports_list: 'Re-exports (File only)',
  calls_list: 'Calls',
  input_name: 'Function input',
  output_name: 'Function output',
  methods_list: 'Methods',
  affects_list: 'Affects',
  contains_list: 'Contains',
  contained_by_list: 'Contained by',
  contains_program: 'Contains program',
  default_value: 'Default value',
  consumes_list: 'Consumes',
  entity_comment: 'Comment',
};

// Every continuation rule (per grammar.json) opens with `_indent` then a
// literal operator STRING, then either a `name_list` (`[...]`), a single
// `entity_name`, or a `string`. Render the operator + the shape of its
// argument directly from the rule body — never a hand-copied regex.
const renderContinuationShape = (ruleName, rule) => {
  if (ruleName === 'entity_comment') {
    // entity_comment carries no literal operator (its shape is `_indent comment
    // _newline`) — the grammar's own `comment` token IS the `#`-prefixed line.
    return '# ...';
  }
  if (rule.type !== 'SEQ') {
    fail(`${ruleName}: expected a SEQ rule, got ${rule.type}`);
  }
  const [, operatorMember, argumentMember] = rule.members;
  if (!isString(operatorMember)) {
    fail(`${ruleName}: expected a literal operator as the second member, got ${operatorMember.type}`);
  }
  const operator = operatorMember.value;
  if (isSymbol(argumentMember, 'name_list')) {
    return `${operator} [...]`;
  }
  if (isSymbol(argumentMember, 'entity_name')) {
    return `${operator} Name`;
  }
  if (isSymbol(argumentMember, 'string')) {
    return `${operator} "..."`;
  }
  fail(`${ruleName}: unsupported continuation argument shape ${JSON.stringify(argumentMember)}`);
};

const buildContinuationTable = (grammarJson) => {
  const continuationChoice = grammarJson.rules._continuation;
  if (continuationChoice === undefined || continuationChoice.type !== 'CHOICE') {
    fail('_continuation rule not found or not a CHOICE — the continuation-operator table source has moved');
  }
  const rows = ['| Continuation | Syntax |', '|---|---|'];
  for (const member of continuationChoice.members) {
    if (!isSymbol(member)) {
      fail(`_continuation: expected a SYMBOL member, got ${member.type}`);
    }
    const ruleName = member.name;
    const label = CONTINUATION_LABELS[ruleName];
    if (label === undefined) {
      fail(`_continuation: no doc label registered for ${ruleName} — add one to CONTINUATION_LABELS`);
    }
    const shape = renderContinuationShape(ruleName, grammarJson.rules[ruleName]);
    rows.push(`| ${label} | \`${shape}\` |`);
  }
  return rows.join('\n');
};

// ---------- longform block forms ----------
// block_header is a CHOICE of per-keyword SEQ alternatives; each alternative
// names its keyword via the ALIAS'd block_kw token's SEQ (STRING keyword +
// whitespace pattern + first-char pattern). Extract just the keyword string.
const extractBlockKeyword = (blockKwAlternative) => {
  const aliasedToken = blockKwAlternative.content;
  if (aliasedToken?.type !== 'TOKEN' || aliasedToken.content?.type !== 'SEQ') {
    fail(`block_header alternative: unexpected block_kw token shape ${JSON.stringify(blockKwAlternative)}`);
  }
  const firstMember = aliasedToken.content.members[0];
  if (!isString(firstMember)) {
    fail('block_header alternative: block_kw token does not start with a literal keyword string');
  }
  return firstMember.value;
};

const buildLongformKeywordTable = (grammarJson) => {
  const blockHeader = grammarJson.rules.block_header;
  if (blockHeader === undefined || blockHeader.type !== 'CHOICE') {
    fail('block_header rule not found or not a CHOICE — the longform keyword table source has moved');
  }
  const keywords = [];
  for (const alternative of blockHeader.members) {
    if (alternative.type !== 'SEQ') {
      fail(`block_header: expected a SEQ alternative, got ${alternative.type}`);
    }
    const blockKwMember = alternative.members.find((member) => member.type === 'ALIAS');
    if (blockKwMember === undefined) {
      fail('block_header alternative: no ALIAS(block_kw) member found');
    }
    const nameMember = alternative.members.find((member) => member.type === 'FIELD' && member.name === 'name');
    const usesQuotedName = nameMember?.content?.type === 'SYMBOL' && nameMember.content.name === 'header_quoted_name';
    const keyword = extractBlockKeyword(blockKwMember);
    keywords.push({ keyword, usesQuotedName });
  }
  // Two alternatives share the `dependency` keyword (identifier-name form and
  // quoted-name form, per the grammar's own S-GRAMMAR-2a extension) — collapse
  // them into one row rather than emitting a duplicate.
  const seen = new Map();
  for (const { keyword, usesQuotedName } of keywords) {
    const existing = seen.get(keyword);
    if (existing === undefined) {
      seen.set(keyword, new Set([usesQuotedName]));
    } else {
      existing.add(usesQuotedName);
    }
  }
  const rows = ['| Keyword | Header Form |', '|---|---|'];
  for (const [keyword, nameForms] of seen) {
    const forms = [];
    if (nameForms.has(false)) {
      forms.push(`\`${keyword} Name {\``);
    }
    if (nameForms.has(true)) {
      forms.push(`\`${keyword} "quoted-name" {\``);
    }
    rows.push(`| ${keyword} | ${forms.join(' or ')} |`);
  }
  return rows.join('\n');
};

// ---------- suppression forms (RFC-TM-8 §7/§10, X-SUPP-5) ----------
// suppress_line and suppression_block/suppression_entry have a different
// shape from *_declaration (their keyword is an ALIAS'd compound token, and
// target/code/reason are FIELD-wrapped, not bare SYMBOL/CHOICE members) — a
// dedicated reader, not a forced fit into renderDeclarationShape, keeps that
// function's Q1-frozen rendering for the eleven entity kinds untouched.
// Fails loudly on shape drift, per every other reader in this file.

// `target` on suppress_line is CHOICE[SYMBOL(header_name_rest), BLANK] — the
// field is optional (absent for a single-character target name, mirroring
// every other header_name_rest use in this grammar); every other field here
// is a bare SYMBOL. Both shapes are accepted; anything else fails loudly.
const fieldSymbolName = (ruleName, member, fieldName) => {
  if (member.type !== 'FIELD' || member.name !== fieldName) {
    fail(`${ruleName}: expected field '${fieldName}', got ${JSON.stringify(member)}`);
  }
  if (member.content.type === 'SYMBOL') {
    return member.content.name;
  }
  if (member.content.type === 'CHOICE') {
    const symbolMember = member.content.members.find((choiceMember) => choiceMember.type === 'SYMBOL');
    const hasBlank = member.content.members.some(isBlank);
    if (symbolMember !== undefined && hasBlank && member.content.members.length === 2) {
      return symbolMember.name;
    }
  }
  fail(
    `${ruleName}: field '${fieldName}' is not a bare SYMBOL reference or an optional SYMBOL|BLANK choice: ${JSON.stringify(member.content)}`,
  );
};

// suppress_line: ALIAS(suppress_kw) FIELD(target) FIELD(code) FIELD(reason)
// [inline_comment] _line_end. Renders the shortform shape directly from the
// rule body — never a hand-copied literal.
const renderSuppressLineShape = (grammarJson) => {
  const rule = grammarJson.rules.suppress_line;
  if (rule === undefined || rule.type !== 'SEQ') {
    fail('suppress_line rule not found or not a SEQ — the suppression shortform shape source has moved');
  }
  const [keywordMember, targetMember, codeMember, reasonMember] = rule.members;
  if (keywordMember?.type !== 'ALIAS' || keywordMember.value !== 'suppress_kw') {
    fail(`suppress_line: expected ALIAS(suppress_kw) as the first member, got ${JSON.stringify(keywordMember)}`);
  }
  const targetSymbol = fieldSymbolName('suppress_line', targetMember, 'target');
  const codeSymbol = fieldSymbolName('suppress_line', codeMember, 'code');
  const reasonSymbol = fieldSymbolName('suppress_line', reasonMember, 'reason');
  if (targetSymbol !== 'header_name_rest' || codeSymbol !== 'check_code' || reasonSymbol !== 'string') {
    fail(`suppress_line: unexpected field symbol shapes (target=${targetSymbol}, code=${codeSymbol}, reason=${reasonSymbol})`);
  }
  return 'suppress <target> <code> "<reason>"';
};

// suppression_block/suppression_entry: ALIAS(suppress_block_kw) _newline
// repeat(entry) '}' _line_end, with each entry FIELD(target)=entity_name
// FIELD(code)=check_code FIELD(reason)=string.
const renderSuppressionEntryShape = (grammarJson) => {
  const rule = grammarJson.rules.suppression_entry;
  if (rule === undefined || rule.type !== 'SEQ') {
    fail('suppression_entry rule not found or not a SEQ — the suppression longform entry shape source has moved');
  }
  const [, targetMember, codeMember, reasonMember] = rule.members;
  const targetSymbol = fieldSymbolName('suppression_entry', targetMember, 'target');
  const codeSymbol = fieldSymbolName('suppression_entry', codeMember, 'code');
  const reasonSymbol = fieldSymbolName('suppression_entry', reasonMember, 'reason');
  if (targetSymbol !== 'entity_name' || codeSymbol !== 'check_code' || reasonSymbol !== 'string') {
    fail(`suppression_entry: unexpected field symbol shapes (target=${targetSymbol}, code=${codeSymbol}, reason=${reasonSymbol})`);
  }
  return '<target> <code> "<reason>"';
};

const validateSuppressionBlockShape = (grammarJson) => {
  const rule = grammarJson.rules.suppression_block;
  if (rule === undefined || rule.type !== 'SEQ') {
    fail('suppression_block rule not found or not a SEQ — the suppression longform block shape source has moved');
  }
  const keywordMember = rule.members[0];
  if (keywordMember?.type !== 'ALIAS' || keywordMember.value !== 'suppress_block_kw') {
    fail(`suppression_block: expected ALIAS(suppress_block_kw) as the first member, got ${JSON.stringify(keywordMember)}`);
  }
};

const buildSuppressionSection = (grammarJson) => {
  const shortformShape = renderSuppressLineShape(grammarJson);
  validateSuppressionBlockShape(grammarJson);
  const entryShape = renderSuppressionEntryShape(grammarJson);
  const rows = [
    '| Form | Syntax |',
    '|---|---|',
    `| Shortform line | \`${shortformShape}\` |`,
    `| Longform block entry | \`${entryShape}\` (inside \`suppress { ... }\`) |`,
  ];
  return rows.join('\n');
};

// ---------- assembly ----------

const fence = (source) => `\`\`\`tmd\n${source}\n\`\`\``;

const buildMarkdown = (grammarJson) => {
  const sections = [];
  sections.push('# TypedMind DSL Grammar Reference');
  sections.push('');
  sections.push(
    'This document is generated from the tree-sitter grammar (`grammar/src/grammar.json`) by ' +
      '`grammar/codegen/generate-grammar-docs.mjs`. Do not edit it by hand — regenerate it instead. ' +
      'Example `tmd` blocks are hand-authored under `grammar/codegen/grammar-doc-examples/` and ' +
      'validated by the real parser in `validate-docs.test.ts`; they are never synthesized from grammar rules.',
  );
  sections.push('');
  sections.push('## Note from Author');
  sections.push('');
  sections.push(
    'TypedMind is meant to be a DSL to represent a variety of programs and\n' +
      'force AI to create a cohesive program architecture with a relatively token efficient syntax.\n\n' +
      'Entities link bidirectionally, so for example it is not enough to declare a function,\n' +
      'the file must also be declared. The function must be exported by a file. And the function must be\n' +
      'consumed by another entity to avoid dead code. The TypedMind checker will validate these scenarios.',
  );
  sections.push('');
  sections.push('## Table of Contents');
  sections.push('');
  sections.push('1. [Shortform Declarations](#shortform-declarations)');
  sections.push('2. [Continuation Operators](#continuation-operators)');
  sections.push('3. [Longform Block Declarations](#longform-block-declarations)');
  sections.push('4. [DTO Field Syntax](#dto-field-syntax)');
  sections.push('5. [Suppression](#suppression)');
  sections.push('6. [Quick Reference Example](#quick-reference-example)');
  sections.push('7. [Longform Example](#longform-example)');
  sections.push('8. [Quoted Strings](#quoted-strings)');
  sections.push('');
  sections.push('## Shortform Declarations');
  sections.push('');
  sections.push('One entity per line. `<symbol>` names a grammar production; `[...]` marks an optional member.');
  sections.push('');
  sections.push(buildShortformTable(grammarJson));
  sections.push('');
  sections.push('## Continuation Operators');
  sections.push('');
  sections.push('Indented lines that attach properties to the most recently declared entity.');
  sections.push('');
  sections.push(buildContinuationTable(grammarJson));
  sections.push('');
  sections.push('A calls entry is `fn`, `File.fn`, `Class.method`, or `Class.constructor` (constructs the class).');
  sections.push('');
  sections.push(fence(readExample('continuation-operators.tmd')));
  sections.push('');
  sections.push('Asset-to-Program containment uses its own operator, illustrated separately:');
  sections.push('');
  sections.push(fence(readExample('contains-program.tmd')));
  sections.push('');
  sections.push('## Longform Block Declarations');
  sections.push('');
  sections.push(
    'Longform wraps the same entity kinds in a brace-delimited block: `keyword Name { ... }`. ' +
      'Properties inside the block are `key: value` pairs (string, list, identifier, boolean, ' +
      "nested block, or free-text, per the grammar's property forms).",
  );
  sections.push('');
  sections.push(buildLongformKeywordTable(grammarJson));
  sections.push('');
  sections.push('## DTO Field Syntax');
  sections.push('');
  sections.push('Shortform DTO fields: `- name[?]: type ["description"] [(optional)]`.');
  sections.push('');
  sections.push(fence(readExample('dto-fields.tmd')));
  sections.push('');
  sections.push('## Suppression');
  sections.push('');
  sections.push(
    'A suppression silences exactly one (check code, target entity) finding for the checker ' +
      'run — the finding stays visible in output, labeled with its reason, and is counted in a ' +
      'suppressed-summary line (not hidden). A suppression matching zero findings this run is ' +
      'itself flagged (`checker/stale-suppression`); the suppression-machinery codes are not ' +
      'suppressible. A reasonless suppression line is a parse error — the reason is mandatory.',
  );
  sections.push('');
  sections.push(buildSuppressionSection(grammarJson));
  sections.push('');
  sections.push(fence(readExample('suppression.tmd')));
  sections.push('');
  sections.push('## Quick Reference Example');
  sections.push('');
  sections.push(fence(readExample('quick-reference.tmd')));
  sections.push('');
  sections.push('## Longform Example');
  sections.push('');
  sections.push(fence(readExample('longform-classfile.tmd')));
  sections.push('');
  sections.push('## Quoted Strings');
  sections.push('');
  sections.push(
    'Quoted values escape a double quote as `\\"` and a backslash as `\\\\`. ' +
      'Other escape pairs, including `\\n` and `\\q`, retain their literal backslash. ' +
      'Physical newlines are not allowed inside quoted tokens. The same rule covers descriptions, reasons, literal types, import paths, and quoted dependency names.',
  );
  sections.push('');
  sections.push(
    'Longform type values use an escaped outer string; parsing that wrapper restores the original type expression before its literal values are decoded. ' +
      'Older documents treated backslashes as ordinary characters. Existing doubled backslashes now decode to one backslash; an odd trailing run escapes the closing quote. ' +
      'Use an even trailing run to represent a value ending in a backslash.',
  );
  sections.push('');
  return `${sections.join('\n')}\n`;
};

const listUnusedExamples = (usedNames) => {
  const allNames = readdirSync(EXAMPLES_DIR).filter((name) => name.endsWith('.tmd'));
  return allNames.filter((name) => !usedNames.has(name));
};

const main = () => {
  const grammarJson = loadGrammar();
  const usedExamples = new Set([
    'continuation-operators.tmd',
    'contains-program.tmd',
    'dto-fields.tmd',
    'suppression.tmd',
    'quick-reference.tmd',
    'longform-classfile.tmd',
  ]);
  const markdown = buildMarkdown(grammarJson);
  const unused = listUnusedExamples(usedExamples);
  if (unused.length > 0) {
    fail(`grammar-doc-examples/ has unused files (dead templates): ${unused.join(', ')}`);
  }
  writeFileSync(OUTPUT_PATH, markdown);
  console.log(`[generate-grammar-docs] wrote ${OUTPUT_PATH}`);
};

try {
  main();
} catch (error) {
  if (error instanceof GrammarDocError) {
    console.error(`[generate-grammar-docs] FAIL: ${error.message}`);
  } else {
    console.error('[generate-grammar-docs] FAIL:', error);
  }
  process.exit(1);
}
