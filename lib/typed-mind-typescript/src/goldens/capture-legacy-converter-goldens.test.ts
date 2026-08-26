// RFC-TM-6 Q1 (rfc-tm-6-diamond.md §1) — captures the legacy private
// emitter's (typescript-to-typedmind-converter.ts generateTMDContent +
// generateEntityTMD, :1290-1485) output as checked-in `.tmd` text goldens
// BEFORE Q3's flip to the shared SyntaxEmitter. The emitted text IS the
// specification for this Quantum; Q3's semantic-equivalence gate (§4)
// re-parses the new emission and compares entity lists, while
// check-golden-deltas.mjs classifies every byte-level delta here
// (EMITTER-STRUCTURE for the dropped `# Section` headers, per §3).
//
// Fixture shapes mirror typescript-to-typedmind-converter.test.ts's
// createMockAnalysis() (already proven to convert successfully: ClassFile
// fusion, DTOs, a generated Program, exported/non-exported interface
// filtering) — reproduced here as an independent fixture per
// `leaves_do_not_compose` rather than importing the sibling test's helper.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { ParsedModule, TypeScriptProjectAnalysis } from '../types.ts';
import { createFilePath } from '../types.ts';
import { TypeScriptToTypedMindConverter } from '../typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..', '..');
const baselineDir = join(packageDir, 'goldens', 'legacy-baseline');

const createBaseAnalysis = (): TypeScriptProjectAnalysis => ({
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
    target: 99,
    module: 1,
  },
});

const readGoldenIfPresent = (path: string): string | undefined => {
  if (!existsSync(path)) {
    return undefined;
  }
  return readFileSync(path, 'utf8');
};

const writeGolden = (path: string, value: string): void => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, 'utf8');
};

const assertMatchesGolden = (path: string, value: string): void => {
  const existing = readGoldenIfPresent(path);
  if (existing === undefined) {
    writeGolden(path, value);
    return;
  }
  assert.equal(value, existing);
};

describe('RFC-TM-6 Q1 — legacy converter emitter TMD goldens', () => {
  // getRelativePath (typescript-to-typedmind-converter.ts:1490-1492) emits
  // File/ClassFile paths via `path.relative(process.cwd(), filePath)` — the
  // legacy emitter's own pre-existing behavior, unchanged by this Quantum.
  // Left at the machine's real cwd, the emitted `../../..` depth varies with
  // wherever this repo happens to be checked out (a worktree nested under
  // `.claude/worktrees/<slug>/` versus a shallow CI checkout), which would
  // make the checked-in golden fail on every OTHER checkout even though
  // nothing regressed. Pinning cwd to `/` for the duration of each test
  // makes `path.relative` deterministic across machines: the mock fixtures'
  // absolute paths all live under `/project/...`, so `path.relative('/',
  // '/project/src/index.ts')` always yields `project/src/index.ts` with no
  // machine-dependent `../` prefix.
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    process.chdir('/');
  });

  afterEach(() => {
    process.chdir(originalCwd);
  });

  it('captures generateTMDContent output for the default (preferClassFile: true) fixture', () => {
    const converter = new TypeScriptToTypedMindConverter({ preferClassFile: true });
    const result = converter.convert(createBaseAnalysis());

    assert.equal(result.success, true);
    assertMatchesGolden(join(baselineDir, 'preferClassFile-true.tmd'), result.tmdContent);
  });

  it('captures generateTMDContent output for the split (preferClassFile: false) fixture', () => {
    const converter = new TypeScriptToTypedMindConverter({ preferClassFile: false });
    const result = converter.convert(createBaseAnalysis());

    assert.equal(result.success, true);
    assertMatchesGolden(join(baselineDir, 'preferClassFile-false.tmd'), result.tmdContent);
  });

  it('captures generateTMDContent output with generatePrograms disabled', () => {
    const converter = new TypeScriptToTypedMindConverter({ generatePrograms: false });
    const result = converter.convert(createBaseAnalysis());

    assert.equal(result.success, true);
    assertMatchesGolden(join(baselineDir, 'generatePrograms-false.tmd'), result.tmdContent);
  });
});
