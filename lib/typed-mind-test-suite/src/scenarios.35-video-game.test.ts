import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';
import { FunctionNode } from '../../typed-mind/src/ast/function-node.ts';
import { ProgramNode } from '../../typed-mind/src/ast/program-node.ts';
import { RunParameterNode } from '../../typed-mind/src/ast/run-parameter-node.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-35-video-game', () => {
  const scenarioFile = 'scenario-35-video-game.tmd';

  it('should validate video game architecture', async () => {
    const typedMind = await TypedMind.create();
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = typedMind.check(content);

    // Get parsed entities using the source-graph parser directly, so the
    // concrete AST node classes used for narrowing below come from the same
    // module instance as the entities themselves — `@sammons/typed-mind`'s
    // TypedMind facade resolves through the compiled `dist/` build, a
    // distinct module graph from `src/ast/*-node.ts`.
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const parsed = parser.parse(content);
    const entities = parsed.entities;

    // Should be invalid due to orphaned entities
    assert.equal(result.valid, false);
    assert.ok(result.diagnostics.length > 0);

    // Should have the main program
    assert.equal(
      entities.some((entity) => entity.name === 'DragonQuestRPG'),
      true,
    );
    const app = entities.find((entity) => entity.name === 'DragonQuestRPG' && entity instanceof ProgramNode) as ProgramNode | undefined;
    assert.equal(app?.kind, 'Program');
    assert.equal(app?.entry, 'MainFile');
    assert.equal(app?.version, '1.0.0');

    // Should have core game system files
    assert.equal(
      entities.some((entity) => entity.name === 'MainFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'SceneManagerFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'InputManagerFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'PlayerSystemFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'CombatSystemFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'AISystemFile'),
      true,
    );

    // Should have world and gameplay systems
    assert.equal(
      entities.some((entity) => entity.name === 'WorldManagerFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'QuestSystemFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'NPCSystemFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'InventorySystemFile'),
      true,
    );

    // Should have networking
    assert.equal(
      entities.some((entity) => entity.name === 'NetworkManagerFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'MultiplayerSyncFile'),
      true,
    );

    // Should have UI systems
    assert.equal(
      entities.some((entity) => entity.name === 'UIManagerFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'HUDFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'MenuSystemFile'),
      true,
    );

    // Should have audio and graphics
    assert.equal(
      entities.some((entity) => entity.name === 'AudioManagerFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'RenderingManagerFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'VFXManagerFile'),
      true,
    );

    // Should have save system
    assert.equal(
      entities.some((entity) => entity.name === 'SaveSystemFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'ResourceManagerFile'),
      true,
    );

    // Should have UI components
    assert.equal(
      entities.some((entity) => entity.name === 'MainMenu'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'HUD'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'PauseMenu'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'InventoryUI'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'QuestLog'),
      true,
    );

    // Should have environment variables
    assert.equal(
      entities.some((entity) => entity.name === 'UNITY_VERSION'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'PHOTON_APP_ID'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'BUILD_TARGET'),
      true,
    );

    // Check environment variable types
    const unityVersion = entities.find((entity) => entity.name === 'UNITY_VERSION' && entity instanceof RunParameterNode) as
      | RunParameterNode
      | undefined;
    assert.equal(unityVersion?.kind, 'RunParameter');
    assert.equal(unityVersion?.paramType, 'env');
    assert.equal(unityVersion?.required, true);
    assert.equal(unityVersion?.defaultValue, '2023.2.1f1');

    const photonAppId = entities.find((entity) => entity.name === 'PHOTON_APP_ID' && entity instanceof RunParameterNode) as
      | RunParameterNode
      | undefined;
    assert.equal(photonAppId?.kind, 'RunParameter');
    assert.equal(photonAppId?.paramType, 'env');
    assert.equal(photonAppId?.required, true);

    // Should have service classes
    assert.equal(
      entities.some((entity) => entity.name === 'GameManager'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'SceneManager'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'PlayerController'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'CombatSystem'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'AIController'),
      true,
    );

    // Should have key functions
    assert.equal(
      entities.some((entity) => entity.name === 'StartGame'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'PauseGame'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'LoadScene'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'Attack'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'UseSkill'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'SaveGame'),
      true,
    );

    // Should have DTOs
    assert.equal(
      entities.some((entity) => entity.name === 'GameState'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'PlayerStats'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'Vector3'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'GameObject'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'Item'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'Quest'),
      true,
    );

    // Check that key functions consume environment variables
    const connectFunc = entities.find((entity) => entity.name === 'Connect' && entity instanceof FunctionNode) as FunctionNode | undefined;
    assert.equal(connectFunc?.kind, 'Function');
    assert.ok(connectFunc?.consumes?.includes('PHOTON_APP_ID'));

    const initializeFunc = entities.find((entity) => entity.name === 'Initialize' && entity instanceof FunctionNode) as
      | FunctionNode
      | undefined;
    assert.equal(initializeFunc?.kind, 'Function');
    assert.ok(initializeFunc?.consumes?.includes('UNITY_VERSION'));
    assert.ok(initializeFunc?.consumes?.includes('BUILD_TARGET'));

    // Check game-specific functionality
    const useSkillFunc = entities.find((entity) => entity.name === 'UseSkill' && entity instanceof FunctionNode) as
      | FunctionNode
      | undefined;
    assert.equal(useSkillFunc?.kind, 'Function');
    assert.ok(useSkillFunc?.consumes?.includes('ENABLE_MODDING'));
    assert.ok(useSkillFunc?.affects?.includes('SkillBar'));
    assert.ok(useSkillFunc?.affects?.includes('ManaBar'));

    // Should have AI subclasses
    assert.equal(
      entities.some((entity) => entity.name === 'EnemyAI'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'CompanionAI'),
      true,
    );

    // Verify entity count is reasonable for a full game
    assert.ok(entities.length > 90);
  });
});
