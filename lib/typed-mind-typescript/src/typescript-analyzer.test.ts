import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { TypeScriptAnalyzer } from './typescript-analyzer.ts';

const testProjectDir = '/tmp/typed-mind-ts-test';

describe('TypeScriptAnalyzer', () => {
  beforeAll(() => {
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

  afterAll(() => {
    rmSync(testProjectDir, { recursive: true, force: true });
  });

  it('should analyze TypeScript project structure', () => {
    const analyzer = new TypeScriptAnalyzer(testProjectDir);
    const analysis = analyzer.analyze();

    expect(analysis.modules).toHaveLength(3);
    expect(analysis.entryPoints).toContain(join(testProjectDir, 'src', 'index.ts'));

    // Find the index module
    const indexModule = analysis.modules.find((m) => m.filePath.endsWith('index.ts'));
    expect(indexModule).toBeDefined();
    expect(indexModule?.functions).toHaveLength(1);
    expect(indexModule?.functions[0].name).toBe('main');
    expect(indexModule?.functions[0].isAsync).toBe(true);
    expect(indexModule?.functions[0].returnType).toBe('Promise<void>');
  });

  it('should parse class methods correctly', () => {
    const analyzer = new TypeScriptAnalyzer(testProjectDir);
    const analysis = analyzer.analyze();

    const userServiceModule = analysis.modules.find((m) => m.filePath.includes('user-service.ts'));
    expect(userServiceModule).toBeDefined();
    expect(userServiceModule?.classes).toHaveLength(1);

    const userServiceClass = userServiceModule?.classes[0];
    expect(userServiceClass?.name).toBe('UserService');
    expect(userServiceClass?.methods).toHaveLength(2);

    const createUserMethod = userServiceClass?.methods.find((m) => m.name === 'createUser');
    expect(createUserMethod).toBeDefined();
    expect(createUserMethod?.isAsync).toBe(true);
    expect(createUserMethod?.returnType).toBe('Promise<UserDTO>');
    expect(createUserMethod?.parameters).toHaveLength(1);
    expect(createUserMethod?.parameters[0].name).toBe('data');
    expect(createUserMethod?.parameters[0].type).toBe('CreateUserDTO');
  });

  it('should parse interfaces as DTOs', () => {
    const analyzer = new TypeScriptAnalyzer(testProjectDir);
    const analysis = analyzer.analyze();

    const typesModule = analysis.modules.find((m) => m.filePath.includes('user.ts'));
    expect(typesModule).toBeDefined();
    expect(typesModule?.interfaces).toHaveLength(2);

    const userDTOInterface = typesModule?.interfaces.find((i) => i.name === 'UserDTO');
    expect(userDTOInterface).toBeDefined();
    expect(userDTOInterface?.properties).toHaveLength(4);

    const nameProperty = userDTOInterface?.properties.find((p) => p.name === 'name');
    expect(nameProperty).toBeDefined();
    expect(nameProperty?.type).toBe('string');
    expect(nameProperty?.isOptional).toBe(false);
  });

  it('should parse imports and exports', () => {
    const analyzer = new TypeScriptAnalyzer(testProjectDir);
    const analysis = analyzer.analyze();

    const indexModule = analysis.modules.find((m) => m.filePath.endsWith('index.ts'));
    expect(indexModule?.imports).toHaveLength(2);

    const userServiceImport = indexModule?.imports.find((i) => i.namedImports.includes('UserService'));
    expect(userServiceImport).toBeDefined();
    expect(userServiceImport?.specifier).toBe('./services/user-service');

    expect(indexModule?.exports).toHaveLength(1);
    expect(indexModule?.exports[0].name).toBe('main');
    expect(indexModule?.exports[0].type).toBe('function');
  });

  it('should handle type aliases', () => {
    const analyzer = new TypeScriptAnalyzer(testProjectDir);
    const analysis = analyzer.analyze();

    const typesModule = analysis.modules.find((m) => m.filePath.includes('user.ts'));
    expect(typesModule?.types).toHaveLength(1);

    const userStatusType = typesModule?.types[0];
    expect(userStatusType?.name).toBe('UserStatus');
    expect(userStatusType?.type).toBe("'active' | 'inactive' | 'suspended'");
  });

  it('should detect entry points correctly', () => {
    const analyzer = new TypeScriptAnalyzer(testProjectDir);
    const analysis = analyzer.analyze();

    expect(analysis.entryPoints).toHaveLength(1);
    expect(analysis.entryPoints[0]).toMatch(/index\.ts$/);
  });

  it('should handle missing tsconfig gracefully', () => {
    const tempDir = '/tmp/typed-mind-no-config';
    mkdirSync(tempDir, { recursive: true });

    writeFileSync(join(tempDir, 'test.ts'), 'export const foo = "bar";');

    try {
      const analyzer = new TypeScriptAnalyzer(tempDir);
      const analysis = analyzer.analyze();

      expect(analysis.modules).toHaveLength(1);
      expect(analysis.modules[0].constants).toHaveLength(1);
      expect(analysis.modules[0].constants[0].name).toBe('foo');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
