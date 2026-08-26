import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { TypedMind } from '@sammons/typed-mind';
import { ClassNode } from '../../typed-mind/src/ast/class-node.ts';
import { ConstantsNode } from '../../typed-mind/src/ast/constants-node.ts';
import { DtoNode } from '../../typed-mind/src/ast/dto-node.ts';
import { FileNode } from '../../typed-mind/src/ast/file-node.ts';
import { FunctionNode } from '../../typed-mind/src/ast/function-node.ts';
import { ProgramNode } from '../../typed-mind/src/ast/program-node.ts';
import { RunParameterNode } from '../../typed-mind/src/ast/run-parameter-node.ts';
import { UiComponentNode } from '../../typed-mind/src/ast/ui-component-node.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('scenario-31-mixed-syntax', () => {
  it('should parse mixed longform and shortform syntax correctly', async () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-31-mixed-syntax.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');

    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const parsed = parser.parse(content);
    const entities = parsed.entities;

    // Should have both programs
    assert.equal(
      entities.some((entity) => entity.name === 'TodoApp'),
      true,
    );
    assert.equal(
      entities.some((entity) => entity.name === 'APIServer'),
      true,
    );

    // Check shortform program (TodoApp -> AppEntry v1.0.0)
    const todoApp = entities.find((entity) => entity.name === 'TodoApp' && entity instanceof ProgramNode) as ProgramNode | undefined;
    assert.equal(todoApp?.kind, 'Program');
    assert.equal(todoApp?.entry, 'AppEntry');
    assert.equal(todoApp?.version, '1.0.0');

    // Check longform program
    const apiServer = entities.find((entity) => entity.name === 'APIServer' && entity instanceof ProgramNode) as ProgramNode | undefined;
    assert.equal(apiServer?.kind, 'Program');
    assert.equal(apiServer?.entry, 'ApiMain');
    assert.equal(apiServer?.version, '2.0.0');

    // Check shortform file (AppEntry @ src/app.ts)
    const appEntry = entities.find((entity) => entity.name === 'AppEntry' && entity instanceof FileNode) as FileNode | undefined;
    assert.equal(appEntry?.kind, 'File');
    assert.equal(appEntry?.path, 'src/app.ts');
    assert.deepEqual(appEntry?.imports, ['Express']);
    assert.deepEqual(appEntry?.exports, ['startApp']);

    // Check longform file
    const apiMain = entities.find((entity) => entity.name === 'ApiMain' && entity instanceof FileNode) as FileNode | undefined;
    assert.equal(apiMain?.kind, 'File');
    assert.equal(apiMain?.path, 'src/api.ts');
    assert.deepEqual(apiMain?.imports, ['Fastify', 'Database']);
    assert.deepEqual(apiMain?.exports, ['startApi']);

    // Check shortform function (createTodo :: (data: TodoDTO) => Todo)
    const createTodo = entities.find((entity) => entity.name === 'createTodo' && entity instanceof FunctionNode) as
      | FunctionNode
      | undefined;
    assert.equal(createTodo?.kind, 'Function');
    assert.equal(createTodo?.signature, '(data: TodoDTO) => Todo');
    assert.deepEqual(createTodo?.calls, ['validate', 'save']);

    // Check longform function
    const deleteTodo = entities.find((entity) => entity.name === 'deleteTodo' && entity instanceof FunctionNode) as
      | FunctionNode
      | undefined;
    assert.equal(deleteTodo?.kind, 'Function');
    assert.equal(deleteTodo?.signature, '(id: string) => void');
    assert.deepEqual(deleteTodo?.calls, ['Database.delete']);

    // Check shortform DTO (TodoDTO % "Todo input data")
    const todoDTO = entities.find((entity) => entity.name === 'TodoDTO' && entity instanceof DtoNode) as DtoNode | undefined;
    assert.equal(todoDTO?.kind, 'DTO');
    assert.equal(todoDTO?.purpose, 'Todo input data');
    assert.equal(todoDTO?.fields.length, 2);
    assert.deepEqual(
      todoDTO?.fields.map((field) => ({ name: field.name, type: field.type, description: field.description, optional: field.isOptional })),
      [
        { name: 'title', type: 'string', description: undefined, optional: false },
        { name: 'done', type: 'boolean', description: undefined, optional: false },
      ],
    );

    // Check longform DTO
    const userDTO = entities.find((entity) => entity.name === 'UserDTO' && entity instanceof DtoNode) as DtoNode | undefined;
    assert.equal(userDTO?.kind, 'DTO');
    assert.equal(userDTO?.purpose, 'User data');
    assert.equal(userDTO?.fields.length, 2);
    // Not an A1-A11 amendment-table delta (no entry for scenario-31 in
    // shadow-verdict-full.log; the checker's verdict multiset is unchanged).
    // This is a field-value fidelity fix, not a verdict move: the .tmd source
    // declares `type: "string"` for both fields (scenario-31-mixed-syntax.tmd
    // lines 41-42, the single-line nested-object DTO field form); the legacy
    // longform-parser.ts's isDTOFieldDefinition/parseNestedObject path drops
    // the declared type on that specific single-line shape and falls back to
    // the `type: fieldDef.type || 'any'` default (longform-parser.ts:249) —
    // a confirmed legacy bug, verified by reading the parser directly. The
    // new parser reads the declared type verbatim and correctly reports
    // 'string' for both fields.
    assert.deepEqual(
      userDTO?.fields.map((field) => ({ name: field.name, type: field.type, optional: field.isOptional })),
      [
        { name: 'name', type: 'string', optional: false },
        { name: 'email', type: 'string', optional: false },
      ],
    );

    // Check shortform UIComponent (Button & "Reusable button")
    const button = entities.find((entity) => entity.name === 'Button' && entity instanceof UiComponentNode) as UiComponentNode | undefined;
    assert.equal(button?.kind, 'UIComponent');
    assert.equal(button?.purpose, 'Reusable button');

    // Check longform UIComponent
    const userProfile = entities.find((entity) => entity.name === 'UserProfile' && entity instanceof UiComponentNode) as
      | UiComponentNode
      | undefined;
    assert.equal(userProfile?.kind, 'UIComponent');
    assert.equal(userProfile?.purpose, 'User profile display');
    assert.deepEqual(userProfile?.contains, ['Button']);
    assert.deepEqual(userProfile?.declaredAffectedBy, ['updateProfile']);

    // Check shortform RunParameter (DATABASE_URL $env "Database connection")
    const dbUrl = entities.find((entity) => entity.name === 'DATABASE_URL' && entity instanceof RunParameterNode) as
      | RunParameterNode
      | undefined;
    assert.equal(dbUrl?.kind, 'RunParameter');
    assert.equal(dbUrl?.paramType, 'env');
    assert.equal(dbUrl?.description, 'Database connection');

    // Check longform RunParameter
    const apiKey = entities.find((entity) => entity.name === 'API_KEY' && entity instanceof RunParameterNode) as
      | RunParameterNode
      | undefined;
    assert.equal(apiKey?.kind, 'RunParameter');
    assert.equal(apiKey?.paramType, 'env');
    assert.equal(apiKey?.description, 'API key');
    assert.equal(apiKey?.defaultValue, 'dev-key');

    // Check function that consumes parameters
    const updateProfile = entities.find((entity) => entity.name === 'updateProfile' && entity instanceof FunctionNode) as
      | FunctionNode
      | undefined;
    assert.equal(updateProfile?.kind, 'Function');
    assert.equal(updateProfile?.signature, '(data: UserDTO) => void');
    assert.deepEqual(updateProfile?.consumes, ['DATABASE_URL', 'API_KEY']);
    assert.deepEqual(updateProfile?.affects, ['UserProfile']);

    // Check that all expected entities were parsed
    assert.equal(entities.length, 20); // Specific count based on the scenario

    // Verify supporting entities
    assert.equal(entities.find((entity) => entity.name === 'Express' && entity instanceof ConstantsNode)?.kind, 'Constants');
    assert.equal(entities.find((entity) => entity.name === 'Fastify' && entity instanceof ConstantsNode)?.kind, 'Constants');
    assert.equal(entities.find((entity) => entity.name === 'Database' && entity instanceof ClassNode)?.kind, 'Class');
    assert.equal(entities.find((entity) => entity.name === 'validate' && entity instanceof FunctionNode)?.kind, 'Function');
    assert.equal(entities.find((entity) => entity.name === 'save' && entity instanceof FunctionNode)?.kind, 'Function');
    assert.equal(entities.find((entity) => entity.name === 'startApp' && entity instanceof FunctionNode)?.kind, 'Function');
    assert.equal(entities.find((entity) => entity.name === 'startApi' && entity instanceof FunctionNode)?.kind, 'Function');
  });

  it('should fail validation due to orphaned entities', async () => {
    const scenarioPath = join(__dirname, '../scenarios/scenario-31-mixed-syntax.tmd');
    const content = readFileSync(scenarioPath, 'utf-8');

    const typedMind = await TypedMind.create();
    const result = typedMind.check(content, scenarioPath);

    // Should fail validation due to orphaned entities
    assert.equal(result.valid, false);
    assert.equal(result.diagnostics.length, 15);

    // Check for orphaned entity diagnostics
    const orphanedDiagnostics = result.diagnostics.filter((diagnostic) => diagnostic.message.startsWith('Orphaned entity'));
    assert.equal(orphanedDiagnostics.length, 8);

    const orphanedEntities = ['createTodo', 'deleteTodo', 'TodoDTO', 'UserDTO', 'UserProfile', 'updateProfile', 'startApp', 'startApi'];
    orphanedEntities.forEach((entityName) => {
      const diagnostic = orphanedDiagnostics.find((d) => d.message === `Orphaned entity '${entityName}'`);
      assert.notEqual(diagnostic, undefined);
      assert.equal(diagnostic?.severity, 'error');
    });

    // Check for function not exported diagnostics
    const functionNotExportedDiagnostics = result.diagnostics.filter((diagnostic) =>
      diagnostic.message.includes('is not exported by any file and is not a class method'),
    );
    assert.equal(functionNotExportedDiagnostics.length, 5);

    const unexportedFunctions = ['createTodo', 'deleteTodo', 'updateProfile', 'validate', 'save'];
    unexportedFunctions.forEach((funcName) => {
      const diagnostic = functionNotExportedDiagnostics.find((d) => d.message.includes(`Function '${funcName}'`));
      assert.notEqual(diagnostic, undefined);
      assert.equal(diagnostic?.severity, 'error');
    });

    // Check for class not exported diagnostic
    const classNotExportedDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "Class 'Database' is not exported by any file",
    );
    assert.notEqual(classNotExportedDiagnostic, undefined);
    assert.equal(classNotExportedDiagnostic?.severity, 'error');
    assert.equal(classNotExportedDiagnostic?.span.start.line, 74);

    // Check for UIComponent not contained diagnostic
    const uiComponentDiagnostic = result.diagnostics.find(
      (diagnostic) => diagnostic.message === "UIComponent 'UserProfile' is not contained by any other UIComponent",
    );
    assert.notEqual(uiComponentDiagnostic, undefined);
    assert.equal(uiComponentDiagnostic?.severity, 'error');
    assert.equal(uiComponentDiagnostic?.span.start.line, 49);
  });
});
