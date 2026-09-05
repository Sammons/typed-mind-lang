import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ClassFileNode,
  DtoFieldNode,
  DtoNode,
  FunctionNode,
  ProgramNode,
  parseTypeExprText,
  type Span,
  TypedMind,
} from '@sammons/typed-mind';
import { AssertionEngine } from './assertion-engine.ts';
import type { ConversionResult } from './types.ts';

// RFC-TM-6 §3 (rfc-tm-6-diamond.md) — this fixture builds real EntityNode
// subclasses (the converter's own construction shape post-flip). SYNTHETIC_SPAN
// mirrors the converter's zero-width span per the M8 disposition — the fixture
// is not itself a converter output, but it stands in for one here.
const SYNTHETIC_SPAN: Span = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };

// RFC-TM-8 §2 (rfc-tm-8-diamond.md, X-TYPE-2) — DtoFieldNode.typeExpr via the
// shared string-based parser, mirroring the converter's own construction sites.
const stringField = (name: string): DtoFieldNode =>
  new DtoFieldNode({
    name,
    type: 'string',
    typeExpr: parseTypeExprText('string').typeExpr,
    optionalityMarker: 'none',
    span: SYNTHETIC_SPAN,
  });

// Checker-clean reference document. `assert()` gates on `check().valid`
// before it compares graphs, so every expected document in this suite must
// clear the checker; this one is the baseline the mock ConversionResult
// mirrors entity-for-entity. What keeps it clean: the Program's entry is a
// declared ClassFile, every ClassFile is reached (entry, `extends`,
// `implements`, or an import), every method name resolves to a declared
// Function, and every DTO is imported or is a Function input/output.
// `should validate the shared fixture` proves zero findings on this text.
const CHECKER_CLEAN_TMD = `
IndexApp -> UserService v1.0.0

UserService #: src/services/user-service.ts <: BaseService, IUserService
  <- [UserDTO, CreateUserDTO]
  => [createUser, findUser]

BaseService #: src/services/base-service.ts

IUserService #: src/services/user-service-interface.ts

createUser :: async createUser(data: CreateUserDTO) => Promise<UserDTO>
  <- CreateUserDTO
  -> UserDTO

findUser :: findUser(id: string) => Promise<UserDTO>
  -> UserDTO

UserDTO %
  - id: string
  - name: string
  - email: string

CreateUserDTO %
  - name: string
  - email: string
`.trim();

const classFile = (name: string, path: string): ClassFileNode =>
  new ClassFileNode({
    name,
    span: SYNTHETIC_SPAN,
    raw: `${name} #: ${path}`,
    sourceForm: 'shortform',
    path,
    implements: [],
    methods: [],
    imports: [],
    // A shortform ClassFile exports itself (class-file-node.ts:46); the
    // parser produces the same list, so the mock must carry it to compare equal.
    exports: [name],
  });

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
      exports: ['UserService'],
    }),
    classFile('BaseService', 'src/services/base-service.ts'),
    classFile('IUserService', 'src/services/user-service-interface.ts'),
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
    new FunctionNode({
      name: 'findUser',
      span: SYNTHETIC_SPAN,
      raw: 'findUser :: findUser(id: string) => Promise<UserDTO>',
      sourceForm: 'shortform',
      signature: 'findUser(id: string) => Promise<UserDTO>',
      calls: [],
      pendingDependencies: [],
      output: 'UserDTO',
    }),
    new DtoNode({
      name: 'UserDTO',
      span: SYNTHETIC_SPAN,
      raw: 'UserDTO %',
      sourceForm: 'shortform',
      fields: [stringField('id'), stringField('name'), stringField('email')],
    }),
    new DtoNode({
      name: 'CreateUserDTO',
      span: SYNTHETIC_SPAN,
      raw: 'CreateUserDTO %',
      sourceForm: 'shortform',
      fields: [stringField('name'), stringField('email')],
    }),
    new ProgramNode({
      name: 'IndexApp',
      span: SYNTHETIC_SPAN,
      raw: 'IndexApp -> UserService v1.0.0',
      sourceForm: 'shortform',
      entry: 'UserService',
      version: '1.0.0',
    }),
  ],
  tmdContent: CHECKER_CLEAN_TMD,
  errors: [],
  warnings: [],
});

