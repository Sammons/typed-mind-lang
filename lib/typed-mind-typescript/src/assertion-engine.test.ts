import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ClassFileNode, DtoFieldNode, DtoNode, FunctionNode, ProgramNode, parseTypeExprText, type Span } from '@sammons/typed-mind';
import { AssertionEngine } from './assertion-engine.ts';
import type { ConversionResult } from './types.ts';

// RFC-TM-6 §3 (rfc-tm-6-diamond.md) — this fixture now builds real
// EntityNode subclasses (the converter's own construction shape post-flip)
// instead of legacy bridge-type object literals (`type: 'ClassFile'` +
// `position`). SYNTHETIC_SPAN mirrors the converter's own zero-width span
// per the M8 disposition — this fixture is not itself a converter output,
// but it stands in for one in these (currently skipped) assertion tests.
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
      fields: [stringField('id'), stringField('name'), stringField('email')],
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

// This suite was `describe.skip`, which hid all ten tests from the runner's
// skip count entirely — they reported as neither passing, failing, nor
// skipped, so nothing signalled that the coverage was gone. Two independent
// defects were behind the skip:
//
// 1. Mechanical, now FIXED: `assert()` is async (RFC-TM-6 §3 moved it onto
//    `TypedMind.create()`, which needs a wasm init), but every test called it
//    without `await` and read `.success` off the Promise — always `undefined`.
//    All ten now await it.
//
// 2. Substantive, still OPEN: the shared `expectedTMD` fixture is not a
//    checker-valid document. `check()` reports six errors against it
//    (orphaned `UserService`, undefined entry point `main`, and missing
//    `BaseService` / `IUserService` / `CreateUserDTO`), so the checker-gated
//    `assert()` short-circuits on `!validationResult.valid` and returns
//    `success: false` with EMPTY `missingEntities` / `extraEntities` before
//    `compareGraphs` ever runs. Every comparison assertion is therefore
//    reading the parse-failure result, not a comparison result.
//
// Fixing (2) means rebuilding the fixture into a checker-clean document —
// which changes what each test exercises and is a real piece of design work,
// not a mechanical repair. Those nine are `it.skip` with per-test reasons so
// they COUNT as skipped and stay visible. `should handle invalid TMD syntax`
// is not affected: it asserts the invalid-document path deliberately, so it
// passes and runs.
describe('AssertionEngine', () => {
  // SKIP: the shared expectedTMD fixture is not a checker-valid document (orphaned UserService, undefined entry `main`, missing BaseService/IUserService/CreateUserDTO), so RFC-TM-6's checker-gated assert() short-circuits on !valid and never reaches compareGraphs.
  it.skip('should pass assertion when TypeScript matches expected TMD', async () => {
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

    const result = await engine.assert(conversionResult, 'test.tmd', expectedTMD);

    assert.equal(result.success, true);
    assert.equal(result.deviations.length, 0);
    assert.equal(result.missingEntities.length, 0);
    assert.equal(result.extraEntities.length, 0);
  });

  // SKIP: the shared expectedTMD fixture is not a checker-valid document (orphaned UserService, undefined entry `main`, missing BaseService/IUserService/CreateUserDTO), so RFC-TM-6's checker-gated assert() short-circuits on !valid and never reaches compareGraphs.
  it.skip('should detect missing entities', async () => {
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

    const result = await engine.assert(conversionResult, 'test.tmd', expectedTMD);

    assert.equal(result.success, false);
    assert.ok(result.missingEntities.includes('AdminService'));
  });

  // SKIP: the shared expectedTMD fixture is not a checker-valid document (orphaned UserService, undefined entry `main`, missing BaseService/IUserService/CreateUserDTO), so RFC-TM-6's checker-gated assert() short-circuits on !valid and never reaches compareGraphs.
  it.skip('should detect extra entities', async () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    const expectedTMD = `
IndexApp -> main v1.0.0

UserDTO %
  - id: string
  - name: string
    `.trim();

    const result = await engine.assert(conversionResult, 'test.tmd', expectedTMD);

    assert.equal(result.success, false);
    assert.ok(result.extraEntities.includes('UserService'));
    assert.ok(result.extraEntities.includes('createUser'));
  });

  // SKIP: the shared expectedTMD fixture is not a checker-valid document (orphaned UserService, undefined entry `main`, missing BaseService/IUserService/CreateUserDTO), so RFC-TM-6's checker-gated assert() short-circuits on !valid and never reaches compareGraphs.
  it.skip('should detect entity type mismatches', async () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    const expectedTMD = `
UserService <: BaseService
  => [createUser, findUser]

UserDTO %
  - id: string
    `.trim();

    const result = await engine.assert(conversionResult, 'test.tmd', expectedTMD);

    assert.equal(result.success, false);

    const typeDeviation = result.deviations.find((d) => d.entityName === 'UserService' && d.property === 'type');
    assert.notEqual(typeDeviation, undefined);
    assert.equal(typeDeviation?.expected, 'Class');
    assert.equal(typeDeviation?.actual, 'ClassFile');
    assert.equal(typeDeviation?.severity, 'error');
  });

  // SKIP: the shared expectedTMD fixture is not a checker-valid document (orphaned UserService, undefined entry `main`, missing BaseService/IUserService/CreateUserDTO), so RFC-TM-6's checker-gated assert() short-circuits on !valid and never reaches compareGraphs.
  it.skip('should detect method differences', async () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    const expectedTMD = `
UserService #: src/services/user-service.ts
  => [createUser, findUser, updateUser, deleteUser]

UserDTO %
  - id: string
    `.trim();

    const result = await engine.assert(conversionResult, 'test.tmd', expectedTMD);

    assert.equal(result.success, false);

    const methodDeviation = result.deviations.find((d) => d.entityName === 'UserService' && d.property === 'methods.missing');
    assert.notEqual(methodDeviation, undefined);
    assert.ok(methodDeviation?.expected.includes('updateUser'));
    assert.ok(methodDeviation?.expected.includes('deleteUser'));
  });

  // SKIP: the shared expectedTMD fixture is not a checker-valid document (orphaned UserService, undefined entry `main`, missing BaseService/IUserService/CreateUserDTO), so RFC-TM-6's checker-gated assert() short-circuits on !valid and never reaches compareGraphs.
  it.skip('should detect DTO field differences', async () => {
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

    const result = await engine.assert(conversionResult, 'test.tmd', expectedTMD);

    assert.equal(result.success, false);

    const missingFieldDeviation = result.deviations.find((d) => d.entityName === 'UserDTO' && d.property === 'field.createdAt');
    assert.notEqual(missingFieldDeviation, undefined);
    assert.equal(missingFieldDeviation?.expected, 'field exists');
    assert.equal(missingFieldDeviation?.actual, 'field missing');
  });

  // SKIP: the shared expectedTMD fixture is not a checker-valid document (orphaned UserService, undefined entry `main`, missing BaseService/IUserService/CreateUserDTO), so RFC-TM-6's checker-gated assert() short-circuits on !valid and never reaches compareGraphs.
  it.skip('should detect function signature mismatches', async () => {
    const engine = new AssertionEngine();
    const conversionResult = createMockConversionResult();

    const expectedTMD = `
createUser :: createUser(data: UserCreateData) => User
  <- UserCreateData
  -> User
    `.trim();

    const result = await engine.assert(conversionResult, 'test.tmd', expectedTMD);

    assert.equal(result.success, false);

    const signatureDeviation = result.deviations.find((d) => d.entityName === 'createUser' && d.property === 'signature');
    assert.notEqual(signatureDeviation, undefined);
    assert.equal(signatureDeviation?.severity, 'error');
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

  // SKIP: the shared expectedTMD fixture is not a checker-valid document (orphaned UserService, undefined entry `main`, missing BaseService/IUserService/CreateUserDTO), so RFC-TM-6's checker-gated assert() short-circuits on !valid and never reaches compareGraphs.
  it.skip('should distinguish between errors and warnings', async () => {
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

    const result = await engine.assert(conversionResult, 'test.tmd', expectedTMD);

    assert.equal(result.success, true); // No errors, only warnings

    const warnings = result.deviations.filter((d) => d.severity === 'warning');
    assert.ok(warnings.length > 0);

    const versionWarning = warnings.find((d) => d.entityName === 'IndexApp' && d.property === 'version');
    assert.notEqual(versionWarning, undefined);
    assert.equal(versionWarning?.expected, '2.0.0');
    assert.equal(versionWarning?.actual, '1.0.0');
  });

  // SKIP: the shared expectedTMD fixture is not a checker-valid document (orphaned UserService, undefined entry `main`, missing BaseService/IUserService/CreateUserDTO), so RFC-TM-6's checker-gated assert() short-circuits on !valid and never reaches compareGraphs.
  it.skip('should handle empty conversion results', async () => {
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

    const result = await engine.assert(emptyResult, 'test.tmd', expectedTMD);

    assert.equal(result.success, false);
    assert.ok(result.missingEntities.includes('UserService'));
  });
});
