import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DtoNode } from '../../typed-mind/src/ast/dto-node.ts';
import { FileNode } from '../../typed-mind/src/ast/file-node.ts';
import { FunctionNode } from '../../typed-mind/src/ast/function-node.ts';
import { AstValidator } from '../../typed-mind/src/checker/ast-validator.ts';
import { computeLinks } from '../../typed-mind/src/pipeline/link-index.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// STOP-AND-REPORT (S-TEST-1, scenario-61, not in an AUTHORIZED[A#] delta row):
// legacy always initialized `Function.consumes` to `[]` when no DTOs/constants
// were consumed. The new `FunctionNode.consumes` is `readonly string[] |
// undefined` and stays `undefined` when nothing is consumed (see
// 'should handle multiple potential input DTOs' below, ambiguousFunction).
// Assertions that relied on `consumes` always being an array now use
// `?? []` to normalize before comparing. Flagged for lead review — this may
// warrant a FunctionNode default-to-empty-array change (out of Q4 scope: no
// lib/typed-mind source changes here).

describe('Scenario 61: Multiple DTOs in function dependencies', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-61-multiple-dtos-function-deps.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');

  it('should auto-assign single DTO to input', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    // Simple function with single DTO dependency
    const simpleTransform = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'simpleTransform');

    assert.equal(simpleTransform?.input, 'InputDTO');
    assert.equal(simpleTransform?.output, 'OutputDTO');
  });

  it('should handle multiple DTOs in dependencies', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    // Complex function with multiple DTOs
    const complexTransform = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'complexTransform');

    // First DTO should be input if signature matches
    assert.equal(complexTransform?.input, 'ComplexInput');

    // Other DTOs might be in consumes or remain in dependencies
    const allDTOs = [complexTransform?.input, ...(complexTransform?.consumes ?? []), ...(complexTransform?.calls ?? [])].filter(Boolean);

    assert.ok(allDTOs.includes('ComplexInput'));
    // ValidationRules and TransformConfig should be somewhere
  });

  it('should handle explicit input/output with additional DTOs', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    const explicitFunction = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'explicitFunction');

    assert.equal(explicitFunction?.input, 'RequestDTO');
    assert.equal(explicitFunction?.output, 'ResponseDTO');

    // ConfigDTO and StateDTO should be in dependencies somewhere
    const _deps = [...(explicitFunction?.consumes ?? []), ...(explicitFunction?.calls ?? [])];

    // They might be treated as consumed or called
  });

  it('should handle multiple potential input DTOs', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    const ambiguousFunction = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'ambiguousFunction');

    // Function signature has two parameters
    // Parser should assign first DTO as input
    assert.equal(ambiguousFunction?.input, 'AmbiguousA');

    // Extra DTOs beyond first are ignored (they should use explicit syntax)
    // See file-level STOP-AND-REPORT above: new surface leaves `consumes`
    // undefined instead of `[]` when nothing is consumed.
    assert.deepEqual(ambiguousFunction?.consumes ?? [], []);
    // Note: AmbiguousB and AmbiguousC are ignored since only one DTO can be auto-assigned as input
  });

  it('should handle DTO as both input and output', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    const selfTransform = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'selfTransform');

    assert.equal(selfTransform?.input, 'SelfDTO');
    assert.equal(selfTransform?.output, 'SelfDTO');
  });

  it('should auto-distribute mixed dependencies', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    const mixedDependencies = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'mixedDependencies');

    // Check auto-distribution
    assert.equal(mixedDependencies?.input, 'MixedInput');
    assert.ok(mixedDependencies?.calls.includes('helperFunction'));

    // DataProcessor might be in calls (for its methods)
    const _hasDataProcessor =
      mixedDependencies?.calls.includes('DataProcessor') ||
      mixedDependencies?.calls.includes('process') ||
      mixedDependencies?.calls.includes('validate');

    assert.ok(mixedDependencies?.consumes?.includes('DATABASE_URL'));
  });

  it('should handle functions with only DTO dependencies', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    const pureDataFunction = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'pureDataFunction');

    assert.equal(pureDataFunction?.input, 'PureInput');
    assert.equal(pureDataFunction?.output, 'PureOutput');

    // PureConfig and PureState should be distributed somewhere
    const allDeps = [pureDataFunction?.input, ...(pureDataFunction?.consumes ?? []), ...(pureDataFunction?.calls ?? [])].filter(Boolean);

    assert.ok(allDeps.includes('PureInput'));
    // PureConfig and PureState handling depends on parser logic
  });

  it('should handle nested DTO references', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    // Check nested DTO structure
    const nestedInput = outcome.entities.find((e): e is DtoNode => e instanceof DtoNode && e.name === 'NestedInput');
    const outerDTO = outcome.entities.find((e): e is DtoNode => e instanceof DtoNode && e.name === 'OuterDTO');
    const middleDTO = outcome.entities.find((e): e is DtoNode => e instanceof DtoNode && e.name === 'MiddleDTO');
    const _innerDTO = outcome.entities.find((e): e is DtoNode => e instanceof DtoNode && e.name === 'InnerDTO');

    assert.equal(
      nestedInput?.fields.some((f) => f.type === 'OuterDTO'),
      true,
    );
    assert.equal(
      outerDTO?.fields.some((f) => f.type === 'MiddleDTO'),
      true,
    );
    assert.equal(
      middleDTO?.fields.some((f) => f.type === 'InnerDTO'),
      true,
    );

    const nestedFunction = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'nestedFunction');

    assert.equal(nestedFunction?.input, 'NestedInput');
    assert.equal(nestedFunction?.output, 'NestedOutput');
  });

  it('should handle DTO arrays and optional fields', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    const arrayInput = outcome.entities.find((e): e is DtoNode => e instanceof DtoNode && e.name === 'ArrayInput');

    // Check array field
    const itemsField = arrayInput?.fields.find((f) => f.name === 'items');
    assert.equal(itemsField?.type, 'ItemDTO[]');

    // Check optional field
    const optionalField = arrayInput?.fields.find((f) => f.name === 'optional');
    assert.equal(optionalField?.isOptional, true);
    assert.equal(optionalField?.type, 'OptionalDTO');

    const arrayFunction = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'arrayFunction');

    assert.equal(arrayFunction?.input, 'ArrayInput');
    assert.equal(arrayFunction?.output, 'ArrayOutput');
  });

  it('should validate all DTOs are properly defined', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    // All DTOs should be valid
    const dtos = outcome.entities.filter((e): e is DtoNode => e instanceof DtoNode);
    assert.ok(dtos.length > 20); // We have many DTOs

    // Check for any undefined type references
    const errors = validation.findings.filter((e) => e.message.includes('undefined') && e.message.includes('type'));

    // Should have no undefined types
    assert.equal(errors.length, 0);
  });

  it('should export all functions properly', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    const processorFile = outcome.entities.find((e): e is FileNode => e instanceof FileNode && e.name === 'ProcessorFile');

    // Check all functions are exported
    const functionNames = [
      'simpleTransform',
      'complexTransform',
      'explicitFunction',
      'ambiguousFunction',
      'selfTransform',
      'mixedDependencies',
      'pureDataFunction',
      'nestedFunction',
      'arrayFunction',
    ];

    for (const fname of functionNames) {
      assert.ok(processorFile?.exports.includes(fname));
    }

    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    // No functions should be orphaned
    const orphanedFunctions = validation.findings.filter((e) => e.message.includes('Function') && e.message.includes('not exported'));

    assert.equal(orphanedFunctions.length, 0);
  });
});
