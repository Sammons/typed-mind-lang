// RFC-TM-4 §1 / Diamond DAG Q1 (rfc-tm-4-diamond.md) — per-check unit
// fixtures for the Function-side, DTO-field, UIComponent, Asset, and
// RunParameter checks, including:
//   - the F4 double-report resolution (parse-time wins on code + span);
//   - the import-merge arm of the dependency check (the pinned ordering
//     quirk: a Dependency resolvable only post-merge still gets the legacy
//     validator error);
//   - the affectedBy/consumedBy disagreement ports (§1 disagreement clause);
//   - the containedBy existence + kind checks (existence + kind ONLY — no
//     originated disagreement, FID-4).

import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { computeLinks } from '../pipeline/link-index.ts';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { type AstValidationResult, AstValidator } from './ast-validator.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const wasmPath = join(testDir, '..', '..', 'grammar', 'grammar.wasm');
const parserPromise = TypedMindParser.create({ wasmPath });

const check = async (source: string) => {
  const parser = await parserPromise;
  const outcome = parser.parse(source);
  const links = computeLinks(outcome.entities);
  const result = new AstValidator().validate(outcome, links);
  return { outcome, result };
};

const messagesByCode = (result: AstValidationResult, code: string) => {
  return result.findings.filter((finding) => finding.code === code).map((finding) => finding.message);
};

describe('function DTO checks (validator.ts:942-995)', () => {
  it('reports missing and non-DTO input/output, with the Dependency-export rescue', async () => {
    const { result } = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  <- [fn1, fn2, fn3]',
        '  -> [fn1, fn2, fn3]',
        'fn1 :: () => void',
        '  <- MissingDTO',
        'fn2 :: () => void',
        '  -> Main',
        'lodash ^ "utility library" v4.0.0',
        '  -> [LodashDTO]',
        'fn3 :: () => void',
        '  <- LodashDTO',
        '',
      ].join('\n'),
    );
    assert.deepEqual(
      {
        inputMissing: messagesByCode(result, 'checker/input-dto-not-found'),
        outputWrongKind: messagesByCode(result, 'checker/output-not-dto'),
        outputMissing: messagesByCode(result, 'checker/output-dto-not-found'),
        inputWrongKind: messagesByCode(result, 'checker/input-not-dto'),
      },
      {
        inputMissing: ["Function input DTO 'MissingDTO' not found"],
        outputWrongKind: ["Function output 'Main' is not a DTO (it's a File)"],
        outputMissing: [],
        // fn3's input rides the lodash Dependency's exports — rescued.
        inputWrongKind: [],
      },
    );
  });
});

describe('function dependency check (validator.ts:1441-1471) + the F4 resolution', () => {
  it('reports unresolved dependencies and skips parse-diagnosed direct consumption', async () => {
    const { outcome, result } = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  <- [worker, worker2]',
        '  -> [worker, worker2]',
        'worker :: () => void',
        '  <- [ghostThing]',
        'axios ^ "http client"',
        'worker2 :: () => void',
        '  <- [axios]',
        '',
      ].join('\n'),
    );
    assert.deepEqual(
      {
        notFound: messagesByCode(result, 'checker/dependency-not-found'),
        directConsumption: messagesByCode(result, 'checker/dependency-direct-consumption'),
        parseWarnings: outcome.diagnostics
          .filter((diagnostic) => diagnostic.code === 'semantics/dependency-direct-consumption')
          .map((diagnostic) => diagnostic.severity),
      },
      {
        notFound: ["Function dependency 'ghostThing' not found"],
        // F4: the parse-time warning exists on worker2's span, so the
        // validator's error is skipped — one report per defect.
        directConsumption: [],
        parseWarnings: ['warning'],
      },
    );
  });

  it('still errors for a Dependency that becomes resolvable only through the import merge', async () => {
    const parser = await parserPromise;
    const local = parser.parse(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  <- [worker3]',
        '  -> [worker3]',
        'worker3 :: () => void',
        '  <- [importedDep]',
        '',
      ].join('\n'),
    );
    const imported = parser.parse('importedDep ^ "external library"\n');
    const merged = {
      entities: [...local.entities, ...imported.entities],
      imports: local.imports,
      diagnostics: [...local.diagnostics, ...imported.diagnostics],
    };
    const result = new AstValidator().validate(merged, computeLinks(merged.entities));
    assert.deepEqual(
      {
        directConsumption: messagesByCode(result, 'checker/dependency-direct-consumption'),
        parseWarnings: merged.diagnostics.filter((diagnostic) => diagnostic.code === 'semantics/dependency-direct-consumption'),
      },
      {
        // Distribution ran pre-merge (the pinned ordering quirk), so no parse
        // warning exists and the legacy error fires verbatim.
        directConsumption: ["Cannot directly consume dependency 'importedDep' in function 'worker3'"],
        parseWarnings: [],
      },
    );
  });
});

