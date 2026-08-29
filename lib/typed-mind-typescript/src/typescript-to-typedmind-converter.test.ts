import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ParsedModule, TypeScriptProjectAnalysis } from './types.ts';
import { createFilePath } from './types.ts';
import { TypeScriptToTypedMindConverter } from './typescript-to-typedmind-converter.ts';

const createMockAnalysis = (): TypeScriptProjectAnalysis => ({
  modules: [
    {
      filePath: createFilePath('/project/src/index.ts'),
      imports: [
        {
          specifier: './services/user-service',
          namedImports: ['UserService'],
          isTypeOnly: false,
        },
      ],
      exports: [
        {
          name: 'main',
          isDefault: false,
          type: 'function',
        },
      ],
      functions: [
        {
          name: 'main',
          signature: 'async main() => Promise<void>',
          parameters: [],
          returnType: 'Promise<void>',
          isAsync: true,
          decorators: [],
        },
      ],
      classes: [],
      interfaces: [],
      types: [],
      constants: [],
    } as ParsedModule,
    {
      filePath: createFilePath('/project/src/services/user-service.ts'),
      imports: [
        {
          specifier: '../types/user',
          namedImports: ['UserDTO', 'CreateUserDTO'],
          isTypeOnly: false,
        },
      ],
      exports: [
        {
          name: 'UserService',
          isDefault: false,
          type: 'class',
        },
      ],
      functions: [],
      classes: [
        {
          name: 'UserService',
          isAbstract: false,
          extends: ['BaseService'],
          implements: ['IUserService'],
          methods: [
            {
              name: 'createUser',
              signature: 'async createUser(data: CreateUserDTO) => Promise<UserDTO>',
              isStatic: false,
              isPrivate: false,
              isProtected: false,
              isAbstract: false,
              parameters: [
                {
                  name: 'data',
                  type: 'CreateUserDTO',
                  isOptional: false,
                  hasDefaultValue: false,
                },
              ],
              returnType: 'Promise<UserDTO>',
              isAsync: true,
            },
            {
              name: 'findUser',
              signature: 'async findUser(id: string) => Promise<UserDTO | null>',
              isStatic: false,
              isPrivate: false,
              isProtected: false,
              isAbstract: false,
              parameters: [
                {
                  name: 'id',
                  type: 'string',
                  isOptional: false,
                  hasDefaultValue: false,
                },
              ],
              returnType: 'Promise<UserDTO | null>',
              isAsync: true,
            },
          ],
          properties: [],
          decorators: [],
        },
      ],
      interfaces: [],
      types: [],
      constants: [],
    } as ParsedModule,
    {
      filePath: createFilePath('/project/src/types/user.ts'),
      imports: [],
      exports: [
        {
          name: 'UserDTO',
          isDefault: false,
          type: 'interface',
        },
        {
          name: 'CreateUserDTO',
          isDefault: false,
          type: 'interface',
        },
      ],
      functions: [],
      classes: [],
      interfaces: [
        {
          name: 'UserDTO',
          extends: [],
          properties: [
            {
              name: 'id',
              type: 'string',
              isReadonly: false,
              isStatic: false,
              isPrivate: false,
              isProtected: false,
              isOptional: false,
            },
            {
              name: 'name',
              type: 'string',
              isReadonly: false,
              isStatic: false,
              isPrivate: false,
              isProtected: false,
              isOptional: false,
            },
            {
              name: 'email',
              type: 'string',
              isReadonly: false,
              isStatic: false,
              isPrivate: false,
              isProtected: false,
              isOptional: false,
            },
            {
              name: 'createdAt',
              type: 'Date',
              isReadonly: false,
              isStatic: false,
              isPrivate: false,
              isProtected: false,
              isOptional: true,
            },
          ],
          methods: [],
        },
        {
          name: 'CreateUserDTO',
          extends: [],
          properties: [
            {
              name: 'name',
              type: 'string',
              isReadonly: false,
              isStatic: false,
              isPrivate: false,
              isProtected: false,
              isOptional: false,
            },
            {
              name: 'email',
              type: 'string',
              isReadonly: false,
              isStatic: false,
              isPrivate: false,
              isProtected: false,
              isOptional: false,
            },
          ],
          methods: [],
        },
      ],
      types: [],
      constants: [],
    } as ParsedModule,
  ],
  entryPoints: ['/project/src/index.ts'],
  projectConfig: {
    target: 99, // ScriptTarget.ES2020
    module: 1, // ModuleKind.CommonJS
  },
  diagnostics: [],
  moduleGraph: [],
  sstHandlerReferences: [],
  // X-CONV-3 (RFC-TM-9 Q2) — every mock module's filePath is rooted at
  // /project, so /project is this mock's project root. Required field:
  // omitting it previously produced `path.relative(undefined, ...)` at
  // runtime (this file is excluded from tsconfig's typecheck via
  // **/*.test.ts, so a missing required property here is a RUNTIME
  // failure, not a caught compile error).
  projectRoot: '/project',
});

