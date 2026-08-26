// RFC-TM-3 §5 Q2 (rfc-tm-3-diamond.md) — construction-site unit tests for the
// eleven semantic classes: for each class, one test constructing the shape a
// shortform declaration produces and one constructing the shape a longform
// block produces (§2.2 honest-fields table is the authority). Field bags are
// asserted with a single deepEqual over the instance's own enumerable fields
// (spread drops prototype getters), per the house single-deep-equal rule.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AssetNode } from './asset-node.ts';
import { ClassFileNode } from './class-file-node.ts';
import { ClassNode } from './class-node.ts';
import { ConstantsNode } from './constants-node.ts';
import { DependencyNode } from './dependency-node.ts';
import type { Diagnostic } from './diagnostic.ts';
import { DtoFieldNode } from './dto-field-node.ts';
import { DtoNode } from './dto-node.ts';
import { EntityNode } from './entity-node.ts';
import { FileNode } from './file-node.ts';
import { FunctionNode } from './function-node.ts';
import { ProgramNode } from './program-node.ts';
import { RunParameterNode } from './run-parameter-node.ts';
import type { Span } from './span.ts';
import { UiComponentNode } from './ui-component-node.ts';

const span = (startLine: number, startColumn: number, endLine: number, endColumn: number): Span => ({
  start: { line: startLine, column: startColumn },
  end: { line: endLine, column: endColumn },
});

describe('ProgramNode', () => {
  it('constructs from a shortform declaration shape', () => {
    const raw = 'TodoApp -> AppEntry "Task management app" v1.0.0';
    const node = new ProgramNode({
      name: 'TodoApp',
      span: span(1, 1, 1, 49),
      raw,
      entry: 'AppEntry',
      purpose: 'Task management app',
      version: '1.0.0',
    });
    assert.equal(node instanceof EntityNode, true);
    assert.deepEqual(
      { ...node },
      {
        kind: 'Program',
        name: 'TodoApp',
        span: span(1, 1, 1, 49),
        raw,
        comment: undefined,
        entry: 'AppEntry',
        purpose: 'Task management app',
        version: '1.0.0',
        exports: undefined,
      },
    );
  });

  it('constructs from a longform block shape', () => {
    const raw = 'program TodoApp {\n  entry: AppEntry\n  exports: [publicApi]\n}';
    const node = new ProgramNode({
      name: 'TodoApp',
      span: span(3, 1, 6, 2),
      raw,
      comment: 'root program',
      entry: 'AppEntry',
      exports: ['publicApi'],
    });
    assert.deepEqual(
      { ...node },
      {
        kind: 'Program',
        name: 'TodoApp',
        span: span(3, 1, 6, 2),
        raw,
        comment: 'root program',
        entry: 'AppEntry',
        purpose: undefined,
        version: undefined,
        exports: ['publicApi'],
      },
    );
  });
});

describe('FileNode', () => {
  it('constructs from a shortform declaration shape', () => {
    const raw = 'UserService @ src/services/user.ts:';
    const node = new FileNode({
      name: 'UserService',
      span: span(9, 1, 9, 36),
      raw,
      path: 'src/services/user.ts',
      imports: ['Logger'],
      exports: ['createUser'],
    });
    assert.equal(node instanceof EntityNode, true);
    assert.deepEqual(
      { ...node },
      {
        kind: 'File',
        name: 'UserService',
        span: span(9, 1, 9, 36),
        raw,
        comment: undefined,
        path: 'src/services/user.ts',
        imports: ['Logger'],
        exports: ['createUser'],
        purpose: undefined,
      },
    );
  });

  it('constructs from a longform block shape', () => {
    const raw = 'file UserService {\n  path: "src/services/user.ts"\n}';
    const node = new FileNode({
      name: 'UserService',
      span: span(1, 1, 3, 2),
      raw,
      path: 'src/services/user.ts',
      imports: [],
      exports: [],
      purpose: 'user persistence',
    });
    assert.deepEqual(
      { ...node },
      {
        kind: 'File',
        name: 'UserService',
        span: span(1, 1, 3, 2),
        raw,
        comment: undefined,
        path: 'src/services/user.ts',
        imports: [],
        exports: [],
        purpose: 'user persistence',
      },
    );
  });
});