describe('function consumption checks (validator.ts:1174-1241)', () => {
  it('reports unknown and wrong-kind consumes; derived consumedBy stays silent', async () => {
    const { result } = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  <- [useIt]',
        '  -> [useIt]',
        'PORT $env "the port" (required)',
        'useIt :: () => void',
        '  $< [PORT, GhostParam, Main]',
        '',
      ].join('\n'),
    );
    assert.deepEqual(
      {
        unknown: messagesByCode(result, 'checker/consumes-unknown'),
        wrongKind: messagesByCode(result, 'checker/consumes-invalid-kind'),
        consumedByUnknown: messagesByCode(result, 'checker/consumedby-unknown-function'),
        consumedByNonFunction: messagesByCode(result, 'checker/consumedby-non-function'),
        consumedByDisagreement: messagesByCode(result, 'checker/consumedby-disagreement'),
      },
      {
        unknown: ["Function 'useIt' consumes unknown entity 'GhostParam'"],
        wrongKind: ["Function 'useIt' cannot consume 'Main' (it's a File)"],
        // The consumedBy arms run over the LinkIndex derivation and are silent
        // by construction, exactly as legacy's parser-derived reverse writes.
        consumedByUnknown: [],
        consumedByNonFunction: [],
        consumedByDisagreement: [],
      },
    );
  });
});

describe('DTO field type checks (validator.ts:1473-1592)', () => {
  it('reports Function-typed fields, undefined types, and non-data type references', async () => {
    const { result } = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  <- [useDto]',
        '  -> [useDto]',
        'useDto :: () => void',
        '  <- BadDTO',
        'BadDTO % "bad shapes"',
        '  - cb: Function "callback field"',
        '  - other: MissingType "no such type"',
        '  - fileRef: Main "a file reference"',
        '  - fine: string "a fine field"',
        '',
      ].join('\n'),
    );
    assert.deepEqual(
      {
        functionType: messagesByCode(result, 'checker/dto-field-function-type'),
        unknownType: messagesByCode(result, 'checker/dto-field-unknown-type'),
        nonDataType: messagesByCode(result, 'checker/dto-field-non-data-type'),
      },
      {
        functionType: ["DTO 'BadDTO' field 'cb' cannot have Function type"],
        unknownType: ["DTO 'BadDTO' field 'other' references undefined type 'MissingType'"],
        nonDataType: ["DTO 'BadDTO' field 'fileRef' references 'Main' which is a File, not a DTO or Class"],
      },
    );
  });

  // issue #78 — PRIMITIVES (check-dto-fields.ts) had `Required` but not
  // `Readonly`, an asymmetric gap: a DTO field typed `Readonly<T>` raised
  // `checker/dto-field-unknown-type` even though `Readonly` is the same
  // class of TS-builtin generic utility type as `Required`/`Partial`/
  // `Pick`/`Omit`, all of which were already allowlisted. Fixed by adding
  // `Readonly` to PRIMITIVES.
  it('does not flag Readonly<T> as an unknown type (issue #78)', async () => {
    const { result } = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  <- [useDto]',
        '  -> [useDto]',
        'useDto :: () => void',
        '  <- GoodDTO',
        'GoodDTO % "readonly-generic field"',
        '  - locked: Readonly<string> "a readonly-wrapped primitive"',
        '',
      ].join('\n'),
    );
    assert.deepEqual(messagesByCode(result, 'checker/dto-field-unknown-type'), []);
  });

  // issue #89 — same class of gap as #78: PRIMITIVES was missing
  // ReadonlyMap and Uint8Array, both real lib.es2015+/lib.es5 TS/JS
  // builtins with no import statement (never from an npm package), so
  // `addExternalTypeToDepExports`'s package-based Dependency-exports
  // stubbing can never cover them either. Live corpus instances:
  // `lib/typed-mind`'s own `LinkIndexMaps` (5 `ReadonlyMap<string, ...>`
  // fields) and `TypedMindParserOptions` (`wasmBytes?: Uint8Array`).
  it('does not flag ReadonlyMap<K, V> or Uint8Array as unknown types (issue #89)', async () => {
    const { result } = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  <- [useDto]',
        '  -> [useDto]',
        'useDto :: () => void',
        '  <- GoodDTO',
        'GoodDTO % "readonly-collection and typed-array fields"',
        '  - byId: ReadonlyMap<string, string> "a readonly map field"',
        '  - bytes: Uint8Array "a typed-array field"',
        '',
      ].join('\n'),
    );
    assert.deepEqual(messagesByCode(result, 'checker/dto-field-unknown-type'), []);
  });
});

