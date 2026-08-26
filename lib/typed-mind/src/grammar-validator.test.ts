import { describe, it, expect } from 'vitest';
import { GrammarValidator } from './grammar-validator.ts';
import type { AnyEntity, ProgramEntity, FileEntity, DTOEntity } from './types.ts';

describe('GrammarValidator', () => {
  const validator = new GrammarValidator();

  describe('validateEntity', () => {
    it('should validate a valid Program entity', () => {
      const program: ProgramEntity = {
        name: 'TodoApp',
        type: 'Program',
        entry: 'AppEntry',
        version: '1.0.0',
        purpose: 'Main application',
        position: { line: 1, column: 1 },
        raw: 'TodoApp -> AppEntry v1.0.0',
      };

      const result = validator.validateEntity(program);
      if (!result.valid) {
        console.log('Validation errors:', result.errors);
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidProgram = {
        name: 'TodoApp',
        type: 'Program',
        // missing entry field
        position: { line: 1, column: 1 },
        raw: 'TodoApp -> ???',
      } as AnyEntity;

      const result = validator.validateEntity(invalidProgram);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('entry');
      expect(result.errors[0].message).toContain('Required field');
    });

    it('should validate invalid entity type', () => {
      const invalidEntity = {
        name: 'Invalid',
        type: 'InvalidType' as any,
        position: { line: 1, column: 1 },
        raw: 'Invalid',
      } as AnyEntity;

      const result = validator.validateEntity(invalidEntity);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'type')).toBe(true);
    });

    it('should validate File entity with arrays', () => {
      const file: FileEntity = {
        name: 'UserService',
        type: 'File',
        path: 'src/services/user.ts',
        imports: ['Database', 'UserModel'],
        exports: ['createUser', 'getUser'],
        position: { line: 1, column: 1 },
        raw: 'UserService @ src/services/user.ts:',
      };

      const result = validator.validateEntity(file);
      expect(result.valid).toBe(true);
    });

    it('should validate DTO fields', () => {
      const dto: DTOEntity = {
        name: 'UserDTO',
        type: 'DTO',
        purpose: 'User data transfer object',
        fields: [
          {
            name: 'name',
            type: 'string',
            description: 'User name',
            optional: false,
          },
          {
            name: 'age',
            type: 'number',
            optional: true,
          },
        ],
        position: { line: 1, column: 1 },
        raw: 'UserDTO % "User data transfer object"',
      };

      const result = validator.validateEntity(dto);
      expect(result.valid).toBe(true);
    });

    it('should detect invalid DTO field structure', () => {
      const invalidDto: DTOEntity = {
        name: 'UserDTO',
        type: 'DTO',
        fields: [
          {
            // missing name
            type: 'string',
          } as any,
        ],
        position: { line: 1, column: 1 },
        raw: 'UserDTO %',
      };

      const result = validator.validateEntity(invalidDto);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.includes('fields[0].name'))).toBe(true);
    });

    it('should validate pattern matching for version', () => {
      const program: ProgramEntity = {
        name: 'TodoApp',
        type: 'Program',
        entry: 'AppEntry',
        version: 'invalid-version',
        position: { line: 1, column: 1 },
        raw: 'TodoApp -> AppEntry v???',
      };

      const result = validator.validateEntity(program);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'version')).toBe(true);
    });

    it('should validate RunParameter paramType enum', () => {
      const validParam = {
        name: 'DATABASE_URL',
        type: 'RunParameter',
        paramType: 'env',
        description: 'Database connection',
        consumedBy: [],
        position: { line: 1, column: 1 },
        raw: 'DATABASE_URL $env "Database connection"',
      } as AnyEntity;

      const result = validator.validateEntity(validParam);
      expect(result.valid).toBe(true);

      const invalidParam = {
        ...validParam,
        paramType: 'invalid',
      } as AnyEntity;

      const result2 = validator.validateEntity(invalidParam);
      expect(result2.valid).toBe(false);
      expect(result2.errors.some((e) => e.field === 'paramType')).toBe(true);
    });
  });

  describe('validateEntities', () => {
    it('should validate multiple entities', () => {
      const entities = new Map<string, AnyEntity>([
        [
          'TodoApp',
          {
            name: 'TodoApp',
            type: 'Program',
            entry: 'AppEntry',
            position: { line: 1, column: 1 },
            raw: 'TodoApp -> AppEntry',
          } as ProgramEntity,
        ],
        [
          'UserService',
          {
            name: 'UserService',
            type: 'File',
            path: 'src/user.ts',
            imports: [],
            exports: [],
            position: { line: 2, column: 1 },
            raw: 'UserService @ src/user.ts:',
          } as FileEntity,
        ],
      ]);

      const result = validator.validateEntities(entities);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('formatErrors', () => {
    it('should format errors nicely', () => {
      const errors = [
        {
          entity: 'TodoApp',
          type: 'Program' as const,
          field: 'entry',
          expected: 'string',
          actual: 'undefined',
          message: "Required field 'entry' is missing",
        },
      ];

      const formatted = validator.formatErrors(errors);
      expect(formatted).toContain('Grammar validation errors found:');
      expect(formatted).toContain('TodoApp (Program)');
      expect(formatted).toContain("Required field 'entry' is missing");
    });

    it('should handle empty errors', () => {
      const formatted = validator.formatErrors([]);
      expect(formatted).toBe('No grammar validation errors found.');
    });
  });
});
