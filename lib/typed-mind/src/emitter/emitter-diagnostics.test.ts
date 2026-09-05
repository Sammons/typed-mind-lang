// RFC-TM-13 C-prime replaces historical quote-swap warning assertions
// with preservation checks over the same complete quoted-property table.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { AssetNode } from '../ast/asset-node.ts';
import { ClassFileNode } from '../ast/class-file-node.ts';
import { ClassNode } from '../ast/class-node.ts';
import { ConstantsNode } from '../ast/constants-node.ts';
import { DependencyNode } from '../ast/dependency-node.ts';
import { DtoNode } from '../ast/dto-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import { FileNode } from '../ast/file-node.ts';
import { FunctionNode } from '../ast/function-node.ts';
import { ProgramNode } from '../ast/program-node.ts';
import { RunParameterNode } from '../ast/run-parameter-node.ts';
import { TypeDefNode } from '../ast/type-def-node.ts';
import { UiComponentNode } from '../ast/ui-component-node.ts';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { SyntaxEmitter } from './syntax-emitter.ts';

const SPAN = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };
const QUOTED = 'contains a "quote" and \\ slash here';
const wasmPath = join(dirname(fileURLToPath(import.meta.url)), '../../grammar/grammar.wasm');
interface QuotedPropertyRow {
  readonly description: string;
  readonly forms: readonly ('shortform' | 'longform')[];
  readonly buildEntity: (value: string) => EntityNode;
  readonly propertyName: string;
}

const ROWS: readonly QuotedPropertyRow[] = [
  {
    description: 'Program.purpose',
    forms: ['shortform', 'longform'],
    propertyName: 'purpose',
    buildEntity: (value) => new ProgramNode({ name: 'App', span: SPAN, raw: '', sourceForm: 'shortform', entry: 'Main', purpose: value }),
  },
  {
    description: 'File.purpose',
    forms: ['shortform', 'longform'],
    propertyName: 'purpose',
    buildEntity: (value) =>
      new FileNode({
        name: 'Mod',
        span: SPAN,
        raw: '',
        sourceForm: 'shortform',
        path: 'mod.ts',
        imports: [],
        exports: [],
        reExports: [],
        purpose: value,
      }),
  },
  {
    description: 'Function.description',
    forms: ['shortform', 'longform'],
    propertyName: 'description',
    buildEntity: (value) =>
      new FunctionNode({
        name: 'fn',
        span: SPAN,
        raw: '',
        sourceForm: 'shortform',
        signature: '() => void',
        calls: [],
        pendingDependencies: [],
        description: value,
      }),
  },
  {
    description: 'Class.purpose',
    forms: ['shortform', 'longform'],
    propertyName: 'purpose',
    buildEntity: (value) =>
      new ClassNode({ name: 'Widget', span: SPAN, raw: '', sourceForm: 'shortform', implements: [], methods: [], purpose: value }),
  },
  {
    description: 'ClassFile.purpose',
    forms: ['shortform', 'longform'],
    propertyName: 'purpose',
    buildEntity: (value) =>
      new ClassFileNode({
        name: 'Widget',
        span: SPAN,
        raw: '',
        sourceForm: 'shortform',
        path: 'widget.ts',
        implements: [],
        methods: [],
        imports: [],
        exports: [],
        purpose: value,
      }),
  },
  {
    description: 'Constants.purpose',
    forms: ['shortform', 'longform'],
    propertyName: 'purpose',
    buildEntity: (value) =>
      new ConstantsNode({ name: 'Config', span: SPAN, raw: '', sourceForm: 'shortform', path: 'config.ts', purpose: value }),
  },
  {
    description: 'DTO.purpose',
    forms: ['shortform', 'longform'],
    propertyName: 'purpose',
    buildEntity: (value) => new DtoNode({ name: 'Foo', span: SPAN, raw: '', sourceForm: 'shortform', purpose: value, fields: [] }),
  },
  {
    description: 'Asset.description',
    forms: ['shortform', 'longform'],
    propertyName: 'description',
    buildEntity: (value) => new AssetNode({ name: 'Bundle', span: SPAN, raw: '', sourceForm: 'shortform', description: value }),
  },
  {
    description: 'UIComponent.purpose',
    forms: ['shortform', 'longform'],
    propertyName: 'purpose',
    buildEntity: (value) =>
      new UiComponentNode({ name: 'View', span: SPAN, raw: '', sourceForm: 'shortform', purpose: value, root: false }),
  },
  {
    description: 'RunParameter.description',
    forms: ['shortform', 'longform'],
    propertyName: 'description',
    buildEntity: (value) =>
      new RunParameterNode({ name: 'API_KEY', span: SPAN, raw: '', sourceForm: 'shortform', paramType: 'env', description: value }),
  },
  {
    description: 'RunParameter.defaultValue',
    forms: ['shortform', 'longform'],
    propertyName: 'defaultValue',
    buildEntity: (value) =>
      new RunParameterNode({
        name: 'API_KEY',
        span: SPAN,
        raw: '',
        sourceForm: 'shortform',
        paramType: 'env',
        description: 'a key',
        defaultValue: value,
      }),
  },
  {
    description: 'Dependency.purpose',
    forms: ['shortform', 'longform'],
    propertyName: 'purpose',
    buildEntity: (value) => new DependencyNode({ name: 'left-pad', span: SPAN, raw: '', sourceForm: 'shortform', purpose: value }),
  },
  {
    description: 'entity.comment (longform only — shortform never quotes it)',
    forms: ['longform'],
    propertyName: 'comment',
    buildEntity: (value) => new ProgramNode({ name: 'App', span: SPAN, raw: '', sourceForm: 'longform', entry: 'Main', comment: value }),
  },
  {
    description: 'TypeDef.purpose (longform only — typeDefToShortform never references it)',
    forms: ['longform'],
    propertyName: 'purpose',
    buildEntity: (value) =>
      new TypeDefNode({
        name: 'Status',
        span: SPAN,
        raw: '',
        sourceForm: 'longform',
        variant: 'enum',
        members: ['Active'],
        purpose: value,
      }),
  },
];

describe('quoted properties preserve values without mutation diagnostics', () => {
  for (const row of ROWS) {
    for (const form of row.forms) {
      it(`${row.description}, ${form}: escaped text survives parsing`, async () => {
        const parser = await TypedMindParser.create({ wasmPath });
        const entity = row.buildEntity(QUOTED);
        const emitter = new SyntaxEmitter();
        const result = emitter.emitWithDiagnostics(
          { entities: [entity], imports: [], suppressions: [], diagnostics: [] },
          { forceForm: form },
        );
        assert.deepEqual(result.diagnostics, []);
        const reparsed = parser.parse(result.text);
        assert.deepEqual(reparsed.diagnostics, [], result.text);
        const recovered = reparsed.entities[0];
        assert.ok(recovered);
        assert.equal(Reflect.get(recovered, row.propertyName), QUOTED, result.text);
      });
    }
  }
});
