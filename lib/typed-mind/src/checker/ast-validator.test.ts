// RFC-TM-4 §1 / Diamond DAG Q1 (rfc-tm-4-diamond.md) — per-check unit
// fixtures for the AstValidator's structural checks: the originated
// duplicate-name validator (incl. the fusion hint and the folded facade
// error), orphans, imports, the three cycle checks, entry point, unique
// paths, the export trio, and method calls. Function-side and UI-side check
// fixtures live in checker-functions.test.ts; reference-legality per-direction
// fixtures in reference-legality.test.ts; the I-6 span fixture in
// checker-spans.test.ts. Assertions filter findings by code so each fixture
// pins exactly the check under test.

import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { FileNode } from '../ast/file-node.ts';
import { computeLinks } from '../pipeline/link-index.ts';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { type AstValidationResult, AstValidator, type AstValidatorOptions } from './ast-validator.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const wasmPath = join(testDir, '..', '..', 'grammar', 'grammar.wasm');
const parserPromise = TypedMindParser.create({ wasmPath });

const check = async (source: string, options?: AstValidatorOptions) => {
  const parser = await parserPromise;
  const outcome = parser.parse(source);
  const links = computeLinks(outcome.entities);
  const result = new AstValidator(options).validate(outcome, links);
  return { outcome, result };
};

const messagesByCode = (result: AstValidationResult, code: string) => {
  return result.findings.filter((finding) => finding.code === code).map((finding) => finding.message);
};

const findingsByCode = (result: AstValidationResult, code: string) => {
  return result.findings.filter((finding) => finding.code === code);
};

describe('duplicate-name validator (originated; §1 "Originated, not ported")', () => {
  it('reports same-kind shortform collisions at both spans', async () => {
    const { result } = await check(
      ['App -> Main v1.0.0', 'Main @ src/main.ts:', '  <- [work]', '  -> [work]', 'work :: () => void', 'work :: () => string', ''].join(
        '\n',
      ),
    );
    assert.deepEqual(
      findingsByCode(result, 'checker/duplicate-name').map((finding) => ({ message: finding.message, line: finding.span.start.line })),
      [
        { message: "Duplicate entity name 'work' found in multiple Function, Function entities", line: 5 },
        { message: "Duplicate entity name 'work' found in multiple Function, Function entities", line: 6 },
      ],
    );
  });

  it('preserves the Class/File fusion hint verbatim (validator.ts:166-178)', async () => {
    const { result } = await check(
      ['App -> Entry v1.0.0', 'Entry @ src/entry.ts:', '  <- [Helper]', 'Helper <: BaseThing', 'Helper @ src/helper.ts:', ''].join('\n'),
    );
    assert.deepEqual(
      findingsByCode(result, 'checker/duplicate-name').map((finding) => ({ message: finding.message, suggestion: finding.suggestion })),
      [
        {
          message: "Entity name 'Helper' is used by both a File and a Class. Consider using the #: operator for class-file fusion.",
          suggestion: 'Replace with: Helper #: src/helper.ts <: BaseClass',
        },
        {
          message: "Entity name 'Helper' is used by both a File and a Class. Consider using the #: operator for class-file fusion.",
          suggestion: 'Replace with: Helper #: src/helper.ts <: BaseClass',
        },
      ],
    );
  });

  it('reports longform/shortform mixed collisions legacy never saw', async () => {
    const { result } = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  <- [work]',
        '  -> [work]',
        'function work {',
        '  signature: "() => void"',
        '}',
        'work :: () => string',
        '',
      ].join('\n'),
    );
    assert.deepEqual(messagesByCode(result, 'checker/duplicate-name'), [
      "Duplicate entity name 'work' found in multiple Function, Function entities",
      "Duplicate entity name 'work' found in multiple Function, Function entities",
    ]);
  });

  it('folds the facade import-conflict error (index.ts:118) into the duplicate check on a merged outcome', async () => {
    const parser = await parserPromise;
    const local = parser.parse(['App -> Main v1.0.0', 'Main @ src/main.ts:', '  <- [Config]', 'Config ! src/config.ts', ''].join('\n'));
    const imported = parser.parse('Config ! src/other-config.ts\n');
    const merged = {
      entities: [...local.entities, ...imported.entities],
      imports: local.imports,
      diagnostics: [...local.diagnostics, ...imported.diagnostics],
    };
    const result = new AstValidator().validate(merged, computeLinks(merged.entities));
    assert.deepEqual(messagesByCode(result, 'checker/duplicate-name'), [
      "Duplicate entity name 'Config' found in multiple Constants, Constants entities",
      "Duplicate entity name 'Config' found in multiple Constants, Constants entities",
    ]);
  });
});

