import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { UiComponentNode } from '../../typed-mind/src/ast/ui-component-node.ts';
import { AstValidator } from '../../typed-mind/src/checker/ast-validator.ts';
import { computeLinks } from '../../typed-mind/src/pipeline/link-index.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Note (S-TEST-1, scenario-66): legacy exposed `UIComponent.containedBy` as a
// per-entity array of parent names. `UiComponentNode` carries only
// `declaredContainedBy` (the author's `< [...]` claim) on the new surface —
// the derived reverse relationship now lives on `LinkIndex.containedBy(name)`,
// which returns `readonly string[]` (plain names, no verb/kind dimension —
// same as scenarios 64/65, no precision loss versus legacy). All assertions
// below use `links.containedBy(name)` in place of `entity.containedBy`.

describe('Scenario 66: Bidirectional containedBy for UIComponents', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-66-bidirectional-containedby.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');

  it('should automatically populate UIComponent.containedBy when parent contains it', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);

    // Check Header.containedBy
    const header = outcome.entities.find((e): e is UiComponentNode => e instanceof UiComponentNode && e.name === 'Header');

    assert.notEqual(header, undefined);
    const headerContainedBy = links.containedBy('Header');
    assert.notEqual(headerContainedBy, undefined);
    assert.deepEqual(headerContainedBy, ['App']);
  });

  it('should handle nested containment hierarchy', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);

    // Check multi-level nesting: App > Header > NavBar > NavItem1
    assert.deepEqual(links.containedBy('NavItem1'), ['NavBar']);
    assert.deepEqual(links.containedBy('NavBar'), ['Header']);
    assert.deepEqual(links.containedBy('Header'), ['App']);
  });

  it('should handle multiple children with same parent', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);

    // App contains Header, MainContent, Footer
    assert.deepEqual(links.containedBy('Header'), ['App']);
    assert.deepEqual(links.containedBy('MainContent'), ['App']);
    assert.deepEqual(links.containedBy('Footer'), ['App']);
  });

  it('should handle root component without containedBy', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);

    // App is root, should not have containedBy
    const app = outcome.entities.find((e): e is UiComponentNode => e instanceof UiComponentNode && e.name === 'App');

    assert.notEqual(app, undefined);
    assert.equal(app?.root, true);
    assert.deepEqual(links.containedBy('App'), []);
  });

  it('should handle orphan component without parent', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);

    // OrphanComponent has no parent
    const orphan = outcome.entities.find((e): e is UiComponentNode => e instanceof UiComponentNode && e.name === 'OrphanComponent');

    assert.notEqual(orphan, undefined);
    assert.deepEqual(links.containedBy('OrphanComponent'), []);
  });

  it('should maintain consistency between contains and containedBy', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);

    // Check bidirectional relationship
    const navBar = outcome.entities.find((e): e is UiComponentNode => e instanceof UiComponentNode && e.name === 'NavBar');

    assert.ok(navBar?.contains?.includes('NavItem1'));
    assert.ok(navBar?.contains?.includes('NavItem2'));
    assert.deepEqual(links.containedBy('NavItem1'), ['NavBar']);
    assert.deepEqual(links.containedBy('NavItem2'), ['NavBar']);
  });

  it('should handle complex nested structure', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);

    // MainContent > ContentArea > Article
    const contentArea = outcome.entities.find((e): e is UiComponentNode => e instanceof UiComponentNode && e.name === 'ContentArea');

    assert.deepEqual(links.containedBy('Article'), ['ContentArea']);
    assert.deepEqual(links.containedBy('ContentArea'), ['MainContent']);
    assert.ok(contentArea?.contains?.includes('Article'));
  });

  it('should handle component that contains but is not contained', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);

    // FloatingPanel contains CloseButton but is not contained by anything
    const floatingPanel = outcome.entities.find((e): e is UiComponentNode => e instanceof UiComponentNode && e.name === 'FloatingPanel');

    assert.deepEqual(floatingPanel?.contains, ['CloseButton']);
    assert.deepEqual(links.containedBy('FloatingPanel'), []);
    assert.deepEqual(links.containedBy('CloseButton'), ['FloatingPanel']);
  });

  it('should validate without errors when bidirectional relationships are correct', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    // Should not have any validation errors about missing containedBy
    const containedByErrors = validation.findings.filter((e) => e.message.includes('containedBy'));

    assert.deepEqual(containedByErrors, []);
  });
});
