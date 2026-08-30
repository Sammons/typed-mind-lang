// RFC-TM-4 §1, reference-legality leaf (rfc-tm-4-diamond.md) — the
// per-direction fixtures the Diamond Doc binds to this check: from-side,
// to-side, and unknown-ref-type, plus the replicated walk quirks (missing
// target short-circuit, Dependency-import routing, dotted-call base
// resolution, the legacy-Class-only extends/implements arm, and the
// double-report the port keeps with checkEntryPoint/checkFunctionDTOs).

import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ClassFileNode } from '../ast/class-file-node.ts';
import { FileNode } from '../ast/file-node.ts';
import { FunctionNode } from '../ast/function-node.ts';
import { computeLinks } from '../pipeline/link-index.ts';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { type AstValidationResult, AstValidator } from './ast-validator.ts';
import { CheckContext } from './check-context.ts';
import { checkSingleReference } from './check-reference-legality.ts';
import type { ReferenceKind } from './valid-references.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const wasmPath = join(testDir, '..', '..', 'grammar', 'grammar.wasm');
const parserPromise = TypedMindParser.create({ wasmPath });

const check = async (source: string) => {
  const parser = await parserPromise;
  const outcome = parser.parse(source);
  const links = computeLinks(outcome.entities);
  return new AstValidator().validate(outcome, links);
};

const messagesByCode = (result: AstValidationResult, code: string) => {
  return result.findings.filter((finding) => finding.code === code).map((finding) => finding.message);
};

const span = (line: number) => {
  return { start: { line, column: 1 }, end: { line, column: 30 } };
};

const emptyContextWith = (entities: Parameters<typeof computeLinks>[0]) => {
  return new CheckContext({ entities, links: computeLinks(entities), parseDiagnostics: [] });
};

describe('to-side legality (validator.ts:1278-1285), per reference kind', () => {
  it('reports illegal targets for exports, calls (dotted base), input/output, entry, and containedBy', async () => {
    const result = await check(
      [
        'App -> Main v1.0.0',
        'Second -> fn v1.0.0',
        'Main @ src/main.ts:',
        '  <- [fn, caller]',
        '  -> [PORT, fn, caller, Widget]',
        'PORT $env "the port"',
        'fn :: () => void',
        '  -> Main',
        'caller :: () => void',
        '  ~> [UserDTO.parse]',
        '  $< [PORT]',
        'UserDTO % "a dto"',
        '  - name: string "name"',
        'Widget &! "widget"',
        '  < [fn]',
        '',
      ].join('\n'),
    );
    assert.deepEqual(messagesByCode(result, 'checker/reference-to-illegal').sort(), [
      "Cannot use 'calls' to reference DTO 'UserDTO'",
      "Cannot use 'containedBy' to reference Function 'fn'",
      "Cannot use 'entry' to reference Function 'fn'",
      "Cannot use 'exports' to reference RunParameter 'PORT'",
      "Cannot use 'output' to reference File 'Main'",
    ]);
  });

  it('keeps the legacy double-report with checkEntryPoint and checkFunctionDTOs (only F4 was resolved)', async () => {
    const result = await check(
      ['App -> fn v1.0.0', 'Main @ src/main.ts:', '  <- [fn]', '  -> [fn]', 'fn :: () => void', '  -> Main', ''].join('\n'),
    );
    assert.deepEqual(
      {
        legality: messagesByCode(result, 'checker/reference-to-illegal').sort(),
        entryTwin: messagesByCode(result, 'checker/entry-not-file'),
        outputTwin: messagesByCode(result, 'checker/output-not-dto'),
      },
      {
        legality: ["Cannot use 'entry' to reference Function 'fn'", "Cannot use 'output' to reference File 'Main'"],
        entryTwin: ["Program 'App' entry point 'fn' must be a File entity, but found Function"],
        outputTwin: ["Function output 'Main' is not a DTO (it's a File)"],
      },
    );
  });
});

// issue #90 (lead ruling, tm10-inc4) — a ClassFile is, by definition, a File
// fused with a Class, so it satisfies "entry is a file" the same way a
// plain File does and is now a legal Program.entry target. Two enforcement
// points, mirroring the TM-8 two-point discipline used for `schema.to`/
// TypeDef: VALID_REFERENCES.entry.to (this file's own table) and
// check-entry-point.ts's inline kind check (`checker/entry-not-file`).
// Zero grammar change. NOTE: the converter never currently produces "an
// entrypoint module fused into a ClassFile" (processModule's ClassFile
// branch has an explicit `!isEntryPoint` guard — entry points always go
// through convertToSeparateEntities), so these fixtures exercise the
// checker-level legality change directly via hand-authored `.tmd`, the
// correct unit for this fix regardless of what the converter emits today.
describe('issue #90: ClassFile is a legal Program.entry target', () => {
  it('a Program.entry naming a real ClassFile entity produces zero entry-legality findings', async () => {
    const result = await check(['App -> Service v1.0.0', 'Service #: src/service.ts', '  => [run]', 'run :: run() => void', ''].join('\n'));
    assert.deepEqual(messagesByCode(result, 'checker/entry-not-found'), []);
    assert.deepEqual(messagesByCode(result, 'checker/entry-not-file'), []);
    assert.equal(
      messagesByCode(result, 'checker/reference-to-illegal').some((m) => m.includes("'entry'")),
      false,
    );
  });

  it('a plain Class (never fused into a ClassFile) is still rejected as an entry target — the widening is narrow', async () => {
    const result = await check(['App -> Widget v1.0.0', 'Widget <:', '  => [run]', 'run :: run() => void', ''].join('\n'));
    assert.deepEqual(messagesByCode(result, 'checker/entry-not-file'), [
      "Program 'App' entry point 'Widget' must be a File entity, but found Class",
    ]);
  });

  it('a Program.entry naming a plain File entity is unaffected by the widening (control case)', async () => {
    const result = await check(['App -> Main v1.0.0', 'Main @ src/main.ts:', '  -> [run]', 'run :: () => void', ''].join('\n'));
    assert.deepEqual(messagesByCode(result, 'checker/entry-not-found'), []);
    assert.deepEqual(messagesByCode(result, 'checker/entry-not-file'), []);
  });
});

