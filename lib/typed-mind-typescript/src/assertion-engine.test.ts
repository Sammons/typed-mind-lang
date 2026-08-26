import { describe, it, expect } from 'vitest';
import { AssertionEngine } from './assertion-engine.ts';
import type { ConversionResult } from './types.ts';
import { FunctionEntity, DTOEntity } from '@sammons/typed-mind';

const createMockConversionResult = (): ConversionResult => ({
  success: true,
  entities: [
    {
      name: 'UserService',
      type: 'ClassFile',
      position: { line: 1, column: 1 },
      raw: 'UserService #: src/services/user-service.ts',
      path: 'src/services/user-service.ts',
      extends: 'BaseService',
      implements: ['IUserService'],
      methods: ['createUser', 'findUser'],
      imports: ['UserDTO', 'CreateUserDTO'],
      exports: [],
    },
    {
      name: 'createUser',
      type: 'Function',
      position: { line: 5, column: 1 },
      raw: 'createUser :: async createUser(data: CreateUserDTO) => Promise<UserDTO>',
      signature: 'async createUser(data: CreateUserDTO) => Promise<UserDTO>',
      calls: [],
      input: 'CreateUserDTO',
      output: 'UserDTO',
    } as FunctionEntity,
    {
      name: 'UserDTO',
      type: 'DTO',
      position: { line: 10, column: 1 },
      raw: 'UserDTO %',
      fields: [
        {
          name: 'id',
          type: 'string',
          optional: false,
        },
        {
          name: 'name',
          type: 'string',
          optional: false,
        },
        {
          name: 'email',
          type: 'string',
          optional: false,
        },
      ],
    } as DTOEntity,
    {
      name: 'IndexApp',
      type: 'Program',
      position: { line: 1, column: 1 },
      raw: 'IndexApp -> main v1.0.0',
      entry: 'main',
      version: '1.0.0',
    },
  ],
  tmdContent: `
# Programs
IndexApp -> main v1.0.0

# ClassFiles
UserService #: src/services/user-service.ts <: BaseService, IUserService
  <- [UserDTO, CreateUserDTO]
  => [createUser, findUser]

# Functions  
createUser :: async createUser(data: CreateUserDTO) => Promise<UserDTO>
  <- CreateUserDTO
  -> UserDTO

# DTOs
UserDTO %
  - id: string
  - name: string
  - email: string
  `.trim(),
  errors: [],
  warnings: [],
});