describe('orphan check (validator.ts:245-367)', () => {
  const orphanSource = [
    'App -> Main v1.0.0',
    'Main @ src/main.ts:',
    '  <- [helper]',
    '  -> [helper]',
    'helper :: () => void',
    'lonely % "unused DTO"',
    'Extra @ src/extra.ts:',
    '  -> [extraFn]',
    'extraFn :: () => void',
    '',
  ].join('\n');

  it('reports orphaned entities and orphaned files with the legacy messages', async () => {
    const { result } = await check(orphanSource);
    assert.deepEqual(
      {
        entities: messagesByCode(result, 'checker/orphaned-entity'),
        files: messagesByCode(result, 'checker/orphaned-file'),
      },
      {
        entities: ["Orphaned entity 'lonely'", "Orphaned entity 'extraFn'"],
        files: ["Orphaned file 'Extra' - none of its exports are imported"],
      },
    );
  });

  it('treats a file as consumed when any of its exports is imported', async () => {
    const { result } = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  <- [extraFn]',
        '  -> [extraFn]',
        'Extra @ src/extra.ts:',
        '  -> [extraFn]',
        'extraFn :: () => void',
        '',
      ].join('\n'),
    );
    assert.deepEqual(messagesByCode(result, 'checker/orphaned-file'), []);
  });

  it('honors skipOrphanCheck (the ported ValidatorOptions surface)', async () => {
    const { result } = await check(orphanSource, { skipOrphanCheck: true });
    assert.deepEqual(
      {
        entities: messagesByCode(result, 'checker/orphaned-entity'),
        files: messagesByCode(result, 'checker/orphaned-file'),
      },
      { entities: [], files: [] },
    );
  });
});

describe('import check (validator.ts:369-406)', () => {
  it('reports unresolved imports with the Levenshtein suggestion', async () => {
    const { result } = await check(
      ['App -> Main v1.0.0', 'Main @ src/main.ts:', '  <- [helprr]', '  -> [helper]', 'helper :: () => void', ''].join('\n'),
    );
    assert.deepEqual(
      findingsByCode(result, 'checker/import-not-found').map((finding) => ({ message: finding.message, suggestion: finding.suggestion })),
      [{ message: "Import 'helprr' not found", suggestion: "Did you mean 'helper'?" }],
    );
  });

  it('reports unmatched wildcard patterns (merged-outcome path: the grammar rejects `*` in lists)', async () => {
    // The tree-sitter grammar has no wildcard name form — `<- [zz*]` lands in
    // syntax/error and the list drops (TM-2 narrowing) — so the ported
    // wildcard branch is reachable only through entities that arrive via the
    // import merge or hand-built outcomes. The fixture builds one directly.
    const parser = await parserPromise;
    const local = parser.parse(['App -> Main v1.0.0', 'Main @ src/main.ts:', '  -> [helper]', 'helper :: () => void', ''].join('\n'));
    const wildSpan = { start: { line: 99, column: 1 }, end: { line: 99, column: 20 } };
    const wild = new FileNode({
      name: 'Wild',
      span: wildSpan,
      raw: 'Wild @ src/wild.ts:',
      path: 'src/wild.ts',
      imports: ['zz*'],
      exports: [],
    });
    const merged = { entities: [...local.entities, wild], imports: local.imports, diagnostics: local.diagnostics };
    const result = new AstValidator().validate(merged, computeLinks(merged.entities));
    assert.deepEqual(messagesByCode(result, 'checker/import-pattern-unmatched'), ["No entities match import pattern 'zz*'"]);
  });
});

describe('cycle checks (validator.ts:408-653)', () => {
  it('detects circular imports among File entities', async () => {
    const { result } = await check(
      [
        'App -> A v1.0.0',
        'A @ src/a.ts:',
        '  <- [B]',
        '  -> [x]',
        'B @ src/b.ts:',
        '  <- [A]',
        '  -> [y]',
        'x :: () => void',
        'y :: () => void',
        '',
      ].join('\n'),
    );
    assert.deepEqual(messagesByCode(result, 'checker/circular-import'), ['Circular import detected: A -> B -> A']);
  });

  it('detects circular and self UIComponent containment', async () => {
    const { result } = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  -> [P, Q, R]',
        'P & "p"',
        '  > [Q]',
        'Q & "q"',
        '  > [P]',
        'R &! "r"',
        '  > [R]',
        '',
      ].join('\n'),
    );
    assert.deepEqual(
      {
        circular: messagesByCode(result, 'checker/circular-containment'),
        self: messagesByCode(result, 'checker/self-containment'),
      },
      {
        circular: ["UIComponent 'P' has circular containment: P -> Q -> P"],
        self: ["UIComponent 'R' contains itself"],
      },
    );
  });

  it('reports the inheritance-chain error family', async () => {
    const { result } = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  -> [A, B, C, D, E]',
        'A <: B',
        'B <: A',
        'C <: Missing',
        'D <: D',
        'E <: A, IGhost',
        '',
      ].join('\n'),
    );
    assert.deepEqual(
      {
        self: messagesByCode(result, 'checker/self-inheritance'),
        unknownBase: messagesByCode(result, 'checker/unknown-base-class'),
        unknownInterface: messagesByCode(result, 'checker/unknown-interface'),
        circular: messagesByCode(result, 'checker/circular-inheritance'),
      },
      {
        self: ["Class 'D' inherits from itself"],
        unknownBase: ["Class 'C' extends 'Missing' which does not exist"],
        unknownInterface: ["Class 'E' implements 'IGhost' which does not exist"],
        // The legacy walk reports the A/B cycle once (sort-normalized), the
        // self-extends D also lands in the cycle walk (validator.ts:608-652),
        // and E -> A is the STALE-RECURSION-STACK quirk ported as-is: the
        // legacy DFS never unwinds recursionStack after an early cycle return,
        // so a later root pointing INTO a reported cycle reads as a new cycle.
        circular: [
          "Class 'A' has circular inheritance: A -> B -> A",
          "Class 'D' has circular inheritance: D -> D",
          "Class 'E' has circular inheritance: E -> A",
        ],
      },
    );
  });
});

