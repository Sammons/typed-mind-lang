// RFC-TM-5 §1 leaf d check binding — "a unit test drives both tables with all
// 11 kinds and asserts no kind reaches the default: arm." getCompletionItemKind
// and getSemanticTokenType both throw via assertNever on an unhandled kind
// (module-internal), so "no kind reaches the default arm" is asserted by every
// one of the 11 kinds returning a defined, in-legend result without throwing.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EntityKind } from '@sammons/typed-mind';
import { CompletionItemKind } from 'vscode-languageserver/node';
import { getCompletionItemKind, getSemanticTokenType, SEMANTIC_TOKEN_LEGEND } from './entity-kind-maps.ts';

const ALL_KINDS: readonly EntityKind[] = [
  'Program',
  'File',
  'Function',
  'Class',
  'ClassFile',
  'Constants',
  'DTO',
  'Asset',
  'UIComponent',
  'RunParameter',
  'Dependency',
];

describe('entity-kind-maps (RFC-TM-5 §1 leaf d)', () => {
  it('getCompletionItemKind resolves all 11 kinds without falling through to a default', () => {
    for (const kind of ALL_KINDS) {
      const result = getCompletionItemKind(kind);
      assert.equal(typeof result, 'number');
      assert.notEqual(result, undefined);
    }
    // ClassFile specifically: the kind legacy's table dropped to `default`
    // (falling to CompletionItemKind.Variable). It now resolves to Class.
    assert.equal(getCompletionItemKind('ClassFile'), CompletionItemKind.Class);
  });

  it('getSemanticTokenType resolves all 11 kinds to a valid legend index without falling through to a default', () => {
    for (const kind of ALL_KINDS) {
      const result = getSemanticTokenType(kind);
      assert.equal(result >= 0, true);
      assert.equal(result < SEMANTIC_TOKEN_LEGEND.length, true);
    }
    // ClassFile specifically: legacy's table dropped it to the `default` arm
    // (SemanticTokenTypes.variable). It now resolves alongside Class.
    assert.equal(getSemanticTokenType('ClassFile'), getSemanticTokenType('Class'));
  });
});
