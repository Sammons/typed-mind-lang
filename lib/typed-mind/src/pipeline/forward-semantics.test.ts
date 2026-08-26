// RFC-TM-3 §3.4 / §5 Q4 (rfc-tm-3-diamond.md) — forward-semantics fixtures:
// scenario-47 distribution parity against the legacy parser's forward-field
// assignments, the two converted silent behaviors (semantics/extra-input-dto,
// semantics/dependency-direct-consumption), and the pinned
// distribution-before-import-merge ordering quirk.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { FunctionNode } from '../ast/function-node.ts';
import { TypedMindParser } from './typed-mind-parser.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..', '..');
const repoRoot = join(packageDir, '..', '..');
const wasmPath = join(packageDir, 'grammar', 'grammar.wasm');
const scenario47Path = join(repoRoot, 'lib', 'typed-mind-test-suite', 'scenarios', 'scenario-47-function-mixed-dependencies.tmd');

const forwardFieldsOf = (fn: FunctionNode) => {
  return {
    calls: fn.calls,
    input: fn.input,
    output: fn.output,
    affects: fn.affects,
    consumes: fn.consumes,
    pendingDependencies: fn.pendingDependencies,
  };
};

describe('distributeForwardSemantics (§3.4)', () => {
  let parser: TypedMindParser;

  before(async () => {
    parser = await TypedMindParser.create({ wasmPath });
  });

  it('scenario-47 mixed-dependency distribution matches the legacy forward-field assignments', () => {
    const outcome = parser.parse(readFileSync(scenario47Path, 'utf8'));
    const functions = Object.fromEntries(
      outcome.entities.filter((entity) => entity instanceof FunctionNode).map((fn) => [fn.name, forwardFieldsOf(fn)]),
    );
    // Legacy ground truth from running dist/parser.js (DSLParser) on the same
    // file: DashboardUI→affects, transformData→calls, IconAsset/AppConfig→
    // consumes, InputData collected as DTO (input already set by `<- InputData`),
    // lodash (Dependency) kept unresolved in _dependencies. One representation
    // delta is intentional: legacy scratch-initializes affects/consumes to []
    // on any Function with a mixed list (parser.ts:471-473); the honest-fields
    // table (§2.2) keeps undeclared optional fields absent, so renderDashboard
    // has consumes === undefined where legacy has [].
    assert.deepEqual(functions, {
      processData: {
        calls: ['transformData'],
        input: 'InputData',
        output: 'OutputData',
        affects: ['DashboardUI'],
        consumes: ['IconAsset', 'AppConfig'],
        pendingDependencies: ['lodash'],
      },
      renderDashboard: {
        calls: ['processData'],
        input: undefined,
        output: undefined,
        affects: ['DashboardUI', 'StatusPanel'],
        consumes: undefined,
        pendingDependencies: [],
      },
      transformData: {
        calls: [],
        input: undefined,
        output: undefined,
        affects: undefined,
        consumes: undefined,
        pendingDependencies: [],
      },
      getConfig: {
        calls: [],
        input: undefined,
        output: undefined,
        affects: undefined,
        consumes: undefined,
        pendingDependencies: [],
      },
      updateConfig: {
        calls: [],
        input: undefined,
        output: undefined,
        affects: undefined,
        consumes: undefined,
        pendingDependencies: [],
      },
    });
    // The Dependency in processData's list is the file's only semantic
    // diagnostic; its span is the processData declaration line.
    assert.deepEqual(
      outcome.diagnostics.map((diagnostic) => ({ code: diagnostic.code, line: diagnostic.span.start.line })),
      [{ code: 'semantics/dependency-direct-consumption', line: 15 }],
    );
  });

  it('semantics/extra-input-dto: DTOs beyond the first are diagnosed and not distributed (legacy silently ignores, parser.ts:842-856)', () => {
    const source = [
      'saveOrder :: (order: OrderDTO) => void',
      '  <- [OrderDTO, AuditDTO]',
      'OrderDTO % "Order shape"',
      'AuditDTO % "Audit shape"',
      '',
    ].join('\n');
    const outcome = parser.parse(source);
    const fn = outcome.entities.at(0);
    assert.deepEqual(
      {
        fields: fn instanceof FunctionNode ? forwardFieldsOf(fn) : undefined,
        diagnostics: outcome.diagnostics.map((diagnostic) => ({
          code: diagnostic.code,
          severity: diagnostic.severity,
          line: diagnostic.span.start.line,
        })),
        mentionsExtra: outcome.diagnostics.at(0)?.message.includes("'AuditDTO'"),
      },
      {
        fields: {
          calls: [],
          input: 'OrderDTO',
          output: undefined,
          affects: undefined,
          consumes: undefined,
          pendingDependencies: [],
        },
        diagnostics: [{ code: 'semantics/extra-input-dto', severity: 'warning', line: 1 }],
        mentionsExtra: true,
      },
    );
  });

  it('semantics/dependency-direct-consumption: the Dependency name ALSO stays on pendingDependencies (the F4/TM-4 double-report note)', () => {
    const source = ['useLib :: () => void', '  <- [lodash]', 'lodash ^ "Utility library" v4.17.21', ''].join('\n');
    const outcome = parser.parse(source);
    const fn = outcome.entities.at(0);
    assert.deepEqual(
      {
        pendingDependencies: fn instanceof FunctionNode ? fn.pendingDependencies : undefined,
        consumes: fn instanceof FunctionNode ? fn.consumes : null,
        diagnostics: outcome.diagnostics.map((diagnostic) => ({ code: diagnostic.code, severity: diagnostic.severity })),
      },
      {
        pendingDependencies: ['lodash'],
        consumes: undefined,
        diagnostics: [{ code: 'semantics/dependency-direct-consumption', severity: 'warning' }],
      },
    );
  });

  it('pinned ordering quirk: an import-satisfied dependency neither distributes nor errors (distribution runs before import merge, index.ts:104-127)', () => {
    const source = ['@import "./shared.tmd" as Shared', 'main :: () => void', '  <- [SharedHelper]', ''].join('\n');
    const outcome = parser.parse(source);
    const fn = outcome.entities.at(0);
    assert.deepEqual(
      {
        pendingDependencies: fn instanceof FunctionNode ? fn.pendingDependencies : undefined,
        calls: fn instanceof FunctionNode ? fn.calls : undefined,
        diagnostics: outcome.diagnostics,
        importCount: outcome.imports.length,
      },
      { pendingDependencies: ['SharedHelper'], calls: [], diagnostics: [], importCount: 1 },
    );
  });

  it('distribution merges into an existing `~> [...]` calls list with legacy dedupe (parser.ts:786-788) and resolves whole-document', () => {
    const source = ['alpha :: () => void', '  ~> [beta]', '  <- [beta, gamma]', 'beta :: () => void', 'gamma :: () => void', ''].join('\n');
    const outcome = parser.parse(source);
    const fn = outcome.entities.at(0);
    assert.deepEqual(fn instanceof FunctionNode ? { calls: fn.calls, pendingDependencies: fn.pendingDependencies } : undefined, {
      calls: ['beta', 'gamma'],
      pendingDependencies: [],
    });
  });
});
