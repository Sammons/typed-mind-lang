// typedmind-diagnostic-legitimacy callgraph increment (operator-approved,
// 2026-08-30) — the extractor now emits INTRA-FILE call edges (direct
// function calls, `new` expressions for classes) so a same-file-only-used
// exported symbol stops flagging `checker/orphaned-entity`, while a
// genuinely dead or test-only export keeps flagging. This is an extractor
// fix folding names into `FunctionNode.calls` — the EXISTING language
// surface `check-orphans.ts`'s `collectReferencedNames` already reads — not
// a checker rule change and not new grammar/AST surface. See
// `knowledge/projects/typedmind/ladder-diagnostic-disposition-r3-2026-08-29.md`
// row 5 (the 125-instance same-file-closure family) for the diagnostic
// legitimacy context this increment closes part of.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SyntaxEmitter, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');
const fixturePath = (name: string, ...segments: string[]): string => join(reprosDir, name, ...segments);

const convert = (fixtureName: string, entrySegments: readonly string[]) => {
  const analyzer = new TypeScriptAnalyzer(fixturePath(fixtureName));
  const analysis = analyzer.analyzeFromEntrypoint(fixturePath(fixtureName, ...entrySegments));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

const orphanFindingsFor = async (result: ReturnType<typeof convert>, entityName: string) => {
  assert.equal(result.success, true);
  const emitter = new SyntaxEmitter();
  const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
  const tm = await TypedMind.create();
  const checkResult = tm.check(longform);
  return checkResult.diagnostics.filter((d) => d.code === 'checker/orphaned-entity' && d.message.includes(entityName));
};

describe('callgraph increment: same-file call edges clear genuinely-used exports', () => {
  it('fixture 1 (hashSecret shape) — a function called only by a same-file sibling function is a real entity', () => {
    const result = convert('47-intrafile-call-edges', ['src', 'index.ts']);
    assert.equal(result.success, true);
    const hashSecret = result.entities.find((e) => e.kind === 'Function' && e.name === 'hashSecret');
    const generateSecret = result.entities.find((e) => e.kind === 'Function' && e.name === 'generateSecret');
    assert.notEqual(hashSecret, undefined, 'hashSecret must be extracted as a real entity');
    assert.notEqual(generateSecret, undefined, 'generateSecret must be extracted as a real entity');
  });

  it('fixture 1 — createSecret.calls names both same-file siblings by their resolved entity names', () => {
    const result = convert('47-intrafile-call-edges', ['src', 'index.ts']);
    assert.equal(result.success, true);
    const createSecret = result.entities.find((e) => e.kind === 'Function' && e.name === 'createSecret') as
      | { calls: readonly string[] }
      | undefined;
    assert.notEqual(createSecret, undefined, 'createSecret must be extracted as a real entity');
    assert.ok(
      createSecret?.calls.includes('generateSecret'),
      `expected createSecret.calls to include 'generateSecret', got: ${JSON.stringify(createSecret?.calls)}`,
    );
    assert.ok(
      createSecret?.calls.includes('hashSecret'),
      `expected createSecret.calls to include 'hashSecret', got: ${JSON.stringify(createSecret?.calls)}`,
    );
  });

  it('fixture 1 — checker verdict: hashSecret/generateSecret stop flagging checker/orphaned-entity', async () => {
    const result = convert('47-intrafile-call-edges', ['src', 'index.ts']);
    const hashFindings = await orphanFindingsFor(result, 'hashSecret');
    const generateFindings = await orphanFindingsFor(result, 'generateSecret');
    assert.deepEqual(hashFindings, [], `hashSecret must not orphan: ${JSON.stringify(hashFindings)}`);
    assert.deepEqual(generateFindings, [], `generateSecret must not orphan: ${JSON.stringify(generateFindings)}`);
  });

  // RFC-TM-14 §S2 — the construct edge is spelled `Owner.constructor`.
  it('fixture 1 (Cst*-wrapper shape) — a class new-d only inside a same-file function names Owner.constructor in that function.calls', () => {
    const result = convert('47-intrafile-call-edges', ['src', 'index.ts']);
    assert.equal(result.success, true);
    const secretWalker = result.entities.find((e) => (e.kind === 'Class' || e.kind === 'ClassFile') && e.name === 'SecretWalker');
    assert.notEqual(secretWalker, undefined, 'SecretWalker must be extracted as a real entity');
    const createSecret = result.entities.find((e) => e.kind === 'Function' && e.name === 'createSecret') as
      | { calls: readonly string[] }
      | undefined;
    assert.ok(
      createSecret?.calls.includes('SecretWalker.constructor'),
      `expected createSecret.calls to include 'SecretWalker.constructor', got: ${JSON.stringify(createSecret?.calls)}`,
    );
  });

  it('fixture 1 — checker verdict: SecretWalker (new-d only same-file) stops flagging checker/orphaned-entity', async () => {
    const result = convert('47-intrafile-call-edges', ['src', 'index.ts']);
    const findings = await orphanFindingsFor(result, 'SecretWalker');
    assert.deepEqual(findings, [], `SecretWalker must not orphan: ${JSON.stringify(findings)}`);
  });
});

describe('callgraph increment: genuinely dead or test-only exports still flag (no over-credit)', () => {
  it('fixture 2 — a genuinely dead export (zero callers anywhere) is still checker/orphaned-entity', async () => {
    const result = convert('48-intrafile-call-edges-negative', ['src', 'index.ts']);
    const findings = await orphanFindingsFor(result, 'deadHelper');
    assert.equal(findings.length, 1, `deadHelper must still orphan exactly once: ${JSON.stringify(findings)}`);
  });

  it('fixture 2 — a test-only export (called only from a file the entrypoint never traverses) is still checker/orphaned-entity', async () => {
    const result = convert('48-intrafile-call-edges-negative', ['src', 'index.ts']);
    const findings = await orphanFindingsFor(result, 'testOnlyHelper');
    assert.equal(findings.length, 1, `testOnlyHelper must still orphan exactly once: ${JSON.stringify(findings)}`);
  });

  it('fixture 2 — the real cross-file-used export (usedHelper) has zero orphan findings, as a sanity control', async () => {
    const result = convert('48-intrafile-call-edges-negative', ['src', 'index.ts']);
    const findings = await orphanFindingsFor(result, 'usedHelper');
    assert.deepEqual(findings, [], `usedHelper must not orphan: ${JSON.stringify(findings)}`);
  });
});

describe('RFC-TM-14 §S2: a same-file new-target that converts as a ClassFile is folded as Owner.constructor', () => {
  // Real-corpus regression found during ladder verification against
  // webhookstorage: ingest's `s3-upload.ts` has `PayloadTooLargeError`
  // (an exported Error subclass) as its module's ONLY class, so
  // `convertToClassFile`'s primary-class fallback fuses it into the
  // module's own ClassFile entity. `calls.to`'s legal targets
  // (valid-references.ts) are `['Function', 'Class']` — never a bare
  // `ClassFile` — so the callgraph increment DROPPED the edge and the class
  // stayed an orphan. RFC-TM-14 U2 made `Owner.constructor` an implicit
  // member of every Class and ClassFile (the resolver returns the owner, so
  // legality and method-call checks pass), and U1 emits the edge in that
  // spelling: the ClassFile is credited and `checker/reference-to-illegal`
  // still never fires.
  it('uploadPayload.calls names the fused ClassFile as PayloadTooLargeError.constructor', () => {
    const result = convert('49-intrafile-new-classfile-target', ['src', 'index.ts']);
    assert.equal(result.success, true);
    const uploadPayload = result.entities.find((e) => e.kind === 'Function' && e.name === 'uploadPayload') as
      | { calls: readonly string[] }
      | undefined;
    assert.notEqual(uploadPayload, undefined, 'uploadPayload must be extracted as a real entity');
    assert.deepEqual(uploadPayload?.calls, ['PayloadTooLargeError.constructor']);
  });

  it('checker verdict: zero reference-to-illegal findings and the ClassFile is not orphaned', async () => {
    const result = convert('49-intrafile-new-classfile-target', ['src', 'index.ts']);
    assert.equal(result.success, true);
    const emitter = new SyntaxEmitter();
    const longform = emitter.emitLongform({ entities: result.entities as never, imports: [], suppressions: [], diagnostics: [] });
    const tm = await TypedMind.create();
    const checkResult = tm.check(longform);
    const illegalFindings = checkResult.diagnostics.filter((d) => d.code === 'checker/reference-to-illegal');
    assert.deepEqual(illegalFindings, [], `must have zero reference-to-illegal findings: ${JSON.stringify(illegalFindings)}`);
    const findings = await orphanFindingsFor(result, 'PayloadTooLargeError');
    assert.deepEqual(findings, [], `PayloadTooLargeError must not orphan: ${JSON.stringify(findings)}`);
  });
});
