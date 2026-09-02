// Issue #130 (git.tail4ea214.ts.net/sammons/typed-mind-lang), disposition (b)
// — unit coverage for quoteSwapDiagnosticsFor/quoteSwapDiagnosticsForSuppressions:
// mutated content produces exactly one `emitter/quote-swap` warning naming
// the entity and property; unmutated content produces none.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AssetNode } from '../ast/asset-node.ts';
import { ClassFileNode } from '../ast/class-file-node.ts';
import { ClassNode } from '../ast/class-node.ts';
import { ConstantsNode } from '../ast/constants-node.ts';
import { DependencyNode } from '../ast/dependency-node.ts';
import { DtoFieldNode } from '../ast/dto-field-node.ts';
import { DtoNode } from '../ast/dto-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import { FileNode } from '../ast/file-node.ts';
import { FunctionNode } from '../ast/function-node.ts';
import { ProgramNode } from '../ast/program-node.ts';
import { RunParameterNode } from '../ast/run-parameter-node.ts';
import { SuppressionNode } from '../ast/suppression-node.ts';
import { TypeDefNode } from '../ast/type-def-node.ts';
import type { TypeExprNode } from '../ast/type-expr-node.ts';
import { UiComponentNode } from '../ast/ui-component-node.ts';
import { quoteSwapDiagnosticsForSuppressions } from './emit-suppression.ts';
import { QUOTE_SWAP_CODE, quoteSwapDiagnosticsFor } from './emitter-diagnostics.ts';

const SPAN = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };
const QUOTED = 'contains a "quote" here';
const UNQUOTED = 'contains no such mark here';

describe('quoteSwapDiagnosticsFor', () => {
  it('reports a warning when a DTO purpose contains a double quote (shortform)', () => {
    const dto = new DtoNode({
      name: 'Foo',
      span: SPAN,
      raw: '',
      sourceForm: 'shortform',
      purpose: 'a "quoted" phrase',
      fields: [],
    });
    const diagnostics = quoteSwapDiagnosticsFor(dto, 'shortform');
    assert.deepEqual(diagnostics, [
      {
        code: QUOTE_SWAP_CODE,
        severity: 'warning',
        span: SPAN,
        message:
          "'purpose' on 'Foo' contained a double quote, which was rewritten to a single quote — the grammar has no escaped-quote form, so this emission cannot preserve the original character",
      },
    ]);
  });

  it('reports no diagnostic when the same field carries no double quote', () => {
    const dto = new DtoNode({
      name: 'Foo',
      span: SPAN,
      raw: '',
      sourceForm: 'shortform',
      purpose: 'an unquoted phrase',
      fields: [],
    });
    assert.deepEqual(quoteSwapDiagnosticsFor(dto, 'shortform'), []);
  });

  it('reports one diagnostic per swapped DTO field description, keyed by field name', () => {
    const dto = new DtoNode({
      name: 'Widget',
      span: SPAN,
      raw: '',
      sourceForm: 'shortform',
      fields: [
        new DtoFieldNode({
          name: 'label',
          type: 'string',
          typeExpr: { kind: 'named', name: 'string', span: SPAN },
          optionalityMarker: 'none',
          description: 'the "label" text',
          span: SPAN,
        }),
        new DtoFieldNode({
          name: 'count',
          type: 'number',
          typeExpr: { kind: 'named', name: 'number', span: SPAN },
          optionalityMarker: 'none',
          description: 'a plain count',
          span: SPAN,
        }),
      ],
    });
    const diagnostics = quoteSwapDiagnosticsFor(dto, 'shortform');
    assert.deepEqual(diagnostics, [
      {
        code: QUOTE_SWAP_CODE,
        severity: 'warning',
        span: SPAN,
        message:
          "'field 'label'.description' on 'Widget' contained a double quote, which was rewritten to a single quote — the grammar has no escaped-quote form, so this emission cannot preserve the original character",
      },
    ]);
  });

  it('reports a comment-swap diagnostic for longform but not shortform (shortform comments are never quoted)', () => {
    const program = new ProgramNode({
      name: 'App',
      span: SPAN,
      raw: '',
      sourceForm: 'longform',
      comment: 'a "commented" line',
      entry: 'Main',
    });
    assert.deepEqual(quoteSwapDiagnosticsFor(program, 'shortform'), []);
    const longformDiagnostics = quoteSwapDiagnosticsFor(program, 'longform');
    assert.deepEqual(longformDiagnostics, [
      {
        code: QUOTE_SWAP_CODE,
        severity: 'warning',
        span: SPAN,
        message:
          "'comment' on 'App' contained a double quote, which was rewritten to a single quote — the grammar has no escaped-quote form, so this emission cannot preserve the original character",
      },
    ]);
  });
});

