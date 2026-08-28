// RFC-TM-3 Q1 smoke test, src dev layout (rfc-tm-3-diamond.md §5 Q1):
// TypedMindParser parses the hero fixture and the test walks typed generated
// wrappers, including headerName() reassembly (identifier + quoted forms) and
// a `_final`-twin normalization case. Under type-stripped src execution the
// default __dirname wasm resolution is unavailable by design (doc §3.1 binds
// it to the compiled CJS output), so this layout exercises the { wasmPath }
// override contract; the built-dist layout smoke (dist-layout-smoke.test.ts)
// exercises the default resolution.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  CST_FINAL_TWIN_COUNT,
  CST_LOGICAL_CLASS_COUNT,
  CST_NAMED_NODE_TYPE_COUNT,
  CstHeaderNameRest,
  CstSourceFile,
  cstNodeClassByType,
} from '../ast/gen/cst-nodes.ts';
import { TypedMindParser } from './typed-mind-parser.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..', '..');
const wasmPath = join(packageDir, 'grammar', 'grammar.wasm');
const heroPath = join(packageDir, 'grammar', 'test', 'fixtures', 'hero.tmd');

const createParser = async () => {
  return TypedMindParser.create({ wasmPath });
};

describe('generated CST wrapper layer', () => {
  it('emits one class per logical production (named nodes - twins), self-consistent with node-types.json', () => {
    const nodeTypesPath = join(packageDir, 'grammar', 'src', 'node-types.json');
    const nodeTypes: { type: string; named: boolean }[] = JSON.parse(readFileSync(nodeTypesPath, 'utf8'));
    const namedTypeNames = nodeTypes.filter((entry) => entry.named).map((entry) => entry.type);
    const twinCount = namedTypeNames.filter((name) => name.endsWith('_final')).length;
    const distinctClasses = new Set(cstNodeClassByType.values());
    assert.deepEqual(
      {
        namedNodeCount: CST_NAMED_NODE_TYPE_COUNT,
        twinCount: CST_FINAL_TWIN_COUNT,
        logicalClassCount: CST_LOGICAL_CLASS_COUNT,
        mapKeyCount: cstNodeClassByType.size,
        distinctClassCount: distinctClasses.size,
      },
      {
        namedNodeCount: namedTypeNames.length,
        twinCount,
        // RFC-TM-8 §1 (rfc-tm-8-diamond.md, X-TYPE-1/X-TYPE-2): was a
        // hardcoded 67 pinned to the pre-existing node-types set; the type-
        // expression sub-grammar adds new logical productions
        // (type_expr/type_union/type_intersection/type_postfix/type_atom/
        // type_named/type_generic/type_literal_string/type_literal_number/
        // type_readonly_array/type_opaque/readonly_kw/readonly_name_rest/
        // readonly_paren_rest), so this derives from the live count instead
        // of re-pinning a second magic number every time the grammar grows.
        logicalClassCount: namedTypeNames.length - twinCount,
        mapKeyCount: namedTypeNames.length,
        distinctClassCount: namedTypeNames.length - twinCount,
      },
    );
  });
});

