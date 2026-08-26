#!/usr/bin/env node
// RFC-TM-3 §2.1 (rfc-tm-3-diamond.md) — node-types.json → typed CST wrapper codegen.
//
// Reads lib/typed-mind/grammar/src/node-types.json (and grammar.json for the
// twin-completeness cross-check) and emits ONE typed wrapper class per logical
// production into lib/typed-mind/src/ast/gen/cst-nodes.ts:
//   - `_final` twins are normalized: `X` and `X_final` construct the same class.
//   - Field/children accessors are typed from the node-types `fields`/`children`
//     maps (twin maps are unioned).
//   - `span()` converts tree-sitter's 0-based positions to the repo's 1-based
//     Span convention at the wrapper boundary (doc §3.2).
//   - `headerName()` reassembles a longform header's split name (doc §1):
//     block_kw's last character + header_name_rest's text, or the quoted form's
//     header_quoted_name minus its closing quote.
//
// Generation-time assertions (doc §2.1):
//   - Twin-pairing completeness: an orphan `X_final` without a base `X`, a twin
//     the grammar's `_final_line_no_newline` expansion expects but node-types
//     lacks, or a twin node-types carries that the grammar does not expect, is
//     an ERROR — never a silent two-class fallback.
//   - Emitted class count === named-node count − twin count (self-updating).
//   - block_header still carries the name field + block_kw child the emitted
//     headerName() template depends on.
//
// The emitted file is committed and CI diff-gated by scripts/check-generated.mjs
// step 2b. Output is piped through the repo's pinned biome formatter so the
// committed artifact is lint-clean and byte-deterministic.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CODEGEN_DIR = dirname(fileURLToPath(import.meta.url));
const GRAMMAR_DIR = dirname(CODEGEN_DIR);
const PACKAGE_DIR = dirname(GRAMMAR_DIR);
const REPO_ROOT = dirname(dirname(PACKAGE_DIR));
const NODE_TYPES_PATH = join(GRAMMAR_DIR, 'src', 'node-types.json');
const GRAMMAR_JSON_PATH = join(GRAMMAR_DIR, 'src', 'grammar.json');
const OUTPUT_DIR = join(PACKAGE_DIR, 'src', 'ast', 'gen');
const OUTPUT_PATH = join(OUTPUT_DIR, 'cst-nodes.ts');
const FINAL_SUFFIX = '_final';

class CodegenError extends Error {}

const fail = (message) => {
  throw new CodegenError(message);
};

const pascalCase = (snakeName) =>
  snakeName
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