describe('quoteSwapDiagnosticsForSuppressions', () => {
  it('reports a warning when a suppression reason contains a double quote', () => {
    const suppression = new SuppressionNode({
      target: 'Foo',
      code: 'checker/orphaned-entity',
      reason: 'flagged as "intentional" for now',
      span: SPAN,
      raw: '',
    });
    assert.deepEqual(quoteSwapDiagnosticsForSuppressions([suppression]), [
      {
        code: QUOTE_SWAP_CODE,
        severity: 'warning',
        span: SPAN,
        message:
          "'reason' on 'Foo' contained a double quote, which was rewritten to a single quote — the grammar has no escaped-quote form, so this emission cannot preserve the original character",
      },
    ]);
  });

  it('reports no diagnostic when the reason carries no double quote', () => {
    const suppression = new SuppressionNode({
      target: 'Foo',
      code: 'checker/orphaned-entity',
      reason: 'intentional for now',
      span: SPAN,
      raw: '',
    });
    assert.deepEqual(quoteSwapDiagnosticsForSuppressions([suppression]), []);
  });
});

// PR #141 review, blockers 1/2 — table-driven coverage over every entity
// kind's every property `quoteSwapDiagnosticsFor` checks, so a future
// producing site (a new quoted field, or a new call through `printTypeExpr`)
// cannot be added to emit-shortform.ts/emit-longform.ts without a
// corresponding row here going red first. One row per (kind, property,
// form) triple that quote-string-literal.ts's callers actually quote,
// built directly from the enumeration in emitter-diagnostics.ts's own
// header comment. `buildEntity` takes the QUOTED or UNQUOTED fixture value
// and returns the entity plus the expected property name on the diagnostic.
interface QuoteSwapTableRow {
  readonly description: string;
  readonly forms: readonly ('shortform' | 'longform')[];
  readonly buildEntity: (value: string) => EntityNode;
  readonly propertyName: string;
}

