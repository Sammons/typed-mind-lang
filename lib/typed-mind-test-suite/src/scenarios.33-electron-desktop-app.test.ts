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

describe('scenario-33-electron-desktop-app', () => {
  const scenarioFile = 'scenario-33-electron-desktop-app.tmd';

  it('should validate Electron desktop application architecture', async () => {
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
      entities.some((entity) => entity.name === 'CodeEditorApp'),
      true,
    );
    const app = entities.find((entity) => entity.name === 'CodeEditorApp' && entity instanceof ProgramNode) as ProgramNode | undefined;
    assert.equal(app?.kind, 'Program');
    assert.equal(app?.entry, 'MainFile');
    assert.equal(app?.version, '3.0.0');

    // Should have main process files
    assert.equal(
      entities.some((entity) => entity.name === 'MainFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'WindowManagerFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'MenuBuilderFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'IPCHandlerFile'),
      true,
    );

    // Should have main process services
    assert.equal(
      entities.some((entity) => entity.name === 'FileSystemFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'GitIntegrationFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'TerminalServiceFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'PluginManagerFile'),
      true,
    );

    // Should have renderer process files
    assert.equal(
      entities.some((entity) => entity.name === 'RendererFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'AppRendererFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'StoreRendererFile'),
      true,
    );

    // Should have UI components
    assert.equal(
      entities.some((entity) => entity.name === 'App'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'TabBar'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'EditorView'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'SidebarView'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'StatusBarView'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'TerminalView'),
      true,
    );

    // Should have editor components
    assert.equal(
      entities.some((entity) => entity.name === 'CodeEditor'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'LineNumbers'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'Minimap'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'FileTree'),
      true,
    );

    // Should have environment variables
    assert.equal(
      entities.some((entity) => entity.name === 'NODE_ENV'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'UPDATE_SERVER_URL'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'ELECTRON_VERSION'),
      true,
    );

    // Check environment variable types
    const nodeEnv = entities.find((entity) => entity.name === 'NODE_ENV' && entity instanceof RunParameterNode) as
      | RunParameterNode
      | undefined;
    assert.equal(nodeEnv?.kind, 'RunParameter');
    assert.equal(nodeEnv?.paramType, 'env');
    assert.equal(nodeEnv?.defaultValue, 'development');

    const electronVersion = entities.find((entity) => entity.name === 'ELECTRON_VERSION' && entity instanceof RunParameterNode) as
      | RunParameterNode
      | undefined;
    assert.equal(electronVersion?.kind, 'RunParameter');
    assert.equal(electronVersion?.paramType, 'runtime');
    assert.equal(electronVersion?.defaultValue, '28.0.0');

    // Should have service classes
    assert.equal(
      entities.some((entity) => entity.name === 'WindowManager'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'FileSystem'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'GitIntegration'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'TerminalService'),
      true,
    );

    // Should have key functions
    assert.equal(
      entities.some((entity) => entity.name === 'createWindow'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'readFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'writeFile'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'getStatus'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'commit'),
      true,
    );

    // Should have DTOs
    assert.equal(
      entities.some((entity) => entity.name === 'WindowOptions'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'FileContent'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'GitStatusResult'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'Terminal'),
      true,
    );

    // Check that key functions consume environment variables
    const createWindowFunc = entities.find((entity) => entity.name === 'createWindow' && entity instanceof FunctionNode) as
      | FunctionNode
      | undefined;
    assert.equal(createWindowFunc?.kind, 'Function');
    assert.ok(createWindowFunc?.consumes?.includes('NODE_ENV'));
    assert.ok(createWindowFunc?.consumes?.includes('ELECTRON_VERSION'));
    assert.ok(createWindowFunc?.consumes?.includes('UPDATE_SERVER_URL'));

    // Should have external dependencies. The legacy `ParseResult.dependencies`
    // Map (DSLChecker-internal call/import graph) keyed every entity by name
    // regardless of kind (index.ts buildDependencyGraph), so `.has(name)` was
    // equivalent to entity presence — checked directly here on the new
    // entity list.
    assert.equal(
      entities.some((entity) => entity.name === 'electron'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'react'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === '@reduxjs/toolkit'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'fs-extra'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'simple-git'),
      true,
    );

    // Verify entity count is reasonable for a full Electron app
    assert.ok(entities.length > 60);
  });
});