const camelCase = (snakeName) => {
  const pascal = pascalCase(snakeName);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

const className = (logicalName) => `Cst${pascalCase(logicalName)}`;

// Recursively expand a grammar.json rule body, collecting the VISIBLE (non-`_`)
// SYMBOL names it can produce; hidden symbols recurse into their own rules.
const collectVisibleSymbols = (ruleBody, rules, collected, visiting = new Set()) => {
  if (ruleBody === null || typeof ruleBody !== 'object') {
    return collected;
  }
  if (ruleBody.type === 'SYMBOL') {
    const symbolName = ruleBody.name;
    if (symbolName.startsWith('_')) {
      if (!visiting.has(symbolName)) {
        visiting.add(symbolName);
        const hiddenRule = rules[symbolName];
        if (hiddenRule === undefined) {
          fail(`grammar.json: hidden symbol ${symbolName} has no rule`);
        }
        collectVisibleSymbols(hiddenRule, rules, collected, visiting);
      }
      return collected;
    }
    collected.add(symbolName);
    return collected;
  }
  for (const value of Object.values(ruleBody)) {
    if (Array.isArray(value)) {
      for (const member of value) {
        collectVisibleSymbols(member, rules, collected, visiting);
      }
    } else if (value !== null && typeof value === 'object') {
      collectVisibleSymbols(value, rules, collected, visiting);
    }
  }
  return collected;
};

const loadInputs = () => {
  const nodeTypes = JSON.parse(readFileSync(NODE_TYPES_PATH, 'utf8'));
  const grammarJson = JSON.parse(readFileSync(GRAMMAR_JSON_PATH, 'utf8'));
  return { nodeTypes, grammarJson };
};

const assertTwinCompleteness = (namedTypeNames, grammarJson) => {
  const namedSet = new Set(namedTypeNames);
  const finalsInNodeTypes = namedTypeNames.filter((name) => name.endsWith(FINAL_SUFFIX));

  for (const finalName of finalsInNodeTypes) {
    const baseName = finalName.slice(0, -FINAL_SUFFIX.length);
    if (!namedSet.has(baseName)) {
      fail(`orphan twin: node-types.json has ${finalName} but no base ${baseName}`);
    }
  }

  const finalLineRule = grammarJson.rules._final_line_no_newline;
  if (finalLineRule === undefined) {
    fail('grammar.json: _final_line_no_newline rule not found — twin cross-check impossible');
  }
  const expectedFinals = collectVisibleSymbols(finalLineRule, grammarJson.rules, new Set());
  for (const expectedFinal of [...expectedFinals].sort()) {
    if (!expectedFinal.endsWith(FINAL_SUFFIX)) {
      fail(`grammar.json: _final_line_no_newline expands to non-twin symbol ${expectedFinal}`);
    }
    if (!namedSet.has(expectedFinal)) {
      const baseName = expectedFinal.slice(0, -FINAL_SUFFIX.length);
      fail(`base ${baseName} is missing its expected twin: grammar expects ${expectedFinal} but node-types.json lacks it`);
    }
  }
  for (const finalName of finalsInNodeTypes) {
    if (!expectedFinals.has(finalName)) {
      fail(`unexpected twin: node-types.json has ${finalName} but the grammar's _final_line_no_newline never produces it`);
    }
  }
  return new Set(finalsInNodeTypes);
};

// Union the fields/children maps of a logical production's concrete twins.
const mergeTwinShapes = (concreteEntries) => {
  const fieldTypeNames = new Map();
  const childTypeNames = new Set();
  for (const entry of concreteEntries) {
    for (const [fieldName, fieldInfo] of Object.entries(entry.fields ?? {})) {
      const existing = fieldTypeNames.get(fieldName) ?? new Set();
      for (const fieldType of fieldInfo.types) {
        if (fieldType.named) {
          existing.add(fieldType.type);
        }
      }
      fieldTypeNames.set(fieldName, existing);
    }
    for (const childType of entry.children?.types ?? []) {
      if (childType.named) {
        childTypeNames.add(childType.type);
      }
    }
  }
  return { fieldTypeNames, childTypeNames };
};

const logicalNameOf = (concreteName, namedSet) => {
  if (concreteName.endsWith(FINAL_SUFFIX)) {
    const baseName = concreteName.slice(0, -FINAL_SUFFIX.length);
    if (namedSet.has(baseName)) {
      return baseName;
    }
  }
  return concreteName;
};

const assertBlockHeaderShape = (entryByName) => {
  const blockHeader = entryByName.get('block_header');
  if (blockHeader === undefined) {
    fail('block_header node missing from node-types.json — headerName() template invalidated');
  }
  const nameField = blockHeader.fields?.name;
  const nameFieldTypes = new Set((nameField?.types ?? []).map((fieldType) => fieldType.type));
  if (!nameFieldTypes.has('header_name_rest') || !nameFieldTypes.has('header_quoted_name')) {
    fail('block_header name field no longer carries header_name_rest|header_quoted_name — headerName() template invalidated');
  }
  const childTypes = new Set((blockHeader.children?.types ?? []).map((childType) => childType.type));
  if (!childTypes.has('block_kw')) {
    fail('block_header no longer carries a block_kw child — headerName() template invalidated');
  }
};

const emitClass = (logicalName, concreteTypes, shape, namedSet) => {
  const lines = [];
  const wrapperName = className(logicalName);
  lines.push(`export class ${wrapperName} extends CstNode {`);
  lines.push(`  static readonly nodeTypes: readonly string[] = [${concreteTypes.map((type) => `'${type}'`).join(', ')}];`);
  lines.push('  constructor(syntaxNode: SyntaxNode) {');
  lines.push(`    super(syntaxNode, ${wrapperName}.nodeTypes);`);
  lines.push('  }');

  const sortedFieldNames = [...shape.fieldTypeNames.keys()].sort();
  for (const fieldName of sortedFieldNames) {
    const fieldLogicalNames = [...new Set([...shape.fieldTypeNames.get(fieldName)].map((type) => logicalNameOf(type, namedSet)))].sort();
    const unionType = fieldLogicalNames.map((name) => className(name)).join(' | ');
    lines.push(`  ${camelCase(fieldName)}Field(): ${unionType} | undefined {`);
    lines.push(`    const fieldNode = this.syntaxNode.childForFieldName('${fieldName}');`);
    lines.push('    if (fieldNode === null) {');
    lines.push('      return undefined;');
    lines.push('    }');
    for (const fieldLogicalName of fieldLogicalNames) {
      const concreteFieldTypes = [fieldLogicalName];
      if (namedSet.has(`${fieldLogicalName}${FINAL_SUFFIX}`)) {
        concreteFieldTypes.push(`${fieldLogicalName}${FINAL_SUFFIX}`);
      }
      const condition = concreteFieldTypes.map((type) => `fieldNode.type === '${type}'`).join(' || ');
      lines.push(`    if (${condition}) {`);
      lines.push(`      return new ${className(fieldLogicalName)}(fieldNode);`);
      lines.push('    }');
    }
    lines.push('    return undefined;');
    lines.push('  }');
  }

  const childLogicalNames = [...new Set([...shape.childTypeNames].map((type) => logicalNameOf(type, namedSet)))].sort();
  for (const childLogicalName of childLogicalNames) {
    const concreteChildTypes = [childLogicalName];
    if (namedSet.has(`${childLogicalName}${FINAL_SUFFIX}`)) {
      concreteChildTypes.push(`${childLogicalName}${FINAL_SUFFIX}`);
    }
    const typeList = concreteChildTypes.map((type) => `'${type}'`).join(', ');
    lines.push(`  ${camelCase(childLogicalName)}Children(): ${className(childLogicalName)}[] {`);
    lines.push(`    return this.childrenOfTypes([${typeList}], ${className(childLogicalName)});`);
    lines.push('  }');
  }

  if (logicalName === 'block_header') {
    // Sanctioned generated helper (doc §1/§2.1): reassemble the split header
    // name. Identifier form: block_kw's LAST character (the name's first
    // character baked into the atomic keyword token) + header_name_rest's
    // text (absent for single-character names). Quoted dependency form:
    // header_quoted_name's text minus its trailing closing quote.
    lines.push('  headerName(): string {');
    lines.push('    const nameField = this.nameField();');
    lines.push('    if (nameField instanceof CstHeaderQuotedName) {');
    lines.push('      return nameField.text.slice(0, -1);');
    lines.push('    }');
    lines.push("    const keywordText = this.blockKwChildren().at(0)?.text ?? '';");
    lines.push('    const lastKeywordCharacter = keywordText.slice(-1);');
    lines.push('    if (nameField === undefined) {');
    lines.push('      return lastKeywordCharacter;');
    lines.push('    }');
    lines.push('    return lastKeywordCharacter + nameField.text;');
    lines.push('  }');
  }

  lines.push('}');
  return lines.join('\n');
};

const generate = () => {
  const { nodeTypes, grammarJson } = loadInputs();
  const namedEntries = nodeTypes.filter((entry) => entry.named);
  const namedTypeNames = namedEntries.map((entry) => entry.type);
  const namedSet = new Set(namedTypeNames);
  const entryByName = new Map(namedEntries.map((entry) => [entry.type, entry]));

  for (const entry of namedEntries) {
    if (entry.subtypes !== undefined) {
      fail(`supertype node ${entry.type} found — the wrapper emitter has no supertype template`);
    }
  }

  const finals = assertTwinCompleteness(namedTypeNames, grammarJson);
  assertBlockHeaderShape(entryByName);

  const logicalNames = namedTypeNames.filter((name) => !finals.has(name)).sort();
  const expectedClassCount = namedTypeNames.length - finals.size;
  if (logicalNames.length !== expectedClassCount) {
    fail(`emitted class count ${logicalNames.length} !== named-node count ${namedTypeNames.length} - twin count ${finals.size}`);
  }

  const classBlocks = logicalNames.map((logicalName) => {
    const concreteTypes = [logicalName];
    if (finals.has(`${logicalName}${FINAL_SUFFIX}`)) {
      concreteTypes.push(`${logicalName}${FINAL_SUFFIX}`);
    }
    const shape = mergeTwinShapes(concreteTypes.map((type) => entryByName.get(type)));
    return emitClass(logicalName, concreteTypes, shape, namedSet);
  });

  const unionMembers = logicalNames.map((name) => `  | ${className(name)}`).join('\n');
  const mapEntries = namedTypeNames
    .slice()
    .sort()
    .map((concreteName) => `  ['${concreteName}', ${className(logicalNameOf(concreteName, namedSet))}],`)
    .join('\n');

  const output = `// GENERATED FILE — DO NOT EDIT.
// Emitted by lib/typed-mind/grammar/codegen/generate-cst-nodes.mjs (RFC-TM-3 §2.1)
// from lib/typed-mind/grammar/src/node-types.json: ${namedTypeNames.length} named nodes,
// ${finals.size} \`_final\` twins → ${expectedClassCount} wrapper classes (one per logical production).
// Regenerate: node lib/typed-mind/grammar/codegen/generate-cst-nodes.mjs
// CI diff-gates this file via scripts/check-generated.mjs step 2b.

import type { Node as SyntaxNode } from 'web-tree-sitter';
import type { Span } from '../span.ts';

export const CST_NAMED_NODE_TYPE_COUNT = ${namedTypeNames.length};
export const CST_FINAL_TWIN_COUNT = ${finals.size};
export const CST_LOGICAL_CLASS_COUNT = ${expectedClassCount};

const spanOf = (syntaxNode: SyntaxNode): Span => ({
  start: { line: syntaxNode.startPosition.row + 1, column: syntaxNode.startPosition.column + 1 },
  end: { line: syntaxNode.endPosition.row + 1, column: syntaxNode.endPosition.column + 1 },
});

export abstract class CstNode {
  // Explicit field assignment (not a constructor parameter property): parameter
  // properties are non-erasable syntax and break Node's strip-only execution.
  readonly syntaxNode: SyntaxNode;

  protected constructor(syntaxNode: SyntaxNode, expectedTypes: readonly string[]) {
    if (!expectedTypes.includes(syntaxNode.type)) {
      throw new Error(\`CST wrapper type mismatch: expected \${expectedTypes.join(' | ')}, got \${syntaxNode.type}\`);
    }
    this.syntaxNode = syntaxNode;
  }

  get text(): string {
    return this.syntaxNode.text;
  }

  get isFinal(): boolean {
    return this.syntaxNode.type.endsWith('${FINAL_SUFFIX}');
  }

  span(): Span {
    return spanOf(this.syntaxNode);
  }

  namedChildNodes(): CstNamedNode[] {
    const wrapped: CstNamedNode[] = [];
    for (const child of this.syntaxNode.namedChildren) {
      const wrappedChild = wrapCstNode(child);
      if (wrappedChild !== undefined) {
        wrapped.push(wrappedChild);
      }
    }
    return wrapped;
  }

  protected childrenOfTypes<WrapperType extends CstNode>(
    concreteTypes: readonly string[],
    wrapperClass: new (syntaxNode: SyntaxNode) => WrapperType,
  ): WrapperType[] {
    const collected: WrapperType[] = [];
    for (const child of this.syntaxNode.namedChildren) {
      if (concreteTypes.includes(child.type)) {
        collected.push(new wrapperClass(child));
      }
    }
    return collected;
  }
}

${classBlocks.join('\n\n')}

export type CstNamedNode =
${unionMembers};

export const cstNodeClassByType: ReadonlyMap<string, new (syntaxNode: SyntaxNode) => CstNamedNode> = new Map<
  string,
  new (syntaxNode: SyntaxNode) => CstNamedNode
>([
${mapEntries}
]);

export const wrapCstNode = (syntaxNode: SyntaxNode): CstNamedNode | undefined => {
  const wrapperClass = cstNodeClassByType.get(syntaxNode.type);
  if (wrapperClass === undefined) {
    return undefined;
  }
  return new wrapperClass(syntaxNode);
};
`;

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, output);

  // Pipe through the repo's pinned biome so the committed artifact is
  // format-stable regardless of template drift; biome is deterministic, so
  // the double-run determinism check still holds.
  const biomeBin = join(REPO_ROOT, 'node_modules', '.bin', 'biome');
  if (!existsSync(biomeBin)) {
    fail(`biome binary not found at ${biomeBin} — run pnpm install first`);
  }
  execFileSync(biomeBin, ['format', '--write', OUTPUT_PATH], { cwd: REPO_ROOT });

  console.log(
    `[generate-cst-nodes] wrote ${OUTPUT_PATH}: ${expectedClassCount} classes (${namedTypeNames.length} named nodes, ${finals.size} twins)`,
  );
};

try {
  generate();
} catch (error) {
  if (error instanceof CodegenError) {
    console.error(`[generate-cst-nodes] FAIL: ${error.message}`);
  } else {
    console.error('[generate-cst-nodes] FAIL:', error);
  }
  process.exit(1);
}