describe('entry-point check (validator.ts:655-686)', () => {
  it('reports a missing Program at the document origin', async () => {
    const { result } = await check(['Main @ src/main.ts:', '  -> [helper]', 'helper :: () => void', ''].join('\n'));
    assert.deepEqual(
      findingsByCode(result, 'checker/no-entry-point').map((finding) => ({ message: finding.message, start: finding.span.start })),
      [{ message: 'No program entry point defined', start: { line: 1, column: 1 } }],
    );
  });

  it('reports undefined and non-File entry points', async () => {
    const { result } = await check(
      ['App -> Ghost v1.0.0', 'Second -> fn v1.0.0', 'Main @ src/main.ts:', '  -> [fn]', 'fn :: () => void', ''].join('\n'),
    );
    assert.deepEqual(
      {
        missing: messagesByCode(result, 'checker/entry-not-found'),
        wrongKind: messagesByCode(result, 'checker/entry-not-file'),
      },
      {
        missing: ["Program 'App' references undefined entry point 'Ghost'"],
        wrongKind: ["Program 'Second' entry point 'fn' must be a File entity, but found Function"],
      },
    );
  });
});

describe('unique-path check (validator.ts:688-732)', () => {
  it('reports File/ClassFile path collisions and exempts # fragments', async () => {
    const { result } = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  -> [helper]',
        'Other @ src/main.ts:',
        '  -> [helper]',
        'VirtA @ src/virtual.ts#a:',
        '  -> [helper]',
        'VirtB @ src/virtual.ts#b:',
        '  -> [helper]',
        'helper :: () => void',
        '',
      ].join('\n'),
    );
    assert.deepEqual(messagesByCode(result, 'checker/duplicate-path'), ["Path 'src/main.ts' already used by File 'Main'"]);
  });
});

describe('export checks (validator.ts:804-940)', () => {
  it('requires Classes and non-method Functions to be exported', async () => {
    const { result } = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  <- [okFn]',
        '  -> [okFn]',
        'okFn :: () => void',
        'ghost :: () => void',
        'Svc #: src/svc.ts',
        '  => [doWork]',
        'doWork :: () => void',
        'class Stray {',
        '}',
        '',
      ].join('\n'),
    );
    assert.deepEqual(
      {
        classes: messagesByCode(result, 'checker/class-not-exported'),
        functions: messagesByCode(result, 'checker/function-not-exported'),
      },
      {
        classes: ["Class 'Stray' is not exported by any file"],
        // doWork escapes via the class-method set; ghost does not.
        functions: ["Function 'ghost' is not exported by any file and is not a class method"],
      },
    );
  });

  it('reports entities exported by multiple files, once, at the first exporter', async () => {
    const { result } = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  <- [thing]',
        '  -> [thing]',
        'Other @ src/other.ts:',
        '  -> [thing]',
        'thing :: () => void',
        '',
      ].join('\n'),
    );
    assert.deepEqual(messagesByCode(result, 'checker/multi-exported'), ["Entity 'thing' is exported by multiple files: Main, Other"]);
  });

  it('reports exported names with no definition', async () => {
    const { result } = await check(['App -> Main v1.0.0', 'Main @ src/main.ts:', '  -> [phantom]', ''].join('\n'));
    assert.deepEqual(messagesByCode(result, 'checker/undefined-export'), ["Export 'phantom' is not defined anywhere in the codebase"]);
  });
});

describe('method-call check (validator.ts:882-921)', () => {
  it('reports unknown targets, non-class targets, and missing methods', async () => {
    const { result } = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  <- [caller]',
        '  -> [caller, caller2]',
        'caller :: () => void',
        '  ~> [Model.create, Model.missing, Ghost.x, caller2.y]',
        'Model #: src/model.ts',
        '  => [create]',
        'create :: () => void',
        'caller2 :: () => void',
        '',
      ].join('\n'),
    );
    assert.deepEqual(
      {
        unknown: messagesByCode(result, 'checker/unknown-call-target'),
        nonClass: messagesByCode(result, 'checker/method-call-on-non-class'),
        missingMethod: findingsByCode(result, 'checker/unknown-method').map((finding) => ({
          message: finding.message,
          suggestion: finding.suggestion,
        })),
      },
      {
        unknown: ["Call to 'Ghost.x' references unknown entity 'Ghost'"],
        nonClass: ["Cannot call method 'y' on Function 'caller2'. Only Classes and ClassFiles can have methods"],
        missingMethod: [{ message: "Method 'missing' not found on classfile 'Model'", suggestion: 'Available methods: create' }],
      },
    );
  });
});