describe('walk quirks (validator.ts:1252-1253, 1305-1321, 1400-1409)', () => {
  it('short-circuits missing targets and skips Dependency imports and wildcards', async () => {
    const result = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  <- [axios, TotallyMissing]',
        '  -> [fn]',
        'axios ^ "http client"',
        'fn :: () => void',
        '',
      ].join('\n'),
    );
    assert.deepEqual(
      {
        fromSide: messagesByCode(result, 'checker/reference-from-illegal'),
        toSide: messagesByCode(result, 'checker/reference-to-illegal'),
      },
      { fromSide: [], toSide: [] },
    );
  });

  it('runs extends legality for legacy-Class referencers only (declared Class + lookahead conversion, not genuine ClassFile)', async () => {
    const parser = await parserPromise;
    const outcome = parser.parse(['App -> Base v1.0.0', 'Base @ src/base.ts:', '  -> [Impl]', 'Impl <: Base', ''].join('\n'));
    // Hand-built twins pin the P2 raw-sigil discriminant: `converted` replays a
    // lookahead-converted ClassFile (raw is the File declaration — legacy type
    // Class, arm APPLIES); `genuine` declares with `#:` (arm skipped).
    const converted = new ClassFileNode({
      name: 'Conv',
      span: span(90),
      raw: 'Conv @ src/conv.ts:',
      sourceForm: 'shortform',
      path: 'src/conv.ts',
      implements: [],
      methods: [],
      imports: [],
      exports: [],
      extends: 'Base',
    });
    const genuine = new ClassFileNode({
      name: 'Gen',
      span: span(91),
      raw: 'Gen #: src/gen.ts <: Base',
      sourceForm: 'shortform',
      path: 'src/gen.ts',
      implements: [],
      methods: [],
      imports: [],
      exports: [],
      extends: 'Base',
    });
    const entities = [...outcome.entities, converted, genuine];
    const result = new AstValidator().validate(
      { entities, imports: outcome.imports, diagnostics: outcome.diagnostics },
      computeLinks(entities),
    );
    assert.deepEqual(messagesByCode(result, 'checker/reference-to-illegal'), [
      "Cannot use 'extends' to reference File 'Base'", // declared Class Impl
      "Cannot use 'extends' to reference File 'Base'", // converted Conv
      // genuine Gen: silent — legacy never legality-checked ClassFile extends
    ]);
  });
});

describe('from-side + unknown-ref-type arms (defensive gates, exercised directly)', () => {
  it('emits the from-side error verbatim for a kind outside the from list', () => {
    const fn = new FunctionNode({
      name: 'stray',
      span: span(1),
      raw: 'stray :: () => void',
      sourceForm: 'shortform',
      signature: '() => void',
      calls: [],
      pendingDependencies: [],
    });
    const widgetFile = new FileNode({
      name: 'Target',
      span: span(2),
      raw: 'Target @ src/t.ts:',
      sourceForm: 'shortform',
      path: 'src/t.ts',
      imports: [],
      exports: [],
    });
    const context = emptyContextWith([fn, widgetFile]);
    checkSingleReference(context, fn, 'contains', 'Target');
    assert.deepEqual(
      context.findings.map((finding) => ({ code: finding.code, message: finding.message, suggestion: finding.suggestion })),
      [
        {
          code: 'checker/reference-from-illegal',
          message: "Function 'stray' cannot have 'contains' references",
          suggestion: "Only UIComponent entities can have 'contains' references",
        },
      ],
    );
  });

  it('emits the unknown-ref-type error for a kind outside the table', () => {
    const file = new FileNode({
      name: 'Solo',
      span: span(1),
      raw: 'Solo @ src/s.ts:',
      sourceForm: 'shortform',
      path: 'src/s.ts',
      imports: [],
      exports: [],
    });
    const context = emptyContextWith([file]);
    // Test-only cast: the ReferenceKind union is closed, so the ported
    // unknown-ref-type guard (validator.ts:1258) is reachable only by forcing
    // a value past the type system.
    checkSingleReference(context, file, 'bogus' as ReferenceKind, 'Solo');
    // RFC-TM-10 §12 (D-LEG-12, Q7): the message gained the referencer's own
    // name (WHERE, per the style guide's three-clause rule) and a `suggestion`
    // field (WHAT TO DO) — this defensive branch is unreachable through the
    // closed `ReferenceKind` union in production, so the suggestion points a
    // future maintainer at filing a bug rather than at a DSL-author fix.
    assert.deepEqual(
      context.findings.map((finding) => ({ code: finding.code, message: finding.message, suggestion: finding.suggestion })),
      [
        {
          code: 'checker/reference-unknown-type',
          message: "Unknown reference type 'bogus' on 'Solo'",
          suggestion: 'File a bug report — this reference kind should never reach the checker',
        },
      ],
    );
  });
});
