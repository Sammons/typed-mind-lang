import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { it } from 'node:test';
import { FunctionNode } from '../../typed-mind/src/ast/function-node.ts';
import { CheckContext } from '../../typed-mind/src/checker/check-context.ts';
import { checkOrphans } from '../../typed-mind/src/checker/check-orphans.ts';
import { computeLinks } from '../../typed-mind/src/pipeline/link-index.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const cases = [
  ['scenario-34-cli-tool', ['cli', 'taskRunner', 'taskRegistry', 'dependencyResolver', 'taskScheduler', 'schemaValidator', 'workerPool']],
  [
    'scenario-35-video-game',
    [
      'GameManager',
      'SceneManager',
      'CombatSystem',
      'AIController',
      'InventorySystem',
      'WorldManager',
      'QuestManager',
      'NPCManager',
      'NetworkManager',
      'AudioManager',
      'SaveSystem',
      'ResourceManager',
      'RenderingManager',
    ],
  ],
] as const;

for (const [scenario, owners] of cases) {
  it(`TM13 Q: removing method references restores exactly the owner orphan multiset: ${scenario}`, async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(readFileSync(join(import.meta.dirname, '../scenarios', `${scenario}.tmd`), 'utf8'));
    const withoutCalls = outcome.entities.map((entity) =>
      entity instanceof FunctionNode
        ? new FunctionNode({
            name: entity.name,
            span: entity.span,
            raw: entity.raw,
            sourceForm: entity.sourceForm,
            signature: entity.signature,
            pendingDependencies: entity.pendingDependencies,
            ...(entity.comment === undefined ? {} : { comment: entity.comment }),
            ...(entity.description === undefined ? {} : { description: entity.description }),
            ...(entity.input === undefined ? {} : { input: entity.input }),
            ...(entity.output === undefined ? {} : { output: entity.output }),
            ...(entity.affects === undefined ? {} : { affects: entity.affects }),
            ...(entity.consumes === undefined ? {} : { consumes: entity.consumes }),
            calls: entity.calls.filter((call) => !owners.some((owner) => call.startsWith(`${owner}.`))),
          })
        : entity,
    );
    const actual = new CheckContext({ entities: outcome.entities, links: computeLinks(outcome.entities), parseDiagnostics: [] });
    const control = new CheckContext({ entities: withoutCalls, links: computeLinks(withoutCalls), parseDiagnostics: [] });
    checkOrphans(actual);
    checkOrphans(control);
    // AIController remains consumed by EnemyAI/CompanionAI heritage after calls are removed.
    // generic-heritage-corpus-deltas.test.ts independently removes those bases.
    assert.deepEqual(
      control.findings.map((finding) => finding.message).sort(),
      [
        ...actual.findings.map((finding) => finding.message),
        ...owners.filter((owner) => owner !== 'AIController').map((owner) => `Orphaned entity '${owner}'`),
      ].sort(),
    );
  });
}
