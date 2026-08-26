import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { TypeScriptAnalyzer } from './typescript-analyzer.ts';

const testProjectDir = '/tmp/typed-mind-ts-test';

describe('TypeScriptAnalyzer', () => {
  before(() => {
    // Create test project structure
    mkdirSync(testProjectDir, { recursive: true });
    mkdirSync(join(testProjectDir, 'src'), { recursive: true });
    mkdirSync(join(testProjectDir, 'src', 'services'), { recursive: true });
    mkdirSync(join(testProjectDir, 'src', 'types'), { recursive: true });

    // Create tsconfig.json
    writeFileSync(
      join(testProjectDir, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            strict: true,
            outDir: './dist',
            rootDir: './src',
          },
          include: ['src/**/*'],
        },
        null,
        2,
      ),
    );

    // Create sample TypeScript files
    writeFileSync(
      join(testProjectDir, 'src', 'index.ts'),
      `
import { UserService } from './services/user-service';
import { UserDTO } from './types/user';

export async function main(): Promise<void> {
  const userService = new UserService();
  const user = await userService.createUser({ name: 'John', email: 'john@example.com' });
  console.log('Created user:', user);
}

main().catch(console.error);
    `,
    );

    writeFileSync(
      join(testProjectDir, 'src', 'services', 'user-service.ts'),
      `
import { UserDTO, CreateUserDTO } from '../types/user';

export class UserService {
  async createUser(data: CreateUserDTO): Promise<UserDTO> {
    return {
      id: '1',
      name: data.name,
      email: data.email,
      createdAt: new Date(),
    };
  }
  
  async findUser(id: string): Promise<UserDTO | null> {
    return null;
  }
}
    `,
    );

    mkdirSync(join(testProjectDir, 'src', 'services'), { recursive: true });
    mkdirSync(join(testProjectDir, 'src', 'types'), { recursive: true });

    writeFileSync(
      join(testProjectDir, 'src', 'types', 'user.ts'),
      `
export interface UserDTO {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface CreateUserDTO {
  name: string;
  email: string;
}

export type UserStatus = 'active' | 'inactive' | 'suspended';
    `,
    );
  });

  after(() => {
    rmSync(testProjectDir, { recursive: true, force: true });
  });

  it('should analyze TypeScript project structure', () => {
    const analyzer = new TypeScriptAnalyzer(testProjectDir);
    const analysis = analyzer.analyze();

    assert.equal(analysis.modules.length, 3);
    assert.ok(analysis.entryPoints.includes(join(testProjectDir, 'src', 'index.ts')));

    // Find the index module
    const indexModule = analysis.modules.find((m) => m.filePath.endsWith('index.ts'));
    assert.notEqual(indexModule, undefined);
    assert.equal(indexModule?.functions.length, 1);
    assert.equal(indexModule?.functions[0].name, 'main');
    assert.equal(indexModule?.functions[0].isAsync, true);
    assert.equal(indexModule?.functions[0].returnType, 'Promise<void>');
  });

  it('should parse class methods correctly', () => {
    const analyzer = new TypeScriptAnalyzer(testProjectDir);
    const analysis = analyzer.analyze();

    const userServiceModule = analysis.modules.find((m) => m.filePath.includes('user-service.ts'));
    assert.notEqual(userServiceModule, undefined);
    assert.equal(userServiceModule?.classes.length, 1);

    const userServiceClass = userServiceModule?.classes[0];
    assert.equal(userServiceClass?.name, 'UserService');
    assert.equal(userServiceClass?.methods.length, 2);

    const createUserMethod = userServiceClass?.methods.find((m) => m.name === 'createUser');
    assert.notEqual(createUserMethod, undefined);
    assert.equal(createUserMethod?.isAsync, true);
    assert.equal(createUserMethod?.returnType, 'Promise<UserDTO>');
    assert.equal(createUserMethod?.parameters.length, 1);
    assert.equal(createUserMethod?.parameters[0].name, 'data');
    assert.equal(createUserMethod?.parameters[0].type, 'CreateUserDTO');
  });

  it('should parse interfaces as DTOs', () => {
    const analyzer = new TypeScriptAnalyzer(testProjectDir);
    const analysis = analyzer.analyze();

    const typesModule = analysis.modules.find((m) => m.filePath.includes('user.ts'));
    assert.notEqual(typesModule, undefined);
    assert.equal(typesModule?.interfaces.length, 2);

    const userDTOInterface = typesModule?.interfaces.find((i) => i.name === 'UserDTO');
    assert.notEqual(userDTOInterface, undefined);
    assert.equal(userDTOInterface?.properties.length, 4);

    const nameProperty = userDTOInterface?.properties.find((p) => p.name === 'name');
    assert.notEqual(nameProperty, undefined);
    assert.equal(nameProperty?.type, 'string');
    assert.equal(nameProperty?.isOptional, false);
  });

  it('should parse imports and exports', () => {
    const analyzer = new TypeScriptAnalyzer(testProjectDir);
    const analysis = analyzer.analyze();

    const indexModule = analysis.modules.find((m) => m.filePath.endsWith('index.ts'));
    assert.equal(indexModule?.imports.length, 2);

    const userServiceImport = indexModule?.imports.find((i) => i.namedImports.includes('UserService'));
    assert.notEqual(userServiceImport, undefined);
    assert.equal(userServiceImport?.specifier, './services/user-service');

    assert.equal(indexModule?.exports.length, 1);
    assert.equal(indexModule?.exports[0].name, 'main');
    assert.equal(indexModule?.exports[0].type, 'function');
  });

  it('should handle type aliases', () => {
    const analyzer = new TypeScriptAnalyzer(testProjectDir);
    const analysis = analyzer.analyze();

    const typesModule = analysis.modules.find((m) => m.filePath.includes('user.ts'));
    assert.equal(typesModule?.types.length, 1);

    const userStatusType = typesModule?.types[0];
    assert.equal(userStatusType?.name, 'UserStatus');
    assert.equal(userStatusType?.type, "'active' | 'inactive' | 'suspended'");
  });

  it('should detect entry points correctly', () => {
    const analyzer = new TypeScriptAnalyzer(testProjectDir);
    const analysis = analyzer.analyze();

    assert.equal(analysis.entryPoints.length, 1);
    assert.match(analysis.entryPoints[0], /index\.ts$/);
  });

  it('should handle missing tsconfig gracefully', () => {
    const tempDir = '/tmp/typed-mind-no-config';
    mkdirSync(tempDir, { recursive: true });

    writeFileSync(join(tempDir, 'test.ts'), 'export const foo = "bar";');

    try {
      const analyzer = new TypeScriptAnalyzer(tempDir);
      const analysis = analyzer.analyze();

      assert.equal(analysis.modules.length, 1);
      assert.equal(analysis.modules[0].constants.length, 1);
      assert.equal(analysis.modules[0].constants[0].name, 'foo');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
