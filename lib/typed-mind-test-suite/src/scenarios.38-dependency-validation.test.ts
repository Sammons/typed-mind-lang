import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { AstValidator } from '../../typed-mind/src/checker/ast-validator.ts';
import { computeLinks } from '../../typed-mind/src/pipeline/link-index.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-38-dependency-validation', () => {
  it('should validate dependency entities', async () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-38-dependency-validation.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');

    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    // AUTHORIZED[A2] (scenario-38-dependency-validation.tmd :: new :: L13 ::
    // unparsable text: `-> []`) and AUTHORIZED[A1] (:: new :: L22 :: illegal
    // continuation: imports list (`<- [...]`) cannot attach to a Class
    // entity) are new parse-time diagnostics (outcome.diagnostics), not
    // validator findings — this test only asserts on `validation.findings`.
    // RFC-TM-10 Q4 (rfc-tm-10-diamond.md §8, D-LEG-8) fixed
    // `collectReferencedNames` to walk DTO field types: `User` is
    // referenced only via `AuthResponse`'s `user: User` field, so it no
    // longer orphans. Count drops from 5 (legacy validator.errors count) to
    // 4.
    assert.equal(validation.findings.length, 4);

    const findingMessages = validation.findings.map((finding) => finding.message);

    // Should detect that 'calls' cannot reference a Dependency
    assert.ok(findingMessages.includes("Cannot use 'calls' to reference Dependency 'axios'"));

    // 'User' is no longer orphaned (D-LEG-8) — it is referenced via
    // AuthResponse's DTO field. Negative check, not a positive assertion.
    assert.equal(findingMessages.includes("Orphaned entity 'User'"), false);

    // Should detect that class is not exported by any file
    assert.ok(findingMessages.includes("Class 'AuthService' is not exported by any file"));

    // Should detect that method calls cannot be made on dependencies
    assert.ok(findingMessages.includes("Cannot call method 'post' on Dependency 'axios'. Only Classes and ClassFiles can have methods"));

    // Verify specific finding positions for key validation findings
    const axiosCallFinding = validation.findings.find((finding) =>
      finding.message.includes("Cannot use 'calls' to reference Dependency 'axios'"),
    );
    assert.equal(axiosCallFinding?.span.start.line, 29);
    assert.equal(axiosCallFinding?.span.start.column, 1);

    // No position assertion for 'User' — it is no longer a finding (D-LEG-8).

    const authServiceFinding = validation.findings.find((finding) =>
      finding.message.includes("Class 'AuthService' is not exported by any file"),
    );
    assert.equal(authServiceFinding?.span.start.line, 21);
  });
});