// Every expected document below is checker-clean by construction, so each
// test exercises `compareGraphs`, not the `!validationResult.valid` short
// circuit. The suite was `describe.skip` (commit ca02cff) and then nine
// `it.skip` (PR #151) until the fixtures were rebuilt against the checker.
describe('AssertionEngine', () => {
  it('should validate the shared fixture', async () => {
    const typedMind = await TypedMind.create();

    const validationResult = typedMind.check(CHECKER_CLEAN_TMD, 'test.tmd');

    assert.equal(validationResult.valid, true);
    assert.deepEqual(validationResult.diagnostics, []);
  });

  it('should pass assertion when TypeScript matches expected TMD', async () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    const result = await engine.assert(conversionResult, 'test.tmd', CHECKER_CLEAN_TMD);

    // Mock and document carry the same eight entities, so nothing deviates.
    assert.deepEqual(result, { success: true, deviations: [], missingEntities: [], extraEntities: [] });
  });

  it('should detect missing entities', async () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    // AdminService is imported by UserService so it is not orphaned; deleteUser
    // is declared so the method name resolves.
    const expectedTMD = `
IndexApp -> UserService v1.0.0

UserService #: src/services/user-service.ts <: BaseService, IUserService
  <- [UserDTO, CreateUserDTO, AdminService]
  => [createUser, findUser]

BaseService #: src/services/base-service.ts

IUserService #: src/services/user-service-interface.ts

AdminService #: src/services/admin-service.ts
  => [deleteUser]

createUser :: async createUser(data: CreateUserDTO) => Promise<UserDTO>
  <- CreateUserDTO
  -> UserDTO

findUser :: findUser(id: string) => Promise<UserDTO>
  -> UserDTO

deleteUser :: deleteUser(id: string) => Promise<void>

UserDTO %
  - id: string
  - name: string
  - email: string

CreateUserDTO %
  - name: string
  - email: string
    `.trim();

    const result = await engine.assert(conversionResult, 'test.tmd', expectedTMD);

    assert.equal(result.success, false);
    // deleteUser joins AdminService: the clean fixture must declare it as a Function.
    assert.deepEqual(result.missingEntities, ['AdminService', 'deleteUser']);
    assert.deepEqual(result.extraEntities, []);
  });

  it('should detect extra entities', async () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    // A Program needs a declared entry and a DTO needs an importer, so the
    // minimal clean document is one File importing the DTO.
    const expectedTMD = `
IndexApp -> Main v1.0.0

Main @ src/main.ts:
  <- [UserDTO]

UserDTO %
  - id: string
  - name: string
    `.trim();

    const result = await engine.assert(conversionResult, 'test.tmd', expectedTMD);

    assert.equal(result.success, false);
    assert.ok(result.extraEntities.includes('UserService'));
    assert.ok(result.extraEntities.includes('createUser'));
    // Main exists only in the expected document.
    assert.deepEqual(result.missingEntities, ['Main']);
  });

  it('should detect entity type mismatches', async () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    // A Class must be exported by a File and imported by another to pass the
    // orphan and class-not-exported checks.
    const expectedTMD = `
IndexApp -> App v1.0.0

App @ src/app.ts:
  <- [UserService]

UserModule @ src/services/user-service.ts:
  <- [UserDTO]
  -> [UserService]

UserService <: BaseService
  => [createUser, findUser]

BaseService #: src/services/base-service.ts

createUser :: async createUser(data: UserDTO) => Promise<UserDTO>
  <- UserDTO
  -> UserDTO

findUser :: findUser(id: string) => Promise<UserDTO>
  -> UserDTO

UserDTO %
  - id: string
    `.trim();

    const result = await engine.assert(conversionResult, 'test.tmd', expectedTMD);

    assert.equal(result.success, false);

    const typeDeviation = result.deviations.find((d) => d.entityName === 'UserService' && d.property === 'type');
    assert.deepEqual(typeDeviation, {
      entityName: 'UserService',
      property: 'type',
      expected: 'Class',
      actual: 'ClassFile',
      severity: 'error',
    });
  });

  it('should detect method differences', async () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    // updateUser and deleteUser are declared so every listed method resolves.
    const expectedTMD = `
IndexApp -> UserService v1.0.0

UserService #: src/services/user-service.ts
  <- [UserDTO]
  => [createUser, findUser, updateUser, deleteUser]

createUser :: async createUser(data: UserDTO) => Promise<UserDTO>
  <- UserDTO
  -> UserDTO

findUser :: findUser(id: string) => Promise<UserDTO>
  -> UserDTO

updateUser :: updateUser(id: string) => Promise<UserDTO>
  -> UserDTO

deleteUser :: deleteUser(id: string) => Promise<void>

UserDTO %
  - id: string
    `.trim();

    const result = await engine.assert(conversionResult, 'test.tmd', expectedTMD);

    assert.equal(result.success, false);

    const methodDeviation = result.deviations.find((d) => d.entityName === 'UserService' && d.property === 'methods.missing');
    assert.deepEqual(methodDeviation, {
      entityName: 'UserService',
      property: 'methods.missing',
      expected: 'updateUser, deleteUser',
      actual: 'not present',
      severity: 'error',
    });
  });

  it('should detect DTO field differences', async () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    const expectedTMD = `
IndexApp -> Main v1.0.0

Main @ src/main.ts:
  <- [UserDTO]

UserDTO %
  - id: string
  - name: string
  - email: string
  - createdAt: Date
  - updatedAt?: Date
    `.trim();

    const result = await engine.assert(conversionResult, 'test.tmd', expectedTMD);

    assert.equal(result.success, false);

    const fieldDeviations = result.deviations.filter((d) => d.entityName === 'UserDTO');
    // updatedAt is also absent from the mock, so it deviates alongside createdAt.
    assert.deepEqual(fieldDeviations, [
      { entityName: 'UserDTO', property: 'field.createdAt', expected: 'field exists', actual: 'field missing', severity: 'error' },
      { entityName: 'UserDTO', property: 'field.updatedAt', expected: 'field exists', actual: 'field missing', severity: 'error' },
    ]);
  });

  it('should detect function signature mismatches', async () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    // createUser needs an owner (the ClassFile lists it as a method) and its
    // input/output DTOs must be declared.
    const expectedTMD = `
IndexApp -> UserService v1.0.0

UserService #: src/services/user-service.ts
  <- [User, UserCreateData]
  => [createUser]

createUser :: createUser(data: UserCreateData) => User
  <- UserCreateData
  -> User

User %
  - id: string

UserCreateData %
  - name: string
    `.trim();

    const result = await engine.assert(conversionResult, 'test.tmd', expectedTMD);

    assert.equal(result.success, false);

    const signatureDeviation = result.deviations.find((d) => d.entityName === 'createUser' && d.property === 'signature');
    assert.deepEqual(signatureDeviation, {
      entityName: 'createUser',
      property: 'signature',
      expected: 'createUser(data: UserCreateData) => User',
      actual: 'async createUser(data: CreateUserDTO) => Promise<UserDTO>',
      severity: 'error',
    });
  });

  it('should handle invalid TMD syntax', async () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    const invalidTMD = `
    Invalid TMD syntax here!!!
    UserService #: invalid/path
      <- [NonExistent
    `;

    const result = await engine.assert(conversionResult, 'test.tmd', invalidTMD);

    assert.equal(result.success, false);
    assert.ok(result.deviations.length > 0);

    const syntaxDeviation = result.deviations.find((d) => d.entityName === '<parsing>' && d.property === 'syntax');
    assert.notEqual(syntaxDeviation, undefined);
    assert.equal(syntaxDeviation?.severity, 'error');
  });

  it('should distinguish between errors and warnings', async () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    // Same entity set as the clean fixture; only the Program version and the
    // ClassFile path differ, and both compare at warning severity.
    const expectedTMD = CHECKER_CLEAN_TMD.replace('v1.0.0', 'v2.0.0').replace(
      'UserService #: src/services/user-service.ts',
      'UserService #: different/path/user-service.ts',
    );

    const result = await engine.assert(conversionResult, 'test.tmd', expectedTMD);

    assert.equal(result.success, true); // No errors, only warnings
    // Exactly the two warning-severity deviations the fixture edits introduce.
    assert.deepEqual(result.deviations, [
      { entityName: 'IndexApp', property: 'version', expected: '2.0.0', actual: '1.0.0', severity: 'warning' },
      {
        entityName: 'UserService',
        property: 'path',
        expected: 'different/path/user-service.ts',
        actual: 'src/services/user-service.ts',
        severity: 'warning',
      },
    ]);
  });

  it('should handle empty conversion results', async () => {
    const engine = new AssertionEngine();
    const emptyResult: ConversionResult = {
      success: true,
      entities: [],
      tmdContent: '',
      errors: [],
      warnings: [],
    };

    // The Program makes UserService the entry so it is not orphaned.
    const expectedTMD = `
IndexApp -> UserService v1.0.0

UserService #: src/user.ts
  => [createUser]

createUser :: createUser() => void
    `.trim();

    const result = await engine.assert(emptyResult, 'test.tmd', expectedTMD);

    assert.equal(result.success, false);
    assert.ok(result.missingEntities.includes('UserService'));
  });
});
