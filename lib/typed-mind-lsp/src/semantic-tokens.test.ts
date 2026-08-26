// RFC-TM-5 §1 leaf c check binding (semantic-token half) — semantic tokens
// derive from the occurrence index + the enum table, not the deleted regex
// line-scan (legacy server.ts:598-618). ClassFile specifically must produce a
// token (leaf d): legacy's regex scan + enum table both dropped it.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TypedMind } from '@sammons/typed-mind';
import { buildDocumentState } from './document-state.ts';
import { getSemanticTokenType } from './entity-kind-maps.ts';
import { provideSemanticTokensForDocument } from './semantic-tokens.ts';

const SOURCE = `UserController #: src/controllers/user.ts
  -> [handleRequest]

Logger @ src/logger.ts:
  -> [Logger]
`;

describe('semantic tokens (RFC-TM-5 §1 leaf c/d)', () => {
  it('emits a token for a ClassFile declaration, at the ClassFile token type', async () => {
    const typedMind = await TypedMind.create();
    const parsed = typedMind.parseWithCst(SOURCE);
    const state = buildDocumentState(parsed);
    const tokens = provideSemanticTokensForDocument(state);
    assert.equal(tokens.data.length > 0, true);

    // The builder's delta-encoded data groups in 5-tuples: deltaLine,
    // deltaStartChar, length, tokenType, tokenModifiers. Decode absolute
    // lines to find the UserController declaration's token.
    let line = 0;
    const decoded: { line: number; length: number; tokenType: number }[] = [];
    for (let i = 0; i < tokens.data.length; i += 5) {
      line += tokens.data[i] ?? 0;
      decoded.push({ line, length: tokens.data[i + 2] ?? 0, tokenType: tokens.data[i + 3] ?? 0 });
    }
    const classFileTokenType = getSemanticTokenType('ClassFile');
    const classFileDeclarationToken = decoded.find((token) => token.line === 0 && token.length === 'UserController'.length);
    assert.notEqual(classFileDeclarationToken, undefined);
    assert.equal(classFileDeclarationToken?.tokenType, classFileTokenType);
  });

  it('emits distinct tokens per occurrence, resolving each name to its entity kind (no unresolved names tokenized)', async () => {
    const typedMind = await TypedMind.create();
    const parsed = typedMind.parseWithCst(SOURCE);
    const state = buildDocumentState(parsed);
    const tokens = provideSemanticTokensForDocument(state);
    // 5 name occurrences total: UserController (decl), handleRequest (ref,
    // unresolved -> skipped), Logger (decl), Logger (ref). handleRequest has
    // no entity named that, so it must NOT produce a token.
    assert.equal(tokens.data.length / 5, 3);
  });
});
