// RFC-TM-3 §3.1 / §5 Q3 (rfc-tm-3-diamond.md) — the CST→AST walk/attach
// layer: flat sibling CST lines → semantic classes via the attachment table,
// the File→Class lookahead rule (scenario-58 fixture), repeated-continuation
// last-wins, the `?`-sigil anonymous-token detection, `_final` twin
// consumption, longform property mapping, and ParseOutcome's list-preserved
// duplicates.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ClassFileNode } from '../ast/class-file-node.ts';
import { ClassNode } from '../ast/class-node.ts';
import { DtoNode } from '../ast/dto-node.ts';
import { FileNode } from '../ast/file-node.ts';
import { FunctionNode } from '../ast/function-node.ts';
import { ProgramNode } from '../ast/program-node.ts';
import { RunParameterNode } from '../ast/run-parameter-node.ts';
import { UiComponentNode } from '../ast/ui-component-node.ts';
import { TypedMindParser } from './typed-mind-parser.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..', '..');
const repoRoot = join(packageDir, '..', '..');
const wasmPath = join(packageDir, 'grammar', 'grammar.wasm');

const expectedHeritage = (name: string, line: number, start: number, end: number) => {
  const span = { start: { line, column: start }, end: { line, column: end } };
  return { kind: 'named', base: { kind: 'named', name, span }, args: [], span };
};

