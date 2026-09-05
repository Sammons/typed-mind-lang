// RFC-TM-13 B1.5 amendment: every existing-corpus diagnostic movement is
// attributable to signature-only type use. Fixtures remain byte-for-byte intact.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { it } from 'node:test';
import { FunctionNode } from '../../typed-mind/src/ast/function-node.ts';
import { AstValidator } from '../../typed-mind/src/checker/ast-validator.ts';
import { toDiagnostics } from '../../typed-mind/src/checker/finding.ts';
import { ImportResolver } from '../../typed-mind/src/pipeline/import-resolver.ts';
import { computeLinks } from '../../typed-mind/src/pipeline/link-index.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const cases: readonly [string, readonly string[]][] = [
  ['method-calls-example.tmd', ['RateDTO']],
  ['examples/imports/main.tmd', ['LoginDTO']],
  ['examples/imports/shared/auth.tmd', ['LoginDTO']],
  ['lib/typed-mind/program.tmd', ['ValidationResult']],
  ['lib/typed-mind-test-suite/scenarios/scenario-22-nested-import.tmd', ['User']],
  ['lib/typed-mind-test-suite/scenarios/scenario-31-mixed-syntax.tmd', ['TodoDTO', 'UserDTO']],
];

for (const [relativePath, names] of cases) {
  it(`B1.5 restores exactly the signature-only orphan findings: ${relativePath}`, async () => {
    const absPath = join(import.meta.dirname, '..', '..', '..', relativePath);
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(readFileSync(absPath, 'utf8'));
    const entities = [...outcome.entities];
    const diagnostics = [...outcome.diagnostics];
    if (outcome.imports.length > 0) {
      const resolved = new ImportResolver(parser).resolveImports(outcome.imports, dirname(absPath));
      entities.push(...resolved.resolvedEntities.values());
      diagnostics.push(...resolved.diagnostics);
    }
    const validate = (input: typeof entities) =>
      toDiagnostics(
        new AstValidator().validate(
          { entities: input, diagnostics, imports: outcome.imports, suppressions: outcome.suppressions },
          computeLinks(input),
        ).findings,
      );
    const current = validate(entities);
    // Retain names, spans, input/output, calls and all other entity fields.
    // Only the signature's type-reference lane is removed in these clones.
    const control = validate(
      entities.map((entity) => (entity instanceof FunctionNode ? new FunctionNode({ ...entity, signature: '() => void' }) : entity)),
    );
    const restored = control.filter((finding) => !current.some((present) => JSON.stringify(present) === JSON.stringify(finding)));
    assert.deepEqual(
      restored.map((finding) => [finding.code, finding.message]).sort(),
      names.map((name) => ['checker/orphaned-entity', `Orphaned entity '${name}'`]).sort(),
    );
    assert.deepEqual(
      control.filter((finding) => !restored.includes(finding)),
      current,
    );
  });
}