describe('TypeScriptToTypedMindConverter', () => {
  it('should convert TypeScript analysis to TypedMind entities', () => {
    const converter = new TypeScriptToTypedMindConverter();
    const analysis = createMockAnalysis();

    const result = converter.convert(analysis);

    assert.equal(result.success, true);
    assert.equal(result.errors.length, 0);
    assert.ok(result.entities.length > 0);
  });

  it('should use ClassFile fusion by default', () => {
    const converter = new TypeScriptToTypedMindConverter({ preferClassFile: true });
    const analysis = createMockAnalysis();

    const result = converter.convert(analysis);

    const userServiceEntity = result.entities.find((e) => e.name === 'UserService');
    assert.notEqual(userServiceEntity, undefined);
    assert.equal(userServiceEntity?.kind, 'ClassFile');

    // Should have both class methods and file imports/exports
    const classFile = userServiceEntity as any;
    assert.ok(classFile.methods.includes('createUser'));
    assert.ok(classFile.methods.includes('findUser'));
    assert.ok(classFile.imports.includes('UserDTO'));
    assert.ok(classFile.imports.includes('CreateUserDTO'));
  });

  it('should create separate entities when preferClassFile is false', () => {
    const converter = new TypeScriptToTypedMindConverter({ preferClassFile: false });
    const analysis = createMockAnalysis();

    const result = converter.convert(analysis);

    const fileEntity = result.entities.find((e) => e.name === 'UserServiceFile');
    const classEntity = result.entities.find((e) => e.name === 'UserService');

    assert.notEqual(fileEntity, undefined);
    assert.equal(fileEntity?.kind, 'File');
    assert.notEqual(classEntity, undefined);
    assert.equal(classEntity?.kind, 'Class');
  });

  it('should convert interfaces to DTOs', () => {
    const converter = new TypeScriptToTypedMindConverter();
    const analysis = createMockAnalysis();

    const result = converter.convert(analysis);

    const userDTO = result.entities.find((e) => e.name === 'UserDTO');
    assert.notEqual(userDTO, undefined);
    assert.equal(userDTO?.kind, 'DTO');

    const dto = userDTO as any;
    assert.equal(dto.fields.length, 4);

    const idField = dto.fields.find((f: any) => f.name === 'id');
    assert.equal(idField.type, 'string');
    assert.equal(idField.isOptional, false);

    const createdAtField = dto.fields.find((f: any) => f.name === 'createdAt');
    assert.equal(createdAtField.isOptional, true);
  });

  it('falls back to opaque for a qualified/dotted property type, not a silently-truncated named type (review finding B1)', () => {
    const converter = new TypeScriptToTypedMindConverter();
    const analysis = createMockAnalysis();
    // biome-ignore lint/suspicious/noExplicitAny: matches this file's existing convention for mutating a readonly test fixture (see "should skip private members by default")
    const userInterface = (analysis.modules as any[]).flatMap((module) => module.interfaces).find((iface: any) => iface.name === 'UserDTO');
    userInterface.properties.push({
      name: 'projectConfig',
      type: 'ts.CompilerOptions',
      isReadonly: false,
      isStatic: false,
      isPrivate: false,
      isProtected: false,
      isOptional: false,
    });

    const result = converter.convert(analysis);
    const userDTO = result.entities.find((e) => e.name === 'UserDTO');
    // biome-ignore lint/suspicious/noExplicitAny: DtoNode's fields are not part of the narrow EntityNode result type this test suite already casts through elsewhere
    const dto = userDTO as any;
    // biome-ignore lint/suspicious/noExplicitAny: matches the file's existing find-callback typing convention
    const projectConfigField = dto.fields.find((field: any) => field.name === 'projectConfig');
    assert.notEqual(projectConfigField, undefined);
    // The raw `type` string is preserved verbatim regardless of structure.
    assert.equal(projectConfigField.type, 'ts.CompilerOptions');
    // typeExpr must NOT silently truncate to { kind: 'named', name: 'ts' } —
    // a dotted/qualified reference has no structured production and must
    // fall to opaque, carrying the full text.
    assert.equal(projectConfigField.typeExpr.kind, 'opaque');
    assert.equal(projectConfigField.typeExpr.text, 'ts.CompilerOptions');
  });

  it('should generate programs by default', () => {
    const converter = new TypeScriptToTypedMindConverter({ generatePrograms: true });
    const analysis = createMockAnalysis();

    const result = converter.convert(analysis);

    const program = result.entities.find((e) => e.kind === 'Program');
    assert.notEqual(program, undefined);
    assert.match(program?.name as string, /App$/);
  });

  it('should skip private members by default', () => {
    const analysis = createMockAnalysis();

    // Add a private method to the class
    const userServiceClass = analysis.modules[1].classes[0] as any;
    userServiceClass.methods.push({
      name: 'privateHelper',
      signature: 'privateHelper() => void',
      isStatic: false,
      isPrivate: true,
      isProtected: false,
      isAbstract: false,
      parameters: [],
      returnType: 'void',
      isAsync: false,
    });

    const converter = new TypeScriptToTypedMindConverter({ includePrivateMembers: false });
    const result = converter.convert(analysis);

    const userServiceEntity = result.entities.find((e) => e.name === 'UserService') as any;
    assert.ok(!userServiceEntity.methods.includes('privateHelper'));
  });

  it('should include private members when requested', () => {
    const analysis = createMockAnalysis();

    // Add a private method to the class
    const userServiceClass = analysis.modules[1].classes[0] as any;
    userServiceClass.methods.push({
      name: 'privateHelper',
      signature: 'privateHelper() => void',
      isStatic: false,
      isPrivate: true,
      isProtected: false,
      isAbstract: false,
      parameters: [],
      returnType: 'void',
      isAsync: false,
    });

    const converter = new TypeScriptToTypedMindConverter({ includePrivateMembers: true });
    const result = converter.convert(analysis);

    const userServiceEntity = result.entities.find((e) => e.name === 'UserService') as any;
    assert.ok(userServiceEntity.methods.includes('privateHelper'));
  });

  it('should generate valid TMD content', () => {
    const converter = new TypeScriptToTypedMindConverter();
    const analysis = createMockAnalysis();

    const result = converter.convert(analysis);

    // RFC-TM-6 §3 (rfc-tm-6-diamond.md) — the `# Section` header comments are
    // the named, accepted EMITTER-STRUCTURE regression: the shared
    // SyntaxEmitter has no comment-synthesis surface, so section headers are
    // dropped. Entities still emit pre-sorted into the legacy section order
    // (Program, then ClassFile, then DTO here), so content-order assertions
    // stay meaningful without the header lines.
    assert.ok(result.tmdContent);
    assert.ok(!result.tmdContent.includes('# Programs'));
    assert.ok(!result.tmdContent.includes('# ClassFiles'));
    assert.ok(!result.tmdContent.includes('# DTOs'));
    assert.ok(result.tmdContent.includes('UserService #:'));
    assert.ok(result.tmdContent.includes('UserDTO %'));
    assert.ok(result.tmdContent.includes('=> [createUser, findUser]'));
    assert.ok(result.tmdContent.indexOf('UserService #:') < result.tmdContent.indexOf('UserDTO %'));
  });

  it('should handle duplicate entity names', () => {
    const analysis = createMockAnalysis();

    // Create a duplicate by adding another class with the same name
    analysis.modules[0].classes = [
      {
        name: 'UserService', // Duplicate name
        isAbstract: false,
        extends: [],
        implements: [],
        methods: [],
        properties: [],
        decorators: [],
      },
    ];

    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);

    assert.equal(result.success, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors[0].message.includes('Duplicate entity name'));
  });

  it('should handle entity naming edge cases', () => {
    const analysis = createMockAnalysis();

    // Add problematic names
    analysis.modules.push({
      filePath: createFilePath('/project/src/123-invalid.ts'),
      imports: [],
      exports: [],
      functions: [
        {
          name: '123invalid', // Invalid name starting with number
          signature: '123invalid() => void',
          parameters: [],
          returnType: 'void',
          isAsync: false,
          decorators: [],
        },
      ],
      classes: [],
      interfaces: [],
      types: [],
      constants: [],
    } as ParsedModule);

    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);

    // Should handle invalid names gracefully (convert to valid names or skip)
    assert.equal(result.success, true);
  });

  it('should only convert exported interfaces and type aliases to DTOs', () => {
    const analysis = createMockAnalysis();

    // Add a module with both exported and non-exported interfaces/types
    analysis.modules.push({
      filePath: createFilePath('/project/src/internal-types.ts'),
      imports: [],
      exports: [
        {
          name: 'PublicInterface',
          isDefault: false,
          type: 'interface',
        },
        {
          name: 'PublicType',
          isDefault: false,
          type: 'type',
        },
      ],
      functions: [],
      classes: [],
      interfaces: [
        {
          name: 'PublicInterface',
          extends: [],
          properties: [
            {
              name: 'id',
              type: 'string',
              isReadonly: false,
              isStatic: false,
              isPrivate: false,
              isProtected: false,
              isOptional: false,
            },
          ],
          methods: [],
        },
        {
          name: 'InternalInterface', // NOT exported
          extends: [],
          properties: [
            {
              name: 'internalField',
              type: 'string',
              isReadonly: false,
              isStatic: false,
              isPrivate: false,
              isProtected: false,
              isOptional: false,
            },
          ],
          methods: [],
        },
      ],
      types: [
        {
          name: 'PublicType',
          type: 'string | number',
        },
        {
          name: 'InternalType', // NOT exported
          type: 'boolean | null',
        },
      ],
      constants: [],
    } as ParsedModule);

    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);

    assert.equal(result.success, true);
    assert.equal(result.errors.length, 0);

    // Should create DTOs for exported interface and type
    const publicInterface = result.entities.find((e) => e.name === 'PublicInterface');
    assert.notEqual(publicInterface, undefined);
    assert.equal(publicInterface?.kind, 'DTO');

    const publicType = result.entities.find((e) => e.name === 'PublicType');
    assert.notEqual(publicType, undefined);
    // RFC-TM-9 §4 (rfc-tm-9-diamond.md, X-CONV-2) — a non-object-like type
    // alias (here a union, `string | number`) now emits as TM-8's TypeDef
    // entity kind (variant: 'alias'), replacing the deleted converter path
    // that emitted a self-referential Constants schema.
    assert.equal(publicType?.kind, 'TypeDef');

    // Should NOT create DTOs for non-exported interface and type
    const internalInterface = result.entities.find((e) => e.name === 'InternalInterface');
    assert.equal(internalInterface, undefined);

    const internalType = result.entities.find((e) => e.name === 'InternalType');
    assert.equal(internalType, undefined);
  });
});
