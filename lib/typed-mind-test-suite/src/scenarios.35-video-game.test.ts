import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-35-video-game', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-35-video-game.tmd';

  it('should validate video game architecture', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);
    const parsed = checker.parse(content);

    // Should be invalid due to orphaned entities
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);

    // Should have the main program
    assert.equal(parsed.entities.has('DragonQuestRPG'), true);
    const app = parsed.entities.get('DragonQuestRPG');
    assert.equal(app?.type, 'Program');
    if (app?.type === 'Program') {
      assert.equal(app.entry, 'MainFile');
      assert.equal(app.version, '1.0.0');
    }

    // Should have core game system files
    assert.equal(parsed.entities.has('MainFile'), true);
    assert.equal(parsed.entities.has('SceneManagerFile'), true);
    assert.equal(parsed.entities.has('InputManagerFile'), true);
    assert.equal(parsed.entities.has('PlayerSystemFile'), true);
    assert.equal(parsed.entities.has('CombatSystemFile'), true);
    assert.equal(parsed.entities.has('AISystemFile'), true);

    // Should have world and gameplay systems
    assert.equal(parsed.entities.has('WorldManagerFile'), true);
    assert.equal(parsed.entities.has('QuestSystemFile'), true);
    assert.equal(parsed.entities.has('NPCSystemFile'), true);
    assert.equal(parsed.entities.has('InventorySystemFile'), true);

    // Should have networking
    assert.equal(parsed.entities.has('NetworkManagerFile'), true);
    assert.equal(parsed.entities.has('MultiplayerSyncFile'), true);

    // Should have UI systems
    assert.equal(parsed.entities.has('UIManagerFile'), true);
    assert.equal(parsed.entities.has('HUDFile'), true);
    assert.equal(parsed.entities.has('MenuSystemFile'), true);

    // Should have audio and graphics
    assert.equal(parsed.entities.has('AudioManagerFile'), true);
    assert.equal(parsed.entities.has('RenderingManagerFile'), true);
    assert.equal(parsed.entities.has('VFXManagerFile'), true);

    // Should have save system
    assert.equal(parsed.entities.has('SaveSystemFile'), true);
    assert.equal(parsed.entities.has('ResourceManagerFile'), true);

    // Should have UI components
    assert.equal(parsed.entities.has('MainMenu'), true);
    assert.equal(parsed.entities.has('HUD'), true);
    assert.equal(parsed.entities.has('PauseMenu'), true);
    assert.equal(parsed.entities.has('InventoryUI'), true);
    assert.equal(parsed.entities.has('QuestLog'), true);

    // Should have environment variables
    assert.equal(parsed.entities.has('UNITY_VERSION'), true);
    assert.equal(parsed.entities.has('PHOTON_APP_ID'), true);
    assert.equal(parsed.entities.has('BUILD_TARGET'), true);

    // Check environment variable types
    const unityVersion = parsed.entities.get('UNITY_VERSION');
    assert.equal(unityVersion?.type, 'RunParameter');
    if (unityVersion?.type === 'RunParameter') {
      assert.equal(unityVersion.paramType, 'env');
      assert.equal(unityVersion.required, true);
      assert.equal(unityVersion.defaultValue, '2023.2.1f1');
    }

    const photonAppId = parsed.entities.get('PHOTON_APP_ID');
    assert.equal(photonAppId?.type, 'RunParameter');
    if (photonAppId?.type === 'RunParameter') {
      assert.equal(photonAppId.paramType, 'env');
      assert.equal(photonAppId.required, true);
    }

    // Should have service classes
    assert.equal(parsed.entities.has('GameManager'), true);
    assert.equal(parsed.entities.has('SceneManager'), true);
    assert.equal(parsed.entities.has('PlayerController'), true);
    assert.equal(parsed.entities.has('CombatSystem'), true);
    assert.equal(parsed.entities.has('AIController'), true);

    // Should have key functions
    assert.equal(parsed.entities.has('StartGame'), true);
    assert.equal(parsed.entities.has('PauseGame'), true);
    assert.equal(parsed.entities.has('LoadScene'), true);
    assert.equal(parsed.entities.has('Attack'), true);
    assert.equal(parsed.entities.has('UseSkill'), true);
    assert.equal(parsed.entities.has('SaveGame'), true);

    // Should have DTOs
    assert.equal(parsed.entities.has('GameState'), true);
    assert.equal(parsed.entities.has('PlayerStats'), true);
    assert.equal(parsed.entities.has('Vector3'), true);
    assert.equal(parsed.entities.has('GameObject'), true);
    assert.equal(parsed.entities.has('Item'), true);
    assert.equal(parsed.entities.has('Quest'), true);

    // Check that key functions consume environment variables
    const connectFunc = parsed.entities.get('Connect');
    assert.equal(connectFunc?.type, 'Function');
    if (connectFunc?.type === 'Function') {
      assert.ok(connectFunc.consumes.includes('PHOTON_APP_ID'));
    }

    const initializeFunc = parsed.entities.get('Initialize');
    assert.equal(initializeFunc?.type, 'Function');
    if (initializeFunc?.type === 'Function') {
      assert.ok(initializeFunc.consumes.includes('UNITY_VERSION'));
      assert.ok(initializeFunc.consumes.includes('BUILD_TARGET'));
    }

    // Check game-specific functionality
    const useSkillFunc = parsed.entities.get('UseSkill');
    assert.equal(useSkillFunc?.type, 'Function');
    if (useSkillFunc?.type === 'Function') {
      assert.ok(useSkillFunc.consumes.includes('ENABLE_MODDING'));
      assert.ok(useSkillFunc.affects.includes('SkillBar'));
      assert.ok(useSkillFunc.affects.includes('ManaBar'));
    }

    // Should have AI subclasses
    assert.equal(parsed.entities.has('EnemyAI'), true);
    assert.equal(parsed.entities.has('CompanionAI'), true);

    // Verify entity count is reasonable for a full game
    assert.ok(parsed.entities.size > 90);
  });
});