describe('FunctionNode', () => {
  it('constructs from a shortform declaration shape (mixed dependency list residue)', () => {
    const raw = 'createUser :: (data: UserDTO) => UserDTO';
    const node = new FunctionNode({
      name: 'createUser',
      span: span(12, 1, 12, 41),
      raw,
      signature: '(data: UserDTO) => UserDTO',
      calls: ['validateUser'],
      pendingDependencies: ['UnknownHelper'],
      input: 'UserDTO',
      output: 'UserDTO',
      affects: ['UserList'],
      consumes: ['DATABASE_URL'],
    });
    assert.equal(node instanceof EntityNode, true);
    assert.deepEqual(
      { ...node },
      {
        kind: 'Function',
        name: 'createUser',
        span: span(12, 1, 12, 41),
        raw,
        comment: undefined,
        signature: '(data: UserDTO) => UserDTO',
        calls: ['validateUser'],
        pendingDependencies: ['UnknownHelper'],
        description: undefined,
        input: 'UserDTO',
        output: 'UserDTO',
        affects: ['UserList'],
        consumes: ['DATABASE_URL'],
      },
    );
  });

  it('constructs from a longform block shape (pendingDependencies required, usually empty)', () => {
    const raw = 'function createUser {\n  signature: "(data: UserDTO) => UserDTO"\n}';
    const node = new FunctionNode({
      name: 'createUser',
      span: span(4, 1, 6, 2),
      raw,
      signature: '(data: UserDTO) => UserDTO',
      calls: [],
      pendingDependencies: [],
      description: 'Creates a new user',
    });
    assert.deepEqual(
      { ...node },
      {
        kind: 'Function',
        name: 'createUser',
        span: span(4, 1, 6, 2),
        raw,
        comment: undefined,
        signature: '(data: UserDTO) => UserDTO',
        calls: [],
        pendingDependencies: [],
        description: 'Creates a new user',
        input: undefined,
        output: undefined,
        affects: undefined,
        consumes: undefined,
      },
    );
  });
});

describe('ClassNode', () => {
  it('constructs from a shortform declaration shape (no path/imports fields exist — F3 disposition)', () => {
    const raw = 'UserController <: BaseController, IController';
    const node = new ClassNode({
      name: 'UserController',
      span: span(20, 1, 20, 46),
      raw,
      implements: ['IController'],
      methods: ['create', 'list'],
      extends: 'BaseController',
    });
    assert.equal(node instanceof EntityNode, true);
    assert.deepEqual(
      { ...node },
      {
        kind: 'Class',
        name: 'UserController',
        span: span(20, 1, 20, 46),
        raw,
        comment: undefined,
        implements: ['IController'],
        methods: ['create', 'list'],
        extends: 'BaseController',
        purpose: undefined,
      },
    );
    // The F3 ruling is structural: a declared Class carries no imports/path.
    assert.deepEqual('imports' in node || 'path' in node, false);
  });

  it('constructs from a longform block shape', () => {
    const raw = 'class TodoModel {\n  methods: [save]\n}';
    const node = new ClassNode({
      name: 'TodoModel',
      span: span(1, 1, 3, 2),
      raw,
      implements: [],
      methods: ['save'],
      purpose: 'todo persistence model',
    });
    assert.deepEqual(
      { ...node },
      {
        kind: 'Class',
        name: 'TodoModel',
        span: span(1, 1, 3, 2),
        raw,
        comment: undefined,
        implements: [],
        methods: ['save'],
        extends: undefined,
        purpose: 'todo persistence model',
      },
    );
  });
});

describe('ClassFileNode', () => {
  it('constructs from a shortform fusion declaration shape and auto-self-exports (parser.ts:287)', () => {
    const raw = 'UserController #: src/controllers/user.ts <: BaseController';
    const node = new ClassFileNode({
      name: 'UserController',
      span: span(30, 1, 30, 61),
      raw,
      path: 'src/controllers/user.ts',
      implements: [],
      methods: [],
      imports: ['UserService'],
      exports: [],
      extends: 'BaseController',
    });
    assert.equal(node instanceof EntityNode, true);
    assert.deepEqual(
      { ...node },
      {
        kind: 'ClassFile',
        name: 'UserController',
        span: span(30, 1, 30, 61),
        raw,
        comment: undefined,
        path: 'src/controllers/user.ts',
        implements: [],
        methods: [],
        imports: ['UserService'],
        exports: ['UserController'],
        extends: 'BaseController',
        purpose: undefined,
      },
    );
  });

  it('constructs from a longform block shape without duplicating an explicit self-export', () => {
    const raw = 'classFile UserController {\n  path: "src/controllers/user.ts"\n}';
    const node = new ClassFileNode({
      name: 'UserController',
      span: span(1, 1, 3, 2),
      raw,
      path: 'src/controllers/user.ts',
      implements: ['IController'],
      methods: ['create'],
      imports: [],
      exports: ['UserController', 'helper'],
      purpose: 'controller with its file',
    });
    assert.deepEqual(
      { ...node },
      {
        kind: 'ClassFile',
        name: 'UserController',
        span: span(1, 1, 3, 2),
        raw,
        comment: undefined,
        path: 'src/controllers/user.ts',
        implements: ['IController'],
        methods: ['create'],
        imports: [],
        exports: ['UserController', 'helper'],
        extends: undefined,
        purpose: 'controller with its file',
      },
    );
  });
});

