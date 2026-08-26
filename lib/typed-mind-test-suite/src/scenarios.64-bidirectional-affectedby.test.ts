import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { FunctionNode } from '../../typed-mind/src/ast/function-node.ts';
import { UiComponentNode } from '../../typed-mind/src/ast/ui-component-node.ts';
import { AstValidator } from '../../typed-mind/src/checker/ast-validator.ts';
import { computeLinks } from '../../typed-mind/src/pipeline/link-index.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Note (S-TEST-1, scenario-64): legacy exposed `UIComponent.affectedBy` as a
// per-entity array of Function names. `UiComponentNode` on the new surface
// carries only `declaredAffectedBy` (the author's `~ [...]` claim) — the
// derived reverse relationship now lives on `LinkIndex.affectedBy(name)`,
// which returns `readonly string[]` (plain names, no verb/kind dimension —
// unlike `LinkIndex.referencedBy`, there is no precision loss here since
// legacy's `affectedBy` was always a bare name array). All assertions below
// use `links.affectedBy(name)` in place of `entity.affectedBy`.

describe('Scenario 64: Bidirectional affectedBy for UIComponents', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-64-bidirectional-affectedby.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');

  it('should automatically populate UIComponent.affectedBy when Function affects it', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);

    // Check UserList.affectedBy
    const userList = outcome.entities.find((e): e is UiComponentNode => e instanceof UiComponentNode && e.name === 'UserList');

    assert.notEqual(userList, undefined);
    const userListAffectedBy = links.affectedBy('UserList');
    assert.notEqual(userListAffectedBy, undefined);
    assert.ok(userListAffectedBy.includes('updateUserList'));
    assert.ok(userListAffectedBy.includes('refreshDashboard'));
    assert.equal(userListAffectedBy.length, 2);
  });

  it('should handle multiple functions affecting the same UIComponent', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);

    // UserList is affected by both updateUserList and refreshDashboard
    const userListAffectedBy = links.affectedBy('UserList');

    for (const expected of ['updateUserList', 'refreshDashboard']) {
      assert.ok(userListAffectedBy.includes(expected));
    }
  });

  it('should handle single function affecting UIComponent', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);

    // Button is only affected by handleClick
    const button = outcome.entities.find((e): e is UiComponentNode => e instanceof UiComponentNode && e.name === 'Button');

    assert.notEqual(button, undefined);
    assert.deepEqual(links.affectedBy('Button'), ['handleClick']);
  });

  it('should handle UIComponent with no affecting functions', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);

    // Footer has no functions affecting it
    const footer = outcome.entities.find((e): e is UiComponentNode => e instanceof UiComponentNode && e.name === 'Footer');

    assert.notEqual(footer, undefined);
    assert.deepEqual(links.affectedBy('Footer'), []);
  });

  it('should maintain consistency between Function.affects and UIComponent.affectedBy', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);

    // Check that relationships are bidirectional
    const updateUserList = outcome.entities.find((e): e is FunctionNode => e instanceof FunctionNode && e.name === 'updateUserList');

    assert.ok(updateUserList?.affects?.includes('UserList'));
    assert.ok(links.affectedBy('UserList').includes('updateUserList'));
  });

  it('should validate without errors when bidirectional relationships are correct', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    // Should not have any validation errors about missing affectedBy
    const affectedByErrors = validation.findings.filter((e) => e.message.includes('affectedBy'));

    assert.deepEqual(affectedByErrors, []);
  });

  it('should handle root UIComponent with affectedBy', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);

    // Dashboard is a root component but still can be affected
    const dashboard = outcome.entities.find((e): e is UiComponentNode => e instanceof UiComponentNode && e.name === 'Dashboard');

    assert.notEqual(dashboard, undefined);
    assert.equal(dashboard?.root, true);
    assert.deepEqual(links.affectedBy('Dashboard'), ['refreshDashboard']);
  });
});
