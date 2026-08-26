import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DSLChecker } from '@sammons/typed-mind';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-33-electron-desktop-app', () => {
  const checker = new DSLChecker();
  const scenarioFile = 'scenario-33-electron-desktop-app.tmd';

  it('should validate Electron desktop application architecture', () => {
    const content = readFileSync(join(__dirname, '..', 'scenarios', scenarioFile), 'utf-8');
    const result = checker.check(content);
    const parsed = checker.parse(content);

    // Should be invalid due to orphaned entities
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);

    // Should have the main program
    assert.equal(parsed.entities.has('CodeEditorApp'), true);
    const app = parsed.entities.get('CodeEditorApp');
    assert.equal(app?.type, 'Program');
    if (app?.type === 'Program') {
      assert.equal(app.entry, 'MainFile');
      assert.equal(app.version, '3.0.0');
    }

    // Should have main process files
    assert.equal(parsed.entities.has('MainFile'), true);
    assert.equal(parsed.entities.has('WindowManagerFile'), true);
    assert.equal(parsed.entities.has('MenuBuilderFile'), true);
    assert.equal(parsed.entities.has('IPCHandlerFile'), true);

    // Should have main process services
    assert.equal(parsed.entities.has('FileSystemFile'), true);
    assert.equal(parsed.entities.has('GitIntegrationFile'), true);
    assert.equal(parsed.entities.has('TerminalServiceFile'), true);
    assert.equal(parsed.entities.has('PluginManagerFile'), true);

    // Should have renderer process files
    assert.equal(parsed.entities.has('RendererFile'), true);
    assert.equal(parsed.entities.has('AppRendererFile'), true);
    assert.equal(parsed.entities.has('StoreRendererFile'), true);

    // Should have UI components
    assert.equal(parsed.entities.has('App'), true);
    assert.equal(parsed.entities.has('TabBar'), true);
    assert.equal(parsed.entities.has('EditorView'), true);
    assert.equal(parsed.entities.has('SidebarView'), true);
    assert.equal(parsed.entities.has('StatusBarView'), true);
    assert.equal(parsed.entities.has('TerminalView'), true);

    // Should have editor components
    assert.equal(parsed.entities.has('CodeEditor'), true);
    assert.equal(parsed.entities.has('LineNumbers'), true);
    assert.equal(parsed.entities.has('Minimap'), true);
    assert.equal(parsed.entities.has('FileTree'), true);

    // Should have environment variables
    assert.equal(parsed.entities.has('NODE_ENV'), true);
    assert.equal(parsed.entities.has('UPDATE_SERVER_URL'), true);
    assert.equal(parsed.entities.has('ELECTRON_VERSION'), true);

    // Check environment variable types
    const nodeEnv = parsed.entities.get('NODE_ENV');
    assert.equal(nodeEnv?.type, 'RunParameter');
    if (nodeEnv?.type === 'RunParameter') {
      assert.equal(nodeEnv.paramType, 'env');
      assert.equal(nodeEnv.defaultValue, 'development');
    }

    const electronVersion = parsed.entities.get('ELECTRON_VERSION');
    assert.equal(electronVersion?.type, 'RunParameter');
    if (electronVersion?.type === 'RunParameter') {
      assert.equal(electronVersion.paramType, 'runtime');
      assert.equal(electronVersion.defaultValue, '28.0.0');
    }

    // Should have service classes
    assert.equal(parsed.entities.has('WindowManager'), true);
    assert.equal(parsed.entities.has('FileSystem'), true);
    assert.equal(parsed.entities.has('GitIntegration'), true);
    assert.equal(parsed.entities.has('TerminalService'), true);

    // Should have key functions
    assert.equal(parsed.entities.has('createWindow'), true);
    assert.equal(parsed.entities.has('readFile'), true);
    assert.equal(parsed.entities.has('writeFile'), true);
    assert.equal(parsed.entities.has('getStatus'), true);
    assert.equal(parsed.entities.has('commit'), true);

    // Should have DTOs
    assert.equal(parsed.entities.has('WindowOptions'), true);
    assert.equal(parsed.entities.has('FileContent'), true);
    assert.equal(parsed.entities.has('GitStatusResult'), true);
    assert.equal(parsed.entities.has('Terminal'), true);

    // Check that key functions consume environment variables
    const createWindowFunc = parsed.entities.get('createWindow');
    assert.equal(createWindowFunc?.type, 'Function');
    if (createWindowFunc?.type === 'Function') {
      assert.ok(createWindowFunc.consumes.includes('NODE_ENV'));
      assert.ok(createWindowFunc.consumes.includes('ELECTRON_VERSION'));
      assert.ok(createWindowFunc.consumes.includes('UPDATE_SERVER_URL'));
    }

    // Should have external dependencies
    assert.equal(parsed.dependencies.has('electron'), true);
    assert.equal(parsed.dependencies.has('react'), true);
    assert.equal(parsed.dependencies.has('@reduxjs/toolkit'), true);
    assert.equal(parsed.dependencies.has('fs-extra'), true);
    assert.equal(parsed.dependencies.has('simple-git'), true);

    // Verify entity count is reasonable for a full Electron app
    assert.ok(parsed.entities.size > 60);
  });
});