describe('ConstantsNode', () => {
  it('constructs from a shortform declaration shape', () => {
    const raw = 'AppConfig ! src/config.ts : ConfigSchema';
    const node = new ConstantsNode({
      name: 'AppConfig',
      span: span(40, 1, 40, 41),
      raw,
      path: 'src/config.ts',
      schema: 'ConfigSchema',
    });
    assert.equal(node instanceof EntityNode, true);
    assert.deepEqual(
      { ...node },
      {
        kind: 'Constants',
        name: 'AppConfig',
        span: span(40, 1, 40, 41),
        raw,
        comment: undefined,
        path: 'src/config.ts',
        schema: 'ConfigSchema',
        purpose: undefined,
      },
    );
  });

  it('constructs from a longform block shape', () => {
    const raw = 'constants AppConfig {\n  path: "src/config.ts"\n}';
    const node = new ConstantsNode({
      name: 'AppConfig',
      span: span(1, 1, 3, 2),
      raw,
      path: 'src/config.ts',
      purpose: 'application configuration',
    });
    assert.deepEqual(
      { ...node },
      {
        kind: 'Constants',
        name: 'AppConfig',
        span: span(1, 1, 3, 2),
        raw,
        comment: undefined,
        path: 'src/config.ts',
        schema: undefined,
        purpose: 'application configuration',
      },
    );
  });
});

describe('DtoNode', () => {
  it('constructs from a shortform declaration shape with DtoFieldNode children', () => {
    const raw = 'UserDTO %';
    const field = new DtoFieldNode({
      name: 'id',
      type: 'string',
      optionalityMarker: 'none',
      span: span(51, 3, 51, 14),
    });
    const node = new DtoNode({
      name: 'UserDTO',
      span: span(50, 1, 50, 10),
      raw,
      fields: [field],
      purpose: 'User data transfer object',
    });
    assert.equal(node instanceof EntityNode, true);
    assert.deepEqual(
      { ...node },
      {
        kind: 'DTO',
        name: 'UserDTO',
        span: span(50, 1, 50, 10),
        raw,
        comment: undefined,
        fields: [field],
        purpose: 'User data transfer object',
      },
    );
  });

  it('constructs from a longform block shape', () => {
    const raw = 'dto UserDTO {\n  fields: {\n    id: string\n  }\n}';
    const node = new DtoNode({
      name: 'UserDTO',
      span: span(1, 1, 5, 2),
      raw,
      fields: [],
    });
    assert.deepEqual(
      { ...node },
      {
        kind: 'DTO',
        name: 'UserDTO',
        span: span(1, 1, 5, 2),
        raw,
        comment: undefined,
        fields: [],
        purpose: undefined,
      },
    );
  });
});

describe('AssetNode', () => {
  it('constructs from a shortform declaration shape', () => {
    const raw = 'Logo ~ "Company logo asset"';
    const node = new AssetNode({
      name: 'Logo',
      span: span(60, 1, 60, 28),
      raw,
      description: 'Company logo asset',
    });
    assert.equal(node instanceof EntityNode, true);
    assert.deepEqual(
      { ...node },
      {
        kind: 'Asset',
        name: 'Logo',
        span: span(60, 1, 60, 28),
        raw,
        comment: undefined,
        description: 'Company logo asset',
        containsProgram: undefined,
      },
    );
  });

  it('constructs from a longform block shape with containsProgram', () => {
    const raw = 'asset EmbeddedApp {\n  description: "Bundled admin app"\n  containsProgram: AdminApp\n}';
    const node = new AssetNode({
      name: 'EmbeddedApp',
      span: span(1, 1, 4, 2),
      raw,
      description: 'Bundled admin app',
      containsProgram: 'AdminApp',
    });
    assert.deepEqual(
      { ...node },
      {
        kind: 'Asset',
        name: 'EmbeddedApp',
        span: span(1, 1, 4, 2),
        raw,
        comment: undefined,
        description: 'Bundled admin app',
        containsProgram: 'AdminApp',
      },
    );
  });
});

