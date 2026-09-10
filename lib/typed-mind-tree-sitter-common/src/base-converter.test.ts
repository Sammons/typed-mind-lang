import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DtoNode, FunctionNode, ProgramNode } from '@sammons/typed-mind';
import { collapseDescription, emitTmd, sortIntoLegacySectionOrder, SYNTHETIC_SPAN } from './base-converter.ts';

const makeFunction = (name: string): FunctionNode =>
  new FunctionNode({
    name,
    span: SYNTHETIC_SPAN,
    raw: `${name} () => void`,
    sourceForm: 'shortform',
    signature: '() => void',
    calls: [],
    pendingDependencies: [],
  });

describe('sortIntoLegacySectionOrder', () => {
  it('sorts entities by legacy section order', () => {
    const func = makeFunction('myFunc');
    const program = new ProgramNode({
      name: 'MyApp',
      span: SYNTHETIC_SPAN,
      raw: 'MyApp v1.0.0 -> main',
      sourceForm: 'shortform',
      version: '1.0.0',
      entry: 'main',
    });

    const sorted = sortIntoLegacySectionOrder([func, program]);
    assert.equal(sorted[0]?.kind, 'Program');
    assert.equal(sorted[1]?.kind, 'Function');
  });

  it('preserves order for entities of the same kind', () => {
    const a = makeFunction('alpha');
    const b = makeFunction('beta');

    const sorted = sortIntoLegacySectionOrder([a, b]);
    assert.equal(sorted[0]?.name, 'alpha');
    assert.equal(sorted[1]?.name, 'beta');
  });
});

describe('collapseDescription', () => {
  it('returns first paragraph trimmed and collapsed', () => {
    assert.equal(collapseDescription('Hello  world'), 'Hello world');
  });

  it('stops at double newline', () => {
    assert.equal(collapseDescription('First paragraph.\n\nSecond paragraph.'), 'First paragraph.');
  });

  it('handles empty string', () => {
    assert.equal(collapseDescription(''), '');
  });

  it('collapses internal whitespace', () => {
    assert.equal(collapseDescription('  a   b\n c  '), 'a b c');
  });
});

describe('emitTmd', () => {
  it('emits a function entity as shortform TMD', async () => {
    const func = makeFunction('doStuff');
    const tmd = emitTmd([func]);
    assert.ok(tmd.includes('doStuff'));
  });

  it('returns empty string for empty entity list', () => {
    const tmd = emitTmd([]);
    assert.equal(tmd, '');
  });
});
