import { describe, it, expect } from 'vitest';
import { TypeScriptToTypedMindConverter } from './typescript-to-typedmind-converter.ts';
import type { TypeScriptProjectAnalysis, ParsedModule } from './types.ts';
import { createFilePath } from './types.ts';

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
});

describe('TypeScriptToTypedMindConverter', () => {
  it('should convert TypeScript analysis to TypedMind entities', () => {
    const converter = new TypeScriptToTypedMindConverter();
    const analysis = createMockAnalysis();

    const result = converter.convert(analysis);

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.entities.length).toBeGreaterThan(0);
  });

  it('should use ClassFile fusion by default', () => {
    const converter = new TypeScriptToTypedMindConverter({ preferClassFile: true });
    const analysis = createMockAnalysis();

    const result = converter.convert(analysis);

    const userServiceEntity = result.entities.find((e) => e.name === 'UserService');
    expect(userServiceEntity).toBeDefined();
    expect(userServiceEntity?.type).toBe('ClassFile');

    // Should have both class methods and file imports/exports
    const classFile = userServiceEntity as any;
    expect(classFile.methods).toContain('createUser');
    expect(classFile.methods).toContain('findUser');
    expect(classFile.imports).toContain('UserDTO');
    expect(classFile.imports).toContain('CreateUserDTO');
  });

  it('should create separate entities when preferClassFile is false', () => {
    const converter = new TypeScriptToTypedMindConverter({ preferClassFile: false });
    const analysis = createMockAnalysis();

    const result = converter.convert(analysis);

    const fileEntity = result.entities.find((e) => e.name === 'UserServiceFile');
    const classEntity = result.entities.find((e) => e.name === 'UserService');

    expect(fileEntity).toBeDefined();
    expect(fileEntity?.type).toBe('File');
    expect(classEntity).toBeDefined();
    expect(classEntity?.type).toBe('Class');
  });

  it('should convert interfaces to DTOs', () => {
    const converter = new TypeScriptToTypedMindConverter();
    const analysis = createMockAnalysis();

    const result = converter.convert(analysis);

    const userDTO = result.entities.find((e) => e.name === 'UserDTO');
    expect(userDTO).toBeDefined();
    expect(userDTO?.type).toBe('DTO');

    const dto = userDTO as any;
    expect(dto.fields).toHaveLength(4);

    const idField = dto.fields.find((f: any) => f.name === 'id');
    expect(idField.type).toBe('string');
    expect(idField.optional).toBe(false);

    const createdAtField = dto.fields.find((f: any) => f.name === 'createdAt');
    expect(createdAtField.optional).toBe(true);
  });

  it('should generate programs by default', () => {
    const converter = new TypeScriptToTypedMindConverter({ generatePrograms: true });
    const analysis = createMockAnalysis();

    const result = converter.convert(analysis);

    const program = result.entities.find((e) => e.type === 'Program');
    expect(program).toBeDefined();
    expect(program?.name).toMatch(/App$/);
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
    expect(userServiceEntity.methods).not.toContain('privateHelper');
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
    expect(userServiceEntity.methods).toContain('privateHelper');
  });

  it('should generate valid TMD content', () => {
    const converter = new TypeScriptToTypedMindConverter();
    const analysis = createMockAnalysis();

    const result = converter.convert(analysis);

    expect(result.tmdContent).toBeTruthy();
    expect(result.tmdContent).toContain('# Programs');
    expect(result.tmdContent).toContain('# ClassFiles');
    expect(result.tmdContent).toContain('# DTOs');
    expect(result.tmdContent).toContain('UserService #:');
    expect(result.tmdContent).toContain('UserDTO %');
    expect(result.tmdContent).toContain('=> [createUser, findUser]');
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

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('Duplicate entity name');
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
    expect(result.success).toBe(true);
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

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);

    // Should create DTOs for exported interface and type
    const publicInterface = result.entities.find((e) => e.name === 'PublicInterface');
    expect(publicInterface).toBeDefined();
    expect(publicInterface?.type).toBe('DTO');

    const publicType = result.entities.find((e) => e.name === 'PublicType');
    expect(publicType).toBeDefined();
    expect(publicType?.type).toBe('Constants'); // Type aliases become Constants

    // Should NOT create DTOs for non-exported interface and type
    const internalInterface = result.entities.find((e) => e.name === 'InternalInterface');
    expect(internalInterface).toBeUndefined();

    const internalType = result.entities.find((e) => e.name === 'InternalType');
    expect(internalType).toBeUndefined();
  });
});
