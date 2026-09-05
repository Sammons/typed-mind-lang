import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ClassFileNode, DtoNode, type EntityNode } from '@sammons/typed-mind';
import type { ParsedModule, TypeScriptProjectAnalysis } from './types.ts';
import { createFilePath } from './types.ts';
import { TypeScriptToTypedMindConverter } from './typescript-to-typedmind-converter.ts';

// Deep-mutable view of a fixture type: readonly arrays become mutable arrays
// and readonly properties become writable, recursively.
type Mutable<T> = T extends string | number | boolean | undefined | null
  ? T
  : T extends readonly (infer Item)[]
    ? Mutable<Item>[]
    : { -readonly [Key in keyof T]: Mutable<T[Key]> };

// Tests that build on the shared mock by pushing into its arrays get their own
// deep copy typed without `readonly`, so the mutation is neither a cast nor a
// leak into sibling tests.
const mutableFixture = <T>(fixture: T): Mutable<T> =>
  // Mutable<T> only removes readonly modifiers, which have no runtime shape, so the clone already has the right value.
  structuredClone(fixture) as Mutable<T>;

const isDtoNode = (entity: EntityNode | undefined): entity is DtoNode => entity instanceof DtoNode;

// Reaches the converter's private matchesPattern (typescript-to-typedmind-converter.ts:1228) without widening to `any`.
const privateMatchesPattern = (converter: TypeScriptToTypedMindConverter) =>
  // Reflect.get returns unknown; the cast restates the private method's declared signature.
  (Reflect.get(converter, 'matchesPattern') as (filePath: string, pattern: string) => boolean).bind(converter);

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
          calledNames: [],
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
    assert.ok(userServiceEntity instanceof ClassFileNode);
    assert.ok(userServiceEntity.methods.includes('createUser'));
    assert.ok(userServiceEntity.methods.includes('findUser'));
    assert.ok(userServiceEntity.imports.includes('UserDTO'));
    assert.ok(userServiceEntity.imports.includes('CreateUserDTO'));
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

    assert.ok(userDTO instanceof DtoNode);
    assert.equal(userDTO.fields.length, 4);

    const idField = userDTO.fields.find((field) => field.name === 'id');
    assert.ok(idField);
    assert.equal(idField.type, 'string');
    assert.equal(idField.isOptional, false);

    const createdAtField = userDTO.fields.find((field) => field.name === 'createdAt');
    assert.ok(createdAtField);
    assert.equal(createdAtField.isOptional, true);
  });

  it('retains the complete structured qualified property type (TM13 Q)', () => {
    const converter = new TypeScriptToTypedMindConverter();
    const analysis = mutableFixture(createMockAnalysis());
    const userInterface = analysis.modules.flatMap((module) => module.interfaces).find((iface) => iface.name === 'UserDTO');
    assert.ok(userInterface);
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
    assert.ok(isDtoNode(userDTO));
    const projectConfigField = userDTO.fields.find((field) => field.name === 'projectConfig');
    assert.ok(projectConfigField);
    // The raw `type` string is preserved verbatim regardless of structure.
    assert.equal(projectConfigField.type, 'ts.CompilerOptions');
    // The qualified name is structured and remains complete; checking its
    // declared namespace owner is a separate validation step.
    assert.ok(projectConfigField.typeExpr.kind === 'named');
    assert.equal(projectConfigField.typeExpr.name, 'ts.CompilerOptions');
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
    const analysis = mutableFixture(createMockAnalysis());

    // Add a private method to the class.
    const userServiceClass = analysis.modules[1]?.classes[0];
    assert.ok(userServiceClass);
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

    const userServiceEntity = result.entities.find((e) => e.name === 'UserService');
    assert.ok(userServiceEntity instanceof ClassFileNode);
    assert.ok(!userServiceEntity.methods.includes('privateHelper'));
  });

  it('should include private members when requested', () => {
    const analysis = mutableFixture(createMockAnalysis());

    // Add a private method to the class.
    const userServiceClass = analysis.modules[1]?.classes[0];
    assert.ok(userServiceClass);
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

    const userServiceEntity = result.entities.find((e) => e.name === 'UserService');
    assert.ok(userServiceEntity instanceof ClassFileNode);
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
    assert.ok(result.tmdContent.includes('classfile UserService {'));
    assert.ok(result.tmdContent.includes('UserDTO %'));
    assert.ok(result.tmdContent.includes('method: "async createUser(data: CreateUserDTO) => Promise<UserDTO>"'));
    assert.ok(result.tmdContent.includes('method: "async findUser(id: string) => Promise<UserDTO | null>"'));
    assert.ok(result.tmdContent.indexOf('classfile UserService {') < result.tmdContent.indexOf('UserDTO %'));
  });

  // decision-same-named-entities PR 1 — RE-PINNED. This test previously
  // asserted the ABORT: `success === false` plus a `Duplicate entity name`
  // error. That abort is gone. A cross-module bare-name collision is now
  // resolved by a deterministic module-qualified rename
  // (`reserveTypeEntityNames`), so the conversion COMPLETES with both
  // classes present under distinct names and emits a warning naming both
  // declaring paths. The assertions below pin that interim outcome; they are
  // the new committed fact, not a relaxation of the old one — the collision
  // is still reported, as a warning that names it precisely rather than as a
  // failure that discards every other entity in the run.
  it('a cross-module duplicate entity name is renamed, not aborted', () => {
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

    assert.equal(result.success, true, 'a name collision must no longer fail the whole conversion');
    assert.deepEqual(
      result.errors.filter((error) => error.message.includes('Duplicate entity name')),
      [],
      'the hard `Duplicate entity name` abort is replaced by a rename plus a warning',
    );

    const collisionWarnings = result.warnings.filter((warning) => warning.message.includes("Duplicate entity name 'UserService'"));
    assert.equal(collisionWarnings.length, 1, `expected exactly one collision warning, got: ${JSON.stringify(result.warnings)}`);
    assert.ok(
      collisionWarnings[0]?.message.endsWith('TypedMind entity names are global to a document.'),
      `the warning must carry the documented closing sentence: ${collisionWarnings[0]?.message}`,
    );

    // Both declarations survive: the first keeps the bare name, the second
    // is module-qualified by its own sanitized basename.
    const userServiceEntities = result.entities.filter((entity) => entity.name.endsWith('UserService'));
    assert.equal(userServiceEntities.length, 2, 'both colliding declarations must produce an entity');
    assert.equal(new Set(userServiceEntities.map((entity) => entity.name)).size, 2, 'the two surviving entities must carry DISTINCT names');
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
          calledNames: [],
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

  // issue #96 — matchesPattern's glob-to-regex translation had two
  // compounding defects: unescaped literal regex metacharacters (starting
  // with `.`) and a `**`->`.*` substitution whose output was re-matched by
  // the subsequent `*`->`[^/]*` substitution. The live-observed failure:
  // the default ignore pattern `**/*.d.ts` wrongly matched
  // `src/typed-mind.ts`, silently dropping `core`'s own entrypoint module
  // from the traversed set. Table-driven per case since these are scalar
  // booleans, not object shapes.
  describe('matchesPattern (issue #96 glob-to-regex escaping)', () => {
    const cases: ReadonlyArray<{ label: string; pattern: string; filePath: string; expected: boolean }> = [
      {
        label: 'THE regression case: **/*.d.ts must not match a .ts file whose name merely ends in d.ts-adjacent text',
        pattern: '**/*.d.ts',
        filePath: 'src/typed-mind.ts',
        expected: false,
      },
      {
        label: '**/*.d.ts still matches a legitimate top-level .d.ts file',
        pattern: '**/*.d.ts',
        filePath: 'types/foo.d.ts',
        expected: true,
      },
      {
        label: '**/*.d.ts still matches a legitimate nested-dir .d.ts file',
        pattern: '**/*.d.ts',
        filePath: 'src/foo.d.ts',
        expected: true,
      },
      {
        label: '**/*.test.ts matches a legitimate test file',
        pattern: '**/*.test.ts',
        filePath: 'src/foo.test.ts',
        expected: true,
      },
      {
        label: '**/*.test.ts does not match a file with no literal dot before "test" (proves the dot is no longer a wildcard)',
        pattern: '**/*.test.ts',
        filePath: 'src/footest.ts',
        expected: false,
      },
      {
        label: 'node_modules/** matches a nested file under node_modules',
        pattern: 'node_modules/**',
        filePath: 'node_modules/foo/bar.ts',
        expected: true,
      },
      {
        label: 'node_modules/** does not match an unrelated file (anchoring still correct)',
        pattern: 'node_modules/**',
        filePath: 'src/node_modules_fake.ts',
        expected: false,
      },
      {
        label: 'single * matches within one path segment',
        pattern: 'src/*.ts',
        filePath: 'src/foo.ts',
        expected: true,
      },
      {
        label: 'single * does not cross a path separator',
        pattern: 'src/*.ts',
        filePath: 'src/sub/foo.ts',
        expected: false,
      },
      {
        label: '? matches exactly one character',
        pattern: 'src/a?.ts',
        filePath: 'src/ab.ts',
        expected: true,
      },
      {
        label: '? does not match two characters',
        pattern: 'src/a?.ts',
        filePath: 'src/abc.ts',
        expected: false,
      },
      {
        label: 'a literal + in the pattern matches the literal + in the file path',
        pattern: 'src/foo+bar.ts',
        filePath: 'src/foo+bar.ts',
        expected: true,
      },
      {
        label: 'a literal + in the pattern does not leak as a regex quantifier',
        pattern: 'src/foo+bar.ts',
        filePath: 'src/fooXbar.ts',
        expected: false,
      },
    ];

    for (const { label, pattern, filePath, expected } of cases) {
      it(label, () => {
        const converter = new TypeScriptToTypedMindConverter();
        const matches = privateMatchesPattern(converter)(filePath, pattern);
        assert.equal(matches, expected);
      });
    }
  });
});
