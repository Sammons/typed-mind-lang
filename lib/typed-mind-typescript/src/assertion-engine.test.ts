import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ClassFileNode, DtoFieldNode, DtoNode, FunctionNode, ProgramNode, type Span } from '@sammons/typed-mind';
import { AssertionEngine } from './assertion-engine.ts';
import type { ConversionResult } from './types.ts';

// RFC-TM-6 §3 (rfc-tm-6-diamond.md) — this fixture now builds real
// EntityNode subclasses (the converter's own construction shape post-flip)
// instead of legacy bridge-type object literals (`type: 'ClassFile'` +
// `position`). SYNTHETIC_SPAN mirrors the converter's own zero-width span
// per the M8 disposition — this fixture is not itself a converter output,
// but it stands in for one in these (currently skipped) assertion tests.
const SYNTHETIC_SPAN: Span = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };

const createMockConversionResult = (): ConversionResult => ({
  success: true,
  entities: [
    new ClassFileNode({
      name: 'UserService',
      span: SYNTHETIC_SPAN,
      raw: 'UserService #: src/services/user-service.ts',
      sourceForm: 'shortform',
      path: 'src/services/user-service.ts',
      extends: 'BaseService',
      implements: ['IUserService'],
      methods: ['createUser', 'findUser'],
      imports: ['UserDTO', 'CreateUserDTO'],
      exports: [],
    }),
    new FunctionNode({
      name: 'createUser',
      span: SYNTHETIC_SPAN,
      raw: 'createUser :: async createUser(data: CreateUserDTO) => Promise<UserDTO>',
      sourceForm: 'shortform',
      signature: 'async createUser(data: CreateUserDTO) => Promise<UserDTO>',
      calls: [],
      pendingDependencies: [],
      input: 'CreateUserDTO',
      output: 'UserDTO',
    }),
    new DtoNode({
      name: 'UserDTO',
      span: SYNTHETIC_SPAN,
      raw: 'UserDTO %',
      sourceForm: 'shortform',
      fields: [
        new DtoFieldNode({ name: 'id', type: 'string', optionalityMarker: 'none', span: SYNTHETIC_SPAN }),
        new DtoFieldNode({ name: 'name', type: 'string', optionalityMarker: 'none', span: SYNTHETIC_SPAN }),
        new DtoFieldNode({ name: 'email', type: 'string', optionalityMarker: 'none', span: SYNTHETIC_SPAN }),
      ],
    }),
    new ProgramNode({
      name: 'IndexApp',
      span: SYNTHETIC_SPAN,
      raw: 'IndexApp -> main v1.0.0',
      sourceForm: 'shortform',
      entry: 'main',
      version: '1.0.0',
    }),
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
