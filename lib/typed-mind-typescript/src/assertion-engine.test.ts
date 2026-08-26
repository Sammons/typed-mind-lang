import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { DTOEntity, FunctionEntity } from '@sammons/typed-mind';
import { AssertionEngine } from './assertion-engine.ts';
import type { ConversionResult } from './types.ts';

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

    assert.equal(result.success, true);
    assert.equal(result.deviations.length, 0);
    assert.equal(result.missingEntities.length, 0);
    assert.equal(result.extraEntities.length, 0);
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

    assert.equal(result.success, false);
    assert.ok(result.missingEntities.includes('AdminService'));
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

    assert.equal(result.success, false);
    assert.ok(result.extraEntities.includes('UserService'));
    assert.ok(result.extraEntities.includes('createUser'));
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

    assert.equal(result.success, false);

    const typeDeviation = result.deviations.find((d) => d.entityName === 'UserService' && d.property === 'type');
    assert.notEqual(typeDeviation, undefined);
    assert.equal(typeDeviation?.expected, 'Class');
    assert.equal(typeDeviation?.actual, 'ClassFile');
    assert.equal(typeDeviation?.severity, 'error');
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

    assert.equal(result.success, false);

    const methodDeviation = result.deviations.find((d) => d.entityName === 'UserService' && d.property === 'methods.missing');
    assert.notEqual(methodDeviation, undefined);
    assert.ok(methodDeviation?.expected.includes('updateUser'));
    assert.ok(methodDeviation?.expected.includes('deleteUser'));
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

    assert.equal(result.success, false);

    const missingFieldDeviation = result.deviations.find((d) => d.entityName === 'UserDTO' && d.property === 'field.createdAt');
    assert.notEqual(missingFieldDeviation, undefined);
    assert.equal(missingFieldDeviation?.expected, 'field exists');
    assert.equal(missingFieldDeviation?.actual, 'field missing');
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

    assert.equal(result.success, false);

    const signatureDeviation = result.deviations.find((d) => d.entityName === 'createUser' && d.property === 'signature');
    assert.notEqual(signatureDeviation, undefined);
    assert.equal(signatureDeviation?.severity, 'error');
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

    assert.equal(result.success, false);
    assert.ok(result.deviations.length > 0);

    const syntaxDeviation = result.deviations.find((d) => d.entityName === '<parsing>' && d.property === 'syntax');
    assert.notEqual(syntaxDeviation, undefined);
    assert.equal(syntaxDeviation?.severity, 'error');
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

    assert.equal(result.success, true); // No errors, only warnings

    const warnings = result.deviations.filter((d) => d.severity === 'warning');
    assert.ok(warnings.length > 0);

    const versionWarning = warnings.find((d) => d.entityName === 'IndexApp' && d.property === 'version');
    assert.notEqual(versionWarning, undefined);
    assert.equal(versionWarning?.expected, '2.0.0');
    assert.equal(versionWarning?.actual, '1.0.0');
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

    assert.equal(result.success, false);
    assert.ok(result.missingEntities.includes('UserService'));
  });
});
