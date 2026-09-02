// Issue #130 (git.tail4ea214.ts.net/sammons/typed-mind-lang), disposition (b)
// — unit coverage for quoteSwapDiagnosticsFor/quoteSwapDiagnosticsForSuppressions:
// mutated content produces exactly one `emitter/quote-swap` warning naming
// the entity and property; unmutated content produces none.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DtoFieldNode } from '../ast/dto-field-node.ts';
import { DtoNode } from '../ast/dto-node.ts';
import { ProgramNode } from '../ast/program-node.ts';
import { SuppressionNode } from '../ast/suppression-node.ts';
import { quoteSwapDiagnosticsForSuppressions } from './emit-suppression.ts';
import { QUOTE_SWAP_CODE, quoteSwapDiagnosticsFor } from './emitter-diagnostics.ts';

const SPAN = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };

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