describe('UIComponent relationship checks (validator.ts:997-1047)', () => {
  it('reports contains/containedBy existence and kind violations (no disagreement originated)', async () => {
    const { result } = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  <- [helperFn]',
        '  -> [helperFn, Widget, Panel]',
        'helperFn :: () => void',
        'Widget &! "widget"',
        '  > [GhostChild, helperFn, Panel]',
        '  < [GhostParent]',
        'Panel & "panel"',
        '  < [helperFn]',
        '',
      ].join('\n'),
    );
    assert.deepEqual(
      {
        containsUnknown: messagesByCode(result, 'checker/contains-unknown'),
        containsWrongKind: messagesByCode(result, 'checker/contains-non-uicomponent'),
        containedByUnknown: messagesByCode(result, 'checker/containedby-unknown-parent'),
        containedByWrongKind: messagesByCode(result, 'checker/containedby-non-uicomponent'),
      },
      {
        containsUnknown: ["UIComponent 'Widget' contains unknown component 'GhostChild'"],
        containsWrongKind: ["UIComponent 'Widget' cannot contain 'helperFn' (it's a Function)"],
        containedByUnknown: ["UIComponent 'Widget' references unknown parent 'GhostParent'"],
        containedByWrongKind: ["UIComponent 'Panel' cannot be contained by 'helperFn' (it's a Function)"],
      },
    );
  });
});

describe('affects + affectedBy checks (validator.ts:1049-1106)', () => {
  it('reports affects existence/kind and the declared-vs-derived affectedBy disagreement', async () => {
    const { result } = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  <- [refresh, bad, refresh2, refresh3]',
        '  -> [refresh, bad, refresh2, refresh3, Widget2, Widget3]',
        'refresh :: () => void',
        '  ~ [GhostComp]',
        'bad :: () => void',
        '  ~ [helperFn2]',
        'helperFn2 :: () => void',
        'refresh2 :: () => void',
        'component Widget2 {',
        '  description: "w2"',
        '  affectedBy: [refresh2]',
        '  root: true',
        '}',
        'refresh3 :: () => void',
        '  ~ [Widget3]',
        'component Widget3 {',
        '  description: "w3"',
        '  affectedBy: [refresh3]',
        '  root: true',
        '}',
        '',
      ].join('\n'),
    );
    assert.deepEqual(
      {
        unknown: messagesByCode(result, 'checker/affects-unknown'),
        wrongKind: messagesByCode(result, 'checker/affects-non-uicomponent'),
        disagreement: messagesByCode(result, 'checker/affectedby-disagreement'),
      },
      {
        unknown: ["Function 'refresh' affects unknown component 'GhostComp'"],
        wrongKind: ["Function 'bad' cannot affect 'helperFn2' (it's a Function)"],
        // Widget2's claim has no backing affects; Widget3's claim agrees with
        // refresh3's affects and stays silent.
        disagreement: ["UIComponent 'Widget2' claims to be affected by 'refresh2', but that function doesn't affect it"],
      },
    );
  });
});

describe('asset/program checks (validator.ts:1108-1134)', () => {
  it('reports unknown and non-Program containsProgram references', async () => {
    const { result } = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  <- [Logo, Banner]',
        '  -> [Logo, Banner]',
        'Logo ~ "logo image"',
        '  >> GhostProgram',
        'Banner ~ "banner image"',
        '  >> Main',
        '',
      ].join('\n'),
    );
    assert.deepEqual(
      {
        unknown: messagesByCode(result, 'checker/asset-program-unknown'),
        wrongKind: messagesByCode(result, 'checker/asset-contains-non-program'),
      },
      {
        unknown: ["Asset 'Logo' references unknown program 'GhostProgram'"],
        wrongKind: ["Asset 'Banner' cannot contain 'Main' (it's a File)"],
      },
    );
  });
});

describe('UIComponent containment check (validator.ts:1136-1172)', () => {
  it('reports uncontained non-root components; roots and contained components pass', async () => {
    const { result } = await check(
      [
        'App -> Main v1.0.0',
        'Main @ src/main.ts:',
        '  <- [Floating, Root2, Child]',
        '  -> [Floating, Root2, Child]',
        'Floating & "floating"',
        'Root2 &! "root"',
        '  > [Child]',
        'Child & "child"',
        '',
      ].join('\n'),
    );
    assert.deepEqual(messagesByCode(result, 'checker/uncontained-uicomponent'), [
      "UIComponent 'Floating' is not contained by any other UIComponent",
    ]);
  });
});