describe.skip('AssertionEngine', () => {
  it('should pass assertion when TypeScript matches expected TMD', () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    const expectedTMD = `
IndexApp -> main v1.0.0

UserService #: src/services/user-service.ts <: BaseService, IUserService
  <- [UserDTO, CreateUserDTO]
  => [createUser, findUser]

createUser :: async createUser(data: CreateUserDTO) => Promise<UserDTO>
  <- CreateUserDTO
  -> UserDTO

UserDTO %
  - id: string
  - name: string  
  - email: string
    `.trim();

    const result = engine.assert(conversionResult, 'test.tmd', expectedTMD);

    expect(result.success).toBe(true);
    expect(result.deviations).toHaveLength(0);
    expect(result.missingEntities).toHaveLength(0);
    expect(result.extraEntities).toHaveLength(0);
  });

  it('should detect missing entities', () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    const expectedTMD = `
IndexApp -> main v1.0.0

UserService #: src/services/user-service.ts <: BaseService
  => [createUser, findUser]

AdminService #: src/services/admin-service.ts
  => [deleteUser]

UserDTO %
  - id: string
  - name: string
    `.trim();

    const result = engine.assert(conversionResult, 'test.tmd', expectedTMD);

    expect(result.success).toBe(false);
    expect(result.missingEntities).toContain('AdminService');
  });

  it('should detect extra entities', () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    const expectedTMD = `
IndexApp -> main v1.0.0

UserDTO %
  - id: string
  - name: string
    `.trim();

    const result = engine.assert(conversionResult, 'test.tmd', expectedTMD);

    expect(result.success).toBe(false);
    expect(result.extraEntities).toContain('UserService');
    expect(result.extraEntities).toContain('createUser');
  });

  it('should detect entity type mismatches', () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    const expectedTMD = `
UserService <: BaseService
  => [createUser, findUser]

UserDTO %
  - id: string
    `.trim();

    const result = engine.assert(conversionResult, 'test.tmd', expectedTMD);

    expect(result.success).toBe(false);

    const typeDeviation = result.deviations.find((d) => d.entityName === 'UserService' && d.property === 'type');
    expect(typeDeviation).toBeDefined();
    expect(typeDeviation?.expected).toBe('Class');
    expect(typeDeviation?.actual).toBe('ClassFile');
    expect(typeDeviation?.severity).toBe('error');
  });

  it('should detect method differences', () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    const expectedTMD = `
UserService #: src/services/user-service.ts
  => [createUser, findUser, updateUser, deleteUser]

UserDTO %
  - id: string
    `.trim();

    const result = engine.assert(conversionResult, 'test.tmd', expectedTMD);

    expect(result.success).toBe(false);

    const methodDeviation = result.deviations.find((d) => d.entityName === 'UserService' && d.property === 'methods.missing');
    expect(methodDeviation).toBeDefined();
    expect(methodDeviation?.expected).toContain('updateUser');
    expect(methodDeviation?.expected).toContain('deleteUser');
  });

  it('should detect DTO field differences', () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    const expectedTMD = `
UserDTO %
  - id: string
  - name: string
  - email: string
  - createdAt: Date
  - updatedAt?: Date
    `.trim();

    const result = engine.assert(conversionResult, 'test.tmd', expectedTMD);

    expect(result.success).toBe(false);

    const missingFieldDeviation = result.deviations.find((d) => d.entityName === 'UserDTO' && d.property === 'field.createdAt');
    expect(missingFieldDeviation).toBeDefined();
    expect(missingFieldDeviation?.expected).toBe('field exists');
    expect(missingFieldDeviation?.actual).toBe('field missing');
  });

  it('should detect function signature mismatches', () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    const expectedTMD = `
createUser :: createUser(data: UserCreateData) => User
  <- UserCreateData
  -> User
    `.trim();

    const result = engine.assert(conversionResult, 'test.tmd', expectedTMD);

    expect(result.success).toBe(false);

    const signatureDeviation = result.deviations.find((d) => d.entityName === 'createUser' && d.property === 'signature');
    expect(signatureDeviation).toBeDefined();
    expect(signatureDeviation?.severity).toBe('error');
  });

  it('should handle invalid TMD syntax', () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    const invalidTMD = `
    Invalid TMD syntax here!!!
    UserService #: invalid/path
      <- [NonExistent
    `;

    const result = engine.assert(conversionResult, 'test.tmd', invalidTMD);

    expect(result.success).toBe(false);
    expect(result.deviations.length).toBeGreaterThan(0);

    const syntaxDeviation = result.deviations.find((d) => d.entityName === '<parsing>' && d.property === 'syntax');
    expect(syntaxDeviation).toBeDefined();
    expect(syntaxDeviation?.severity).toBe('error');
  });

  it('should distinguish between errors and warnings', () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    const expectedTMD = `
IndexApp -> main v2.0.0

UserService #: different/path/user-service.ts <: BaseService
  => [createUser, findUser]

UserDTO %
  - id: string
  - name: string
  - email: string
    `.trim();

    const result = engine.assert(conversionResult, 'test.tmd', expectedTMD);

    expect(result.success).toBe(true); // No errors, only warnings

    const warnings = result.deviations.filter((d) => d.severity === 'warning');
    expect(warnings.length).toBeGreaterThan(0);

    const versionWarning = warnings.find((d) => d.entityName === 'IndexApp' && d.property === 'version');
    expect(versionWarning).toBeDefined();
    expect(versionWarning?.expected).toBe('2.0.0');
    expect(versionWarning?.actual).toBe('1.0.0');
  });

  it('should handle empty conversion results', () => {
    const engine = new AssertionEngine();
    const emptyResult: ConversionResult = {
      success: true,
      entities: [],
      tmdContent: '',
      errors: [],
      warnings: [],
    };

    const expectedTMD = `
UserService #: src/user.ts
  => [createUser]
    `.trim();

    const result = engine.assert(emptyResult, 'test.tmd', expectedTMD);

    expect(result.success).toBe(false);
    expect(result.missingEntities).toContain('UserService');
  });
});
