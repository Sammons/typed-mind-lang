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

describe('scenario-30-invalid-reference-types', () => {
  const scenarioFile = 'scenario-30-invalid-reference-types.tmd';

  it('should validate reference types', async () => {
    const filePath = join(__dirname, '..', 'scenarios', scenarioFile);
    const content = readFileSync(filePath, 'utf-8');

    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });

    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    // AUTHORIZED[A2] (scenario-30-invalid-reference-types.tmd :: new :: L9 ::
    // unparsable text: `-> []`): EntryFile's empty exports continuation is
    // now tolerated as unparsable text rather than a grammar error, but this
    // does not change the finding count (still 3) or any entity below.
    assert.equal(validation.findings.length, 3);
    assert.equal(
      validation.findings.every((finding) => finding.severity === 'error'),
      true,
    );

    // Verify entities are parsed correctly
    const entities = outcome.entities;
    assert.equal(
      entities.some((entity) => entity.name === 'MainFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'EntryFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'UserService'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'createUser'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'UserDTO'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'startApp'),
      true,
    );

    // Verify entity kinds
    const mainFile = entities.find((entity) => entity.name === 'MainFile');
    assert.equal(mainFile?.kind, 'File');

    const entryFile = entities.find((entity) => entity.name === 'EntryFile');
    assert.equal(entryFile?.kind, 'File');

    const userService = entities.find((entity) => entity.name === 'UserService');
    assert.equal(userService?.kind, 'File');

    const createUser = entities.find((entity) => entity.name === 'createUser');
    assert.equal(createUser?.kind, 'Function');

    const userDTO = entities.find((entity) => entity.name === 'UserDTO');
    assert.equal(userDTO?.kind, 'DTO');

    const startApp = entities.find((entity) => entity.name === 'startApp');
    assert.equal(startApp?.kind, 'Function');
  });
});
