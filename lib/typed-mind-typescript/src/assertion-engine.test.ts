import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ClassFileNode,
  ClassNode,
  DtoFieldNode,
  DtoNode,
  FileNode,
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

const typedField = (name: string, type: string): DtoFieldNode =>
  new DtoFieldNode({
    name,
    type,
    typeExpr: parseTypeExprText(type).typeExpr,
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
    // Every mock entity except IndexApp and UserDTO is extra, in mock order.
    assert.deepEqual(result.extraEntities, ['UserService', 'BaseService', 'IUserService', 'createUser', 'findUser', 'CreateUserDTO']);
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
      code: 'assertion/entity-kind-mismatch',
      entityName: 'UserService',
      property: 'type',
      expected: 'Class',
      actual: 'ClassFile',
      severity: 'error',
      suggestion: 'Change the entity declaration in the TMD to match the source kind.',
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
      code: 'assertion/member-missing',
      entityName: 'UserService',
      property: 'methods.missing',
      expected: 'updateUser, deleteUser',
      actual: 'not present',
      severity: 'error',
      suggestion: 'Add the missing member to the source, or remove it from the TMD.',
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
      { code: 'assertion/field-missing', entityName: 'UserDTO', property: 'field.createdAt', expected: 'field exists', actual: 'field missing', severity: 'error', suggestion: 'Add the missing field to the TypeScript type, or remove it from the TMD.' },
      { code: 'assertion/field-missing', entityName: 'UserDTO', property: 'field.updatedAt', expected: 'field exists', actual: 'field missing', severity: 'error', suggestion: 'Add the missing field to the TypeScript type, or remove it from the TMD.' },
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
      code: 'assertion/signature-mismatch',
      entityName: 'createUser',
      property: 'signature',
      expected: 'createUser(data: UserCreateData) => User',
      actual: 'async createUser(data: CreateUserDTO) => Promise<UserDTO>',
      severity: 'error',
      suggestion: 'Update the function signature in the TMD to match the source.',
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
      {
        code: 'assertion/version-mismatch',
        entityName: 'IndexApp',
        property: 'version',
        expected: '2.0.0',
        actual: '1.0.0',
        severity: 'warning',
        suggestion: 'Update the version in the TMD Program declaration.',
      },
      {
        code: 'assertion/path-mismatch',
        entityName: 'UserService',
        property: 'path',
        expected: 'different/path/user-service.ts',
        actual: 'src/services/user-service.ts',
        severity: 'warning',
        suggestion: 'Update the file path in the TMD entity declaration.',
      },
    ]);
  });

  it('should normalize async prefix and function name in signatures (#211)', async () => {
    const engine = new AssertionEngine();

    const tmd = `
IndexApp -> UserService v1.0.0

UserService #: src/services/user-service.ts
  <- [UserDTO]
  => [createUser, findUser]

createUser :: (data: CreateUserDTO) => Promise<UserDTO>
  <- CreateUserDTO
  -> UserDTO

findUser :: (id: string) => Promise<UserDTO>
  -> UserDTO

UserDTO %
  - id: string

CreateUserDTO %
  - name: string
    `.trim();

    const conversionResult: ConversionResult = {
      success: true,
      entities: [
        new ClassFileNode({
          name: 'UserService',
          span: SYNTHETIC_SPAN,
          raw: 'UserService #: src/services/user-service.ts',
          sourceForm: 'shortform',
          path: 'src/services/user-service.ts',
          methods: ['createUser', 'findUser'],
          imports: ['UserDTO', 'CreateUserDTO'],
          exports: ['UserService'],
          implements: [],
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
          fields: [stringField('id')],
        }),
        new DtoNode({
          name: 'CreateUserDTO',
          span: SYNTHETIC_SPAN,
          raw: 'CreateUserDTO %',
          sourceForm: 'shortform',
          fields: [stringField('name')],
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
      tmdContent: tmd,
      errors: [],
      warnings: [],
    };

    const result = await engine.assert(conversionResult, 'test.tmd', tmd);

    const signatureDeviations = result.deviations.filter((d) => d.property === 'signature');
    assert.deepEqual(signatureDeviations, []);
  });

  it('should skip entity-level exports/imports in module boundary comparison (#212)', async () => {
    const engine = new AssertionEngine();

    const tmd = `
IndexApp -> ClientIpFile v1.0.0

ClientIpFile @ src/client-ip.ts:
  -> [ClientIp]

ClientIp %
  - address: string
    `.trim();

    const conversionResult: ConversionResult = {
      success: true,
      entities: [
        new ProgramNode({
          name: 'IndexApp',
          span: SYNTHETIC_SPAN,
          raw: 'IndexApp -> ClientIpFile v1.0.0',
          sourceForm: 'shortform',
          entry: 'ClientIpFile',
          version: '1.0.0',
        }),
        new FileNode({
          name: 'ClientIpFile',
          span: SYNTHETIC_SPAN,
          raw: 'ClientIpFile @ src/client-ip.ts:',
          sourceForm: 'longform',
          path: 'src/client-ip.ts',
          imports: [],
          exports: ['CidrsFailure', 'ClientIpRequest', 'toClientIpRequest'],
          reExports: [],
        }),
        new DtoNode({
          name: 'ClientIp',
          span: SYNTHETIC_SPAN,
          raw: 'ClientIp %',
          sourceForm: 'shortform',
          fields: [stringField('address')],
        }),
      ],
      tmdContent: tmd,
      errors: [],
      warnings: [],
    };

    const result = await engine.assert(conversionResult, 'test.tmd', tmd);

    const exportDeviations = result.deviations.filter(
      (d) => d.entityName === 'ClientIpFile' && d.property.startsWith('exports'),
    );
    assert.deepEqual(exportDeviations, []);
  });

  it('should downgrade undeclared type alias field deviations to warning (#210)', async () => {
    const engine = new AssertionEngine();

    const tmd = `
IndexApp -> Main v1.0.0

Main @ src/main.ts:
  <- [Config]

Config %
  - edition: string
  - kind: string
    `.trim();

    const conversionResult: ConversionResult = {
      success: true,
      entities: [
        new ProgramNode({
          name: 'IndexApp',
          span: SYNTHETIC_SPAN,
          raw: 'IndexApp -> Main v1.0.0',
          sourceForm: 'shortform',
          entry: 'Main',
          version: '1.0.0',
        }),
        new FileNode({
          name: 'Main',
          span: SYNTHETIC_SPAN,
          raw: 'Main @ src/main.ts:',
          sourceForm: 'longform',
          path: 'src/main.ts',
          imports: ['Config'],
          exports: [],
          reExports: [],
        }),
        new DtoNode({
          name: 'Config',
          span: SYNTHETIC_SPAN,
          raw: 'Config %',
          sourceForm: 'shortform',
          fields: [typedField('edition', 'Edition'), typedField('kind', 'PrincipalKind')],
        }),
      ],
      tmdContent: tmd,
      errors: [],
      warnings: [],
    };

    const result = await engine.assert(conversionResult, 'test.tmd', tmd);

    const fieldDeviations = result.deviations.filter((d) => d.property.startsWith('field.'));
    assert.equal(fieldDeviations.length, 2);
    for (const d of fieldDeviations) {
      assert.equal(d.severity, 'warning');
    }
    assert.equal(result.success, true);
  });

  it('should normalize qualified names in field types (#213)', async () => {
    const engine = new AssertionEngine();

    const tmd = `
IndexApp -> Main v1.0.0

Main @ src/main.ts:
  <- [Manifest, LoginProvider]

LoginProvider %
  - name: string

Manifest %
  - providers: LoginProvider[]
    `.trim();

    const conversionResult: ConversionResult = {
      success: true,
      entities: [
        new ProgramNode({
          name: 'IndexApp',
          span: SYNTHETIC_SPAN,
          raw: 'IndexApp -> Main v1.0.0',
          sourceForm: 'shortform',
          entry: 'Main',
          version: '1.0.0',
        }),
        new FileNode({
          name: 'Main',
          span: SYNTHETIC_SPAN,
          raw: 'Main @ src/main.ts:',
          sourceForm: 'longform',
          path: 'src/main.ts',
          imports: ['Manifest', 'LoginProvider'],
          exports: [],
          reExports: [],
        }),
        new DtoNode({
          name: 'LoginProvider',
          span: SYNTHETIC_SPAN,
          raw: 'LoginProvider %',
          sourceForm: 'shortform',
          fields: [typedField('name', 'string')],
        }),
        new DtoNode({
          name: 'Manifest',
          span: SYNTHETIC_SPAN,
          raw: 'Manifest %',
          sourceForm: 'shortform',
          fields: [typedField('providers', 'TypesFile.LoginProvider[]')],
        }),
      ],
      tmdContent: tmd,
      errors: [],
      warnings: [],
    };

    const result = await engine.assert(conversionResult, 'test.tmd', tmd);

    const fieldDeviations = result.deviations.filter((d) => d.property.startsWith('field.'));
    assert.deepEqual(fieldDeviations, []);
    assert.equal(result.success, true);
  });

  it('should downgrade arrow-type field deviations to warning (#214)', async () => {
    const engine = new AssertionEngine();

    const tmd = `
IndexApp -> Main v1.0.0

Main @ src/main.ts:
  <- [Context]

Context %
  - fetch: string
  - logger: string
    `.trim();

    const conversionResult: ConversionResult = {
      success: true,
      entities: [
        new ProgramNode({
          name: 'IndexApp',
          span: SYNTHETIC_SPAN,
          raw: 'IndexApp -> Main v1.0.0',
          sourceForm: 'shortform',
          entry: 'Main',
          version: '1.0.0',
        }),
        new FileNode({
          name: 'Main',
          span: SYNTHETIC_SPAN,
          raw: 'Main @ src/main.ts:',
          sourceForm: 'longform',
          path: 'src/main.ts',
          imports: ['Context'],
          exports: [],
          reExports: [],
        }),
        new DtoNode({
          name: 'Context',
          span: SYNTHETIC_SPAN,
          raw: 'Context %',
          sourceForm: 'shortform',
          fields: [
            typedField('fetch', '(req: FetchRequest) => Promise<Response>'),
            typedField('logger', '(msg: string) => void'),
          ],
        }),
      ],
      tmdContent: tmd,
      errors: [],
      warnings: [],
    };

    const result = await engine.assert(conversionResult, 'test.tmd', tmd);

    const fieldDeviations = result.deviations.filter((d) => d.property.startsWith('field.'));
    assert.equal(fieldDeviations.length, 2);
    for (const d of fieldDeviations) {
      assert.equal(d.severity, 'warning');
    }
    assert.equal(result.success, true);
  });

  it('should downgrade Class-vs-DTO kind mismatch to warning when entity has methods (#215)', async () => {
    const engine = new AssertionEngine();

    const tmd = `
IndexApp -> App v1.0.0

App @ src/app.ts:
  <- [Provisioner]

ProvFile @ src/provisioner.ts:
  -> [Provisioner]

Provisioner <:
  => [provision]

provision :: (input: string) => void
    `.trim();

    const conversionResult: ConversionResult = {
      success: true,
      entities: [
        new ProgramNode({
          name: 'IndexApp',
          span: SYNTHETIC_SPAN,
          raw: 'IndexApp -> App v1.0.0',
          sourceForm: 'shortform',
          entry: 'App',
          version: '1.0.0',
        }),
        new FileNode({
          name: 'App',
          span: SYNTHETIC_SPAN,
          raw: 'App @ src/app.ts:',
          sourceForm: 'longform',
          path: 'src/app.ts',
          imports: ['Provisioner'],
          exports: [],
          reExports: [],
        }),
        new FileNode({
          name: 'ProvFile',
          span: SYNTHETIC_SPAN,
          raw: 'ProvFile @ src/provisioner.ts:',
          sourceForm: 'longform',
          path: 'src/provisioner.ts',
          imports: [],
          exports: ['Provisioner'],
          reExports: [],
        }),
        new DtoNode({
          name: 'Provisioner',
          span: SYNTHETIC_SPAN,
          raw: 'Provisioner %',
          sourceForm: 'shortform',
          fields: [],
        }),
        new FunctionNode({
          name: 'provision',
          span: SYNTHETIC_SPAN,
          raw: 'provision :: (input: string) => void',
          sourceForm: 'shortform',
          signature: '(input: string) => void',
          calls: [],
          pendingDependencies: [],
        }),
      ],
      tmdContent: tmd,
      errors: [],
      warnings: [],
    };

    const result = await engine.assert(conversionResult, 'test.tmd', tmd);

    const kindDeviation = result.deviations.find(
      (d) => d.entityName === 'Provisioner' && d.property === 'type',
    );
    assert.notEqual(kindDeviation, undefined);
    assert.equal(kindDeviation?.severity, 'warning');
    assert.equal(result.success, true);
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