const ROWS: readonly QuoteSwapTableRow[] = [
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

describe('quoteSwapDiagnosticsFor: table-driven coverage over every quoted property (PR #141 review)', () => {
  for (const row of ROWS) {
    for (const form of row.forms) {
      it(`${row.description}, ${form}: a double quote produces exactly one diagnostic naming '${row.propertyName}'`, () => {
        const entity = row.buildEntity(QUOTED);
        const diagnostics = quoteSwapDiagnosticsFor(entity, form);
        assert.deepEqual(diagnostics, [
          {
            code: QUOTE_SWAP_CODE,
            severity: 'warning',
            span: SPAN,
            message: `'${row.propertyName}' on '${entity.name}' contained a double quote, which was rewritten to a single quote — the grammar has no escaped-quote form, so this emission cannot preserve the original character`,
          },
        ]);
      });

      it(`${row.description}, ${form}: no double quote produces zero diagnostics`, () => {
        const entity = row.buildEntity(UNQUOTED);
        assert.deepEqual(quoteSwapDiagnosticsFor(entity, form), []);
      });
    }
  }
});

// PR #141 review, blockers 1/2 — the two producing sites the review found
// missing: a TypeDef alias's string-literal member (reached via
// printTypeExpr, print-type-expr.ts:32) and a DTO field's structured
// typeExpr (same producing site, defensive coverage — see
// emitter-diagnostics.ts's own comment on why the DTO field case is not
// reachable through the CURRENT emitter but is checked anyway).
describe('quoteSwapDiagnosticsFor: TypeDef alias string-literal member (printTypeExpr producing site)', () => {
  const literalNode = (value: string): TypeExprNode => ({ kind: 'literal', literalKind: 'string', value, span: SPAN });

  it('a TypeDef alias whose aliasType is a bare string-literal reports aliasType, shortform', () => {
    const typeDef = new TypeDefNode({
      name: 'Status',
      span: SPAN,
      raw: '',
      sourceForm: 'shortform',
      variant: 'alias',
      aliasType: literalNode(QUOTED),
    });
    assert.deepEqual(quoteSwapDiagnosticsFor(typeDef, 'shortform'), [
      {
        code: QUOTE_SWAP_CODE,
        severity: 'warning',
        span: SPAN,
        message:
          "'aliasType' on 'Status' contained a double quote, which was rewritten to a single quote — the grammar has no escaped-quote form, so this emission cannot preserve the original character",
      },
    ]);
  });

  it('a TypeDef alias whose aliasType is a bare string-literal reports aliasType, longform (not form-gated the way comment/purpose are)', () => {
    const typeDef = new TypeDefNode({
      name: 'Status',
      span: SPAN,
      raw: '',
      sourceForm: 'longform',
      variant: 'alias',
      aliasType: literalNode(QUOTED),
    });
    assert.deepEqual(quoteSwapDiagnosticsFor(typeDef, 'longform'), [
      {
        code: QUOTE_SWAP_CODE,
        severity: 'warning',
        span: SPAN,
        message:
          "'aliasType' on 'Status' contained a double quote, which was rewritten to a single quote — the grammar has no escaped-quote form, so this emission cannot preserve the original character",
      },
    ]);
  });

  it('a TypeDef alias with no embedded quote reports zero diagnostics', () => {
    const typeDef = new TypeDefNode({
      name: 'Status',
      span: SPAN,
      raw: '',
      sourceForm: 'shortform',
      variant: 'alias',
      aliasType: literalNode(UNQUOTED),
    });
    assert.deepEqual(quoteSwapDiagnosticsFor(typeDef, 'shortform'), []);
  });

  it('a TypeDef alias whose aliasType is a non-literal named type reports zero diagnostics (nothing to swap)', () => {
    const typeDef = new TypeDefNode({
      name: 'UserId',
      span: SPAN,
      raw: '',
      sourceForm: 'shortform',
      variant: 'alias',
      aliasType: { kind: 'named', name: 'string', span: SPAN },
    });
    assert.deepEqual(quoteSwapDiagnosticsFor(typeDef, 'shortform'), []);
  });

  it('a TypeDef enum variant (no aliasType) reports zero diagnostics regardless of members text', () => {
    const typeDef = new TypeDefNode({
      name: 'Status',
      span: SPAN,
      raw: '',
      sourceForm: 'shortform',
      variant: 'enum',
      members: ['Active', 'Inactive'],
    });
    assert.deepEqual(quoteSwapDiagnosticsFor(typeDef, 'shortform'), []);
  });

  it('reports one diagnostic PER swapped literal member of a union alias (nested composition)', () => {
    const typeDef = new TypeDefNode({
      name: 'Status',
      span: SPAN,
      raw: '',
      sourceForm: 'shortform',
      variant: 'alias',
      aliasType: {
        kind: 'union',
        span: SPAN,
        members: [literalNode(QUOTED), literalNode('plain'), literalNode('also "quoted" too')],
      },
    });
    const diagnostics = quoteSwapDiagnosticsFor(typeDef, 'shortform');
    assert.equal(diagnostics.length, 2);
    for (const diagnostic of diagnostics) {
      assert.equal(diagnostic.code, QUOTE_SWAP_CODE);
      assert.match(diagnostic.message, /'aliasType'/);
    }
  });

  it('finds a swapped literal nested inside a generic argument (e.g. Pick<S3Client, "send">-shaped)', () => {
    const typeDef = new TypeDefNode({
      name: 'PickedShape',
      span: SPAN,
      raw: '',
      sourceForm: 'shortform',
      variant: 'alias',
      aliasType: {
        kind: 'generic',
        span: SPAN,
        base: { kind: 'named', name: 'Pick', span: SPAN },
        args: [{ kind: 'named', name: 'S3Client', span: SPAN }, literalNode(QUOTED)],
      },
    });
    assert.deepEqual(quoteSwapDiagnosticsFor(typeDef, 'shortform'), [
      {
        code: QUOTE_SWAP_CODE,
        severity: 'warning',
        span: SPAN,
        message:
          "'aliasType' on 'PickedShape' contained a double quote, which was rewritten to a single quote — the grammar has no escaped-quote form, so this emission cannot preserve the original character",
      },
    ]);
  });

  it('finds a swapped literal nested inside an array element', () => {
    const typeDef = new TypeDefNode({
      name: 'Statuses',
      span: SPAN,
      raw: '',
      sourceForm: 'shortform',
      variant: 'alias',
      aliasType: { kind: 'array', span: SPAN, readonly: false, spelling: 'suffix', element: literalNode(QUOTED) },
    });
    assert.equal(quoteSwapDiagnosticsFor(typeDef, 'shortform').length, 1);
  });
});

describe('quoteSwapDiagnosticsFor: DTO field typeExpr (defensive — not reachable through the current emitter)', () => {
  it('a DTO field whose typeExpr carries a swapped string-literal member reports it, keyed by field name', () => {
    const dto = new DtoNode({
      name: 'Widget',
      span: SPAN,
      raw: '',
      sourceForm: 'shortform',
      fields: [
        new DtoFieldNode({
          name: 'status',
          type: '"active" | "inactive"',
          typeExpr: {
            kind: 'union',
            span: SPAN,
            members: [
              { kind: 'literal', literalKind: 'string', value: QUOTED, span: SPAN },
              { kind: 'literal', literalKind: 'string', value: 'inactive', span: SPAN },
            ],
          },
          optionalityMarker: 'none',
          span: SPAN,
        }),
      ],
    });
    const diagnostics = quoteSwapDiagnosticsFor(dto, 'shortform');
    assert.deepEqual(diagnostics, [
      {
        code: QUOTE_SWAP_CODE,
        severity: 'warning',
        span: SPAN,
        message:
          "'field 'status'.type' on 'Widget' contained a double quote, which was rewritten to a single quote — the grammar has no escaped-quote form, so this emission cannot preserve the original character",
      },
    ]);
  });

  it('a DTO field whose typeExpr has no swapped literal reports zero diagnostics', () => {
    const dto = new DtoNode({
      name: 'Widget',
      span: SPAN,
      raw: '',
      sourceForm: 'shortform',
      fields: [
        new DtoFieldNode({
          name: 'status',
          type: 'string',
          typeExpr: { kind: 'named', name: 'string', span: SPAN },
          optionalityMarker: 'none',
          span: SPAN,
        }),
      ],
    });
    assert.deepEqual(quoteSwapDiagnosticsFor(dto, 'shortform'), []);
  });
});