describe('UiComponentNode', () => {
  it('constructs from a shortform declaration shape with declared reverse links (F1 ruling)', () => {
    const raw = 'UserList & "Displays users"';
    const node = new UiComponentNode({
      name: 'UserList',
      span: span(70, 1, 70, 28),
      raw,
      purpose: 'Displays users',
      root: false,
      contains: ['UserRow'],
      declaredContainedBy: ['App'],
      declaredAffectedBy: ['createUser'],
    });
    assert.equal(node instanceof EntityNode, true);
    assert.deepEqual(
      { ...node },
      {
        kind: 'UIComponent',
        name: 'UserList',
        span: span(70, 1, 70, 28),
        raw,
        comment: undefined,
        purpose: 'Displays users',
        root: false,
        contains: ['UserRow'],
        declaredContainedBy: ['App'],
        declaredAffectedBy: ['createUser'],
      },
    );
  });

  it('constructs from a longform block shape (root component, nothing declared)', () => {
    const raw = 'component App {\n  description: "Root shell"\n  root: true\n}';
    const node = new UiComponentNode({
      name: 'App',
      span: span(1, 1, 4, 2),
      raw,
      purpose: 'Root shell',
      root: true,
    });
    assert.deepEqual(
      { ...node },
      {
        kind: 'UIComponent',
        name: 'App',
        span: span(1, 1, 4, 2),
        raw,
        comment: undefined,
        purpose: 'Root shell',
        root: true,
        contains: undefined,
        declaredContainedBy: undefined,
        declaredAffectedBy: undefined,
      },
    );
  });
});

describe('RunParameterNode', () => {
  it('constructs from a shortform declaration shape (no consumedBy field — derived-only)', () => {
    const raw = 'DATABASE_URL $env "Postgres connection string" (required)';
    const node = new RunParameterNode({
      name: 'DATABASE_URL',
      span: span(80, 1, 80, 58),
      raw,
      paramType: 'env',
      description: 'Postgres connection string',
      required: true,
    });
    assert.equal(node instanceof EntityNode, true);
    assert.deepEqual(
      { ...node },
      {
        kind: 'RunParameter',
        name: 'DATABASE_URL',
        span: span(80, 1, 80, 58),
        raw,
        comment: undefined,
        paramType: 'env',
        description: 'Postgres connection string',
        defaultValue: undefined,
        required: true,
      },
    );
    assert.deepEqual('consumedBy' in node, false);
  });

  it('constructs from a longform block shape with a default value', () => {
    const raw = 'runParameter LOG_LEVEL {\n  type: "config"\n  description: "Log verbosity"\n  default: "info"\n}';
    const node = new RunParameterNode({
      name: 'LOG_LEVEL',
      span: span(1, 1, 5, 2),
      raw,
      paramType: 'config',
      description: 'Log verbosity',
      defaultValue: 'info',
    });
    assert.deepEqual(
      { ...node },
      {
        kind: 'RunParameter',
        name: 'LOG_LEVEL',
        span: span(1, 1, 5, 2),
        raw,
        comment: undefined,
        paramType: 'config',
        description: 'Log verbosity',
        defaultValue: 'info',
        required: undefined,
      },
    );
  });
});

describe('DependencyNode', () => {
  it('constructs from a shortform declaration shape (no importedBy field — derived-only)', () => {
    const raw = 'axios ^ "HTTP client" v3.0.0';
    const node = new DependencyNode({
      name: 'axios',
      span: span(90, 1, 90, 29),
      raw,
      purpose: 'HTTP client',
      version: '3.0.0',
    });
    assert.equal(node instanceof EntityNode, true);
    assert.deepEqual(
      { ...node },
      {
        kind: 'Dependency',
        name: 'axios',
        span: span(90, 1, 90, 29),
        raw,
        comment: undefined,
        purpose: 'HTTP client',
        version: '3.0.0',
        exports: undefined,
      },
    );
    assert.deepEqual('importedBy' in node, false);
  });

  it('constructs from a longform block shape (quoted name, declared exports)', () => {
    const raw = 'dependency "left-pad" {\n  purpose: "padding helper"\n  exports: [leftPad]\n}';
    const node = new DependencyNode({
      name: 'left-pad',
      span: span(1, 1, 4, 2),
      raw,
      purpose: 'padding helper',
      exports: ['leftPad'],
    });
    assert.deepEqual(
      { ...node },
      {
        kind: 'Dependency',
        name: 'left-pad',
        span: span(1, 1, 4, 2),
        raw,
        comment: undefined,
        purpose: 'padding helper',
        version: undefined,
        exports: ['leftPad'],
      },
    );
  });
});

describe('Diagnostic shape', () => {
  it('is satisfiable by a plain record with a span (§3.3)', () => {
    const diagnostic = {
      code: 'semantics/orphan-continuation',
      severity: 'warning',
      span: span(7, 3, 7, 18),
      message: 'continuation line with no open entity',
    } as const satisfies Diagnostic;
    assert.deepEqual(diagnostic.severity, 'warning');
  });
});