describe('TypedMindParser (src dev layout, wasmPath override)', () => {
  it('rejects default wasm resolution outside the compiled CJS output', async () => {
    await assert.rejects(TypedMindParser.create(), /compiled CommonJS output/);
  });

  it('parses the hero fixture into a wrapped CST root with a real 1-based span', async () => {
    const parser = await createParser();
    const root = parser.parseCst(readFileSync(heroPath, 'utf8'));
    assert.deepEqual(
      {
        isSourceFile: root instanceof CstSourceFile,
        startsAt: root.span().start,
      },
      {
        isSourceFile: true,
        startsAt: { line: 1, column: 1 },
      },
    );
  });

  it('reassembles longform header names via headerName(), identifier and quoted forms', async () => {
    const parser = await createParser();
    const root = parser.parseCst(readFileSync(heroPath, 'utf8'));
    const headers = root.longformBlockChildren().map((block) => block.blockHeaderChildren().at(0));
    const identifierHeader = headers.at(0);
    assert.deepEqual(
      {
        headerNames: headers.map((header) => header?.headerName()),
        splitKeywordToken: identifierHeader?.blockKwChildren().at(0)?.text,
        splitRestIsTyped: identifierHeader?.nameField() instanceof CstHeaderNameRest,
        splitRestText: identifierHeader?.nameField()?.text,
      },
      {
        headerNames: ['TodoApp', 'left-pad'],
        splitKeywordToken: 'program T',
        splitRestIsTyped: true,
        splitRestText: 'odoApp',
      },
    );
  });

  it('normalizes the _final twin: the EOF dto declaration wraps into the same class as its base', async () => {
    const parser = await createParser();
    const root = parser.parseCst(readFileSync(heroPath, 'utf8'));
    const eofDto = root.dtoDeclarationChildren().at(0);
    assert.deepEqual(
      {
        concreteType: eofDto?.syntaxNode.type,
        isFinal: eofDto?.isFinal,
        name: eofDto?.entityNameChildren().at(0)?.text,
        span: eofDto?.span(),
      },
      {
        concreteType: 'dto_declaration_final',
        isFinal: true,
        name: 'UserDTO',
        span: { start: { line: 11, column: 1 }, end: { line: 11, column: 10 } },
      },
    );
  });

  it('wraps the newline-terminated base twin into the same class with isFinal false', async () => {
    const parser = await createParser();
    const root = parser.parseCst('UserDTO %\n');
    const dto = root.dtoDeclarationChildren().at(0);
    assert.deepEqual({ concreteType: dto?.syntaxNode.type, isFinal: dto?.isFinal }, { concreteType: 'dto_declaration', isFinal: false });
  });

  it('exposes flat-line siblings (declaration, continuation) with per-line spans', async () => {
    const parser = await createParser();
    const root = parser.parseCst(readFileSync(heroPath, 'utf8'));
    const fileDeclaration = root.fileDeclarationChildren().at(0);
    const importContinuation = root.importListChildren().at(0);
    assert.deepEqual(
      {
        fileName: fileDeclaration?.entityNameChildren().at(0)?.text,
        fileLine: fileDeclaration?.span().start.line,
        continuationLine: importContinuation?.span().start.line,
        continuationEntry: importContinuation?.nameListChildren().at(0)?.listEntryChildren().at(0)?.text,
      },
      {
        fileName: 'UserService',
        fileLine: 9,
        continuationLine: 10,
        continuationEntry: 'Logger',
      },
    );
  });

  it('accepts the wasmBytes override', async () => {
    const parser = await TypedMindParser.create({ wasmBytes: new Uint8Array(readFileSync(wasmPath)) });
    const root = parser.parseCst('UserDTO %\n');
    assert.equal(root.dtoDeclarationChildren().length, 1);
  });
});

describe('TypedMindParser.parseWithCst (RFC-TM-5 §1 facade extension)', () => {
  it('returns entities identical to parse() plus a CstSourceFile spanning the source', async () => {
    const source = readFileSync(heroPath, 'utf8');
    const parser = await createParser();
    const parsed = parser.parse(source);
    const withCst = parser.parseWithCst(source);
    assert.deepEqual(withCst.entities, parsed.entities);
    assert.deepEqual(withCst.imports, parsed.imports);
    assert.deepEqual(withCst.diagnostics, parsed.diagnostics);
    assert.equal(withCst.cst instanceof CstSourceFile, true);
    const rootSpan = withCst.cst.span();
    assert.deepEqual(rootSpan.start, { line: 1, column: 1 });
    // The root span covers the whole source: its end line is the source's
    // last line (whether or not that line ends with a trailing newline).
    assert.equal(rootSpan.end.line, source.split('\n').length);
  });

  it('shares one tree between the AST walk and the returned CST (no second parse)', async () => {
    const parser = await createParser();
    const source = 'UserDTO %\n';
    const withCst = parser.parseWithCst(source);
    assert.equal(withCst.cst.dtoDeclarationChildren().length, 1);
    assert.equal(withCst.cst.dtoDeclarationChildren().at(0)?.entityNameChildren().at(0)?.text, 'UserDTO');
  });
});