describe('CST→AST walk/attach layer', () => {
  let parser: TypedMindParser;

  before(async () => {
    parser = await TypedMindParser.create({ wasmPath });
  });

  it('walks a full-kind shortform document into the eleven semantic classes with attached continuations', () => {
    const source = [
      'TodoApp -> AppEntry "Task app" v1.0.0  # main program',
      'UserService @ src/services/user.ts:',
      '  <- [Logger]',
      '  -> [createUser]',
      '  "User service file"',
      'createUser :: (data: UserDTO) => UserDTO',
      '  <- UserDTO',
      '  -> UserDTO',
      '  ~> [validate]',
      '  ~ [UserList]',
      '  $< [DB_URL]',
      '  "Creates a user"',
      'BaseController <: Base, IController',
      '  => [handle]',
      'UserController #: src/controllers/user.ts <: BaseController',
      '  => [index]',
      '  <- [UserService]',
      '  -> [helperFn]',
      'AppConfig ! src/config.ts : ConfigSchema',
      'Logo ~ "Company logo"',
      '  >> TodoApp',
      'UserList & "List of users"',
      '  > [UserCard]',
      '  < [App]',
      'RootApp &! "Root"',
      'DB_URL $env "Postgres URL" (required)',
      '  = "postgres://localhost"',
      'axios ^ "HTTP client" v3.0.0',
      '  -> [get]',
      '',
    ].join('\n');
    const outcome = parser.parse(source);
    const projected = outcome.entities.map((entity) => {
      const { span: _span, raw: _raw, ...fields } = { ...entity };
      return fields;
    });
    assert.deepEqual(
      { projected, diagnostics: outcome.diagnostics },
      {
        projected: [
          {
            kind: 'Program',
            sourceForm: 'shortform',
            name: 'TodoApp',
            comment: 'main program',
            entry: 'AppEntry',
            purpose: 'Task app',
            version: '1.0.0',
            exports: undefined,
          },
          {
            kind: 'File',
            sourceForm: 'shortform',
            name: 'UserService',
            comment: undefined,
            path: 'src/services/user.ts',
            imports: ['Logger'],
            exports: ['createUser'],
            reExports: [],
            purpose: 'User service file',
          },
          {
            kind: 'Function',
            typeParameters: undefined,
            sourceForm: 'shortform',
            name: 'createUser',
            comment: undefined,
            signature: '(data: UserDTO) => UserDTO',
            calls: ['validate'],
            pendingDependencies: [],
            description: 'Creates a user',
            input: 'UserDTO',
            output: 'UserDTO',
            affects: ['UserList'],
            consumes: ['DB_URL'],
          },
          {
            kind: 'Class',
            typeParameters: undefined,
            heritage: { extends: expectedHeritage('Base', 13, 19, 23), implements: [expectedHeritage('IController', 13, 25, 36)] },
            sourceForm: 'shortform',
            name: 'BaseController',
            comment: undefined,
            implements: ['IController'],
            methods: ['handle'],
            extends: 'Base',
            purpose: undefined,
          },
          {
            kind: 'ClassFile',
            typeParameters: undefined,
            heritage: { extends: expectedHeritage('BaseController', 15, 46, 60), implements: [] },
            sourceForm: 'shortform',
            name: 'UserController',
            comment: undefined,
            path: 'src/controllers/user.ts',
            implements: [],
            methods: ['index'],
            imports: ['UserService'],
            exports: ['helperFn', 'UserController'],
            extends: 'BaseController',
            purpose: undefined,
          },
          {
            kind: 'Constants',
            calls: [],
            sourceForm: 'shortform',
            name: 'AppConfig',
            comment: undefined,
            path: 'src/config.ts',
            schema: 'ConfigSchema',
            purpose: undefined,
          },
          {
            kind: 'Asset',
            sourceForm: 'shortform',
            name: 'Logo',
            comment: undefined,
            description: 'Company logo',
            containsProgram: 'TodoApp',
          },
          {
            kind: 'UIComponent',
            sourceForm: 'shortform',
            name: 'UserList',
            comment: undefined,
            purpose: 'List of users',
            root: false,
            contains: ['UserCard'],
            declaredContainedBy: ['App'],
            declaredAffectedBy: undefined,
          },
          {
            kind: 'UIComponent',
            sourceForm: 'shortform',
            name: 'RootApp',
            comment: undefined,
            purpose: 'Root',
            root: true,
            contains: undefined,
            declaredContainedBy: undefined,
            declaredAffectedBy: undefined,
          },
          {
            kind: 'RunParameter',
            sourceForm: 'shortform',
            name: 'DB_URL',
            comment: undefined,
            paramType: 'env',
            description: 'Postgres URL',
            defaultValue: 'postgres://localhost',
            required: true,
          },
          {
            kind: 'Dependency',
            sourceForm: 'shortform',
            name: 'axios',
            comment: undefined,
            purpose: 'HTTP client',
            version: '3.0.0',
            exports: ['get'],
          },
        ],
        diagnostics: [],
      },
    );
  });

  it('detects the `?` sigil via the anonymous-token walk and keeps the three-way optionalityMarker distinct', () => {
    const source = 'UserDTO % "User data"\n  - id: string "The id"\n  - email?: string\n  - nickname: string (optional)\n';
    const outcome = parser.parse(source);
    const dto = outcome.entities.at(0);
    assert.equal(dto instanceof DtoNode, true);
    const fields = dto instanceof DtoNode ? dto.fields : [];
    assert.deepEqual(
      fields.map((field) => ({
        name: field.name,
        type: field.type,
        optionalityMarker: field.optionalityMarker,
        isOptional: field.isOptional,
        description: field.description,
      })),
      [
        { name: 'id', type: 'string', optionalityMarker: 'none', isOptional: false, description: 'The id' },
        { name: 'email', type: 'string', optionalityMarker: 'question', isOptional: true, description: undefined },
        { name: 'nickname', type: 'string', optionalityMarker: 'parenthesized', isOptional: true, description: undefined },
      ],
    );
  });

  it('replicates repeated-continuation last-wins assignment (parser.ts:457-650) while DTO fields append', () => {
    const source = 'Main @ src/main.ts:\n  -> [first]\n  -> [second, third]\nD %\n  - a: string\n  - b: number\n';
    const outcome = parser.parse(source);
    const file = outcome.entities.at(0);
    const dto = outcome.entities.at(1);
    assert.deepEqual(
      {
        exports: file instanceof FileNode ? file.exports : undefined,
        fieldNames: dto instanceof DtoNode ? dto.fields.map((field) => field.name) : undefined,
      },
      { exports: ['second', 'third'], fieldNames: ['a', 'b'] },
    );
  });

  it('keeps the open entity open across comments and import statements (parser.ts:77-83)', () => {
    const source = 'Main @ src/main.ts:\n# full-line comment\n  # indented comment\n@import "./other.tmd" as Other\n  -> [run]\n';
    const outcome = parser.parse(source);
    const file = outcome.entities.at(0);
    assert.deepEqual(
      {
        exports: file instanceof FileNode ? file.exports : undefined,
        imports: outcome.imports.map((importStatement) => ({
          path: importStatement.path,
          alias: importStatement.alias,
          span: importStatement.span,
        })),
        diagnostics: outcome.diagnostics,
      },
      {
        exports: ['run'],
        imports: [{ path: './other.tmd', alias: 'Other', span: { start: { line: 4, column: 1 }, end: { line: 4, column: 31 } } }],
        diagnostics: [],
      },
    );
  });

  it('consumes the _final twins: an EOF continuation with no trailing newline still attaches', () => {
    const outcome = parser.parse('UserDTO %\n  - id: string');
    const dto = outcome.entities.at(0);
    assert.deepEqual(dto instanceof DtoNode ? dto.fields.map((field) => field.name) : undefined, ['id']);
  });

  describe('File→Class lookahead rule (§2.2 F2/F3, parser.ts:211-235)', () => {
    it('produces a ClassFileNode for scenario-58-classfile-vs-class-file.tmd:28-30 and preserves the AuthController duplicates', () => {
      const source = readFileSync(
        join(repoRoot, 'lib', 'typed-mind-test-suite', 'scenarios', 'scenario-58-classfile-vs-class-file.tmd'),
        'utf8',
      );
      const outcome = parser.parse(source);
      const dataFile = outcome.entities.find((entity) => entity.name === 'DataFile');
      assert.equal(dataFile instanceof ClassFileNode, true);
      assert.deepEqual(
        {
          dataFile:
            dataFile instanceof ClassFileNode
              ? {
                  path: dataFile.path,
                  methods: dataFile.methods,
                  imports: dataFile.imports,
                  // Auto-self-export appends the class name (parser.ts:287).
                  exports: dataFile.exports,
                  declarationLine: dataFile.span.start.line,
                }
              : undefined,
          authControllerKinds: outcome.entities.filter((entity) => entity.name === 'AuthController').map((entity) => entity.kind),
        },
        {
          dataFile: {
            path: 'src/data.ts',
            methods: ['processData'],
            imports: ['Database'],
            exports: ['DataClass', 'DataFile'],
            declarationLine: 28,
          },
          // Duplicate declarations are LIST-preserved (FAQ Q2): the Class from
          // line 20 and the File from line 23 both survive.
          authControllerKinds: ['Class', 'File'],
        },
      );
    });

    it('attaches a description line to a lookahead-converted ClassFile (legacy converted-Class purpose, parser.ts:611-613)', () => {
      const outcome = parser.parse('Svc @ src/svc.ts:\n  "converted purpose"\n  => [run]\n');
      const svc = outcome.entities.at(0);
      assert.deepEqual(
        {
          isClassFile: svc instanceof ClassFileNode,
          purpose: svc instanceof ClassFileNode ? svc.purpose : undefined,
          methods: svc instanceof ClassFileNode ? svc.methods : undefined,
          diagnostics: outcome.diagnostics,
        },
        { isClassFile: true, purpose: 'converted purpose', methods: ['run'], diagnostics: [] },
      );
    });

    it('does not convert when `=>` sits beyond the 5-line window or behind another declaration', () => {
      const beyondWindow = parser.parse('Svc @ src/svc.ts:\n\n\n\n\n\n  => [run]\n');
      const behindDeclaration = parser.parse('Svc @ src/svc.ts:\nOther <: Base\n  => [run]\n');
      assert.deepEqual(
        {
          beyondWindowKind: beyondWindow.entities.at(0)?.kind,
          behindDeclarationKind: behindDeclaration.entities.at(0)?.kind,
        },
        { beyondWindowKind: 'File', behindDeclarationKind: 'File' },
      );
    });
  });

  describe('longform blocks (H1-H12 property mapping, longform-parser.ts:181-343)', () => {
    it('maps program, component, and parameter blocks with the legacy key quirks', () => {
      const source = [
        'program TodoApp {',
        '  entry: AppEntry',
        '  version: "2.0.0"',
        '  description: "The app"',
        '  exports: [publicApi]',
        '}',
        'component App {',
        '  description: "Root shell"',
        '  root: true',
        '  containedBy: [Shell]',
        '  affectedBy: [refresh]',
        '}',
        'parameter DB_URL {',
        '  type: env',
        '  description: "Postgres URL"',
        '  default: "localhost"',
        '  required: true',
        '}',
        '',
      ].join('\n');
      const outcome = parser.parse(source);
      const [program, component, parameter] = outcome.entities;
      assert.deepEqual(
        {
          program:
            program instanceof ProgramNode
              ? {
                  entry: program.entry,
                  version: program.version,
                  // purpose falls back to description (longform-parser.ts:192);
                  // comment IS the description property (longform-parser.ts:183).
                  purpose: program.purpose,
                  comment: program.comment,
                  exports: program.exports,
                }
              : undefined,
          component:
            component instanceof UiComponentNode
              ? {
                  purpose: component.purpose,
                  root: component.root,
                  declaredContainedBy: component.declaredContainedBy,
                  declaredAffectedBy: component.declaredAffectedBy,
                }
              : undefined,
          parameter:
            parameter instanceof RunParameterNode
              ? {
                  paramType: parameter.paramType,
                  description: parameter.description,
                  defaultValue: parameter.defaultValue,
                  required: parameter.required,
                }
              : undefined,
          diagnostics: outcome.diagnostics,
        },
        {
          program: { entry: 'AppEntry', version: '2.0.0', purpose: 'The app', comment: 'The app', exports: ['publicApi'] },
          component: { purpose: 'Root shell', root: true, declaredContainedBy: ['Shell'], declaredAffectedBy: ['refresh'] },
          parameter: { paramType: 'env', description: 'Postgres URL', defaultValue: 'localhost', required: true },
          diagnostics: [],
        },
      );
    });

    it('maps dto fields blocks: multi-line and inline field objects, optional flag, defaulted type', () => {
      const source = [
        'dto UserDTO {',
        '  purpose: "User shape"',
        '  fields: {',
        '    id: {',
        '      type: string',
        '      description: "The id"',
        '    }',
        '    email: { type: "string", optional: true }',
        '    legacy: {',
        '      description: "no type key"',
        '    }',
        '  }',
        '}',
        '',
      ].join('\n');
      const outcome = parser.parse(source);
      const dto = outcome.entities.at(0);
      assert.deepEqual(
        dto instanceof DtoNode
          ? {
              purpose: dto.purpose,
              fields: dto.fields.map((field) => ({
                name: field.name,
                type: field.type,
                optionalityMarker: field.optionalityMarker,
                description: field.description,
                startLine: field.span.start.line,
              })),
            }
          : undefined,
        {
          purpose: 'User shape',
          fields: [
            { name: 'id', type: 'string', optionalityMarker: 'none', description: 'The id', startLine: 4 },
            { name: 'email', type: 'string', optionalityMarker: 'parenthesized', description: undefined, startLine: 8 },
            // 'any' is the legacy default type (longform-parser.ts:249).
            { name: 'legacy', type: 'any', optionalityMarker: 'none', description: 'no type key', startLine: 9 },
          ],
        },
      );
    });

    it('maps the H11 classfile keyword block and the H12 `Name #: path {` sigil block (both dropped wholesale by legacy)', () => {
      const source = [
        'classfile UserController {',
        '  path: "src/controllers/user.ts"',
        '  extends: BaseController',
        '  methods: [index, show]',
        '  imports: [UserService]',
        '}',
        'TodoService #: src/api.ts <: BaseService {',
        '  methods: [getAll]',
        '}',
        '',
      ].join('\n');
      const outcome = parser.parse(source);
      const [h11, h12] = outcome.entities;
      assert.deepEqual(
        {
          h11:
            h11 instanceof ClassFileNode
              ? { name: h11.name, path: h11.path, extends: h11.extends, methods: h11.methods, imports: h11.imports, exports: h11.exports }
              : undefined,
          h12: h12 instanceof ClassFileNode ? { name: h12.name, path: h12.path, extends: h12.extends, methods: h12.methods } : undefined,
          diagnostics: outcome.diagnostics,
        },
        {
          h11: {
            name: 'UserController',
            path: 'src/controllers/user.ts',
            extends: 'BaseController',
            methods: ['index', 'show'],
            imports: ['UserService'],
            exports: ['UserController'],
          },
          h12: { name: 'TodoService', path: 'src/api.ts', extends: 'BaseService', methods: ['getAll'] },
          diagnostics: [],
        },
      );
    });

    it('maps a freetext signature property (P7) the legacy per-line regexes dropped', () => {
      const outcome = parser.parse('function getUser {\n  signature: (id: string) => User\n}\n');
      const fn = outcome.entities.at(0);
      assert.deepEqual(fn instanceof FunctionNode ? fn.signature : undefined, '(id: string) => User');
    });

    it('maps the quoted dependency header name (H10) via headerName() reassembly', () => {
      const outcome = parser.parse('dependency "@types/node" {\n  purpose: "types"\n  version: "22.0.0"\n}\n');
      assert.deepEqual(
        outcome.entities.map((entity) => ({ kind: entity.kind, name: entity.name })),
        [{ kind: 'Dependency', name: '@types/node' }],
      );
    });

    it('longform duplicate keys replicate last-wins (Map.set, longform-parser.ts:93-139)', () => {
      const outcome = parser.parse('constants Config {\n  path: "a.ts"\n  path: "b.ts"\n}\n');
      const constants = outcome.entities.at(0);
      assert.deepEqual(constants !== undefined && 'path' in constants ? constants.path : undefined, 'b.ts');
    });
  });

  it('a mixed `<- [...]` list of undeclared names stays on pendingDependencies through the §3.4 distribution phase', () => {
    const outcome = parser.parse('createOrder :: () => void\n  <- [OrderDTO, Database, EmailService]\n');
    const fn = outcome.entities.at(0);
    assert.deepEqual(
      fn instanceof FunctionNode ? { pendingDependencies: fn.pendingDependencies, calls: fn.calls, input: fn.input } : undefined,
      { pendingDependencies: ['OrderDTO', 'Database', 'EmailService'], calls: [], input: undefined },
    );
  });

  it('a declared Class keeps extends/implements from its inherit list and never gains a path', () => {
    const outcome = parser.parse('UserController <: BaseController, IController, ISerializable\n');
    const cls = outcome.entities.at(0);
    assert.deepEqual(cls instanceof ClassNode ? { extends: cls.extends, implements: cls.implements, hasPath: 'path' in cls } : undefined, {
      extends: 'BaseController',
      implements: ['IController', 'ISerializable'],
      hasPath: false,
    });
  });
});
