import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
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
      assert.equal(result.valid, false);
      assert.equal(result.errors.length, 1);
      assert.equal(result.errors[0].field, 'entry');
      assert.ok(result.errors[0].message.includes('Required field'));
    });

    it('should validate invalid entity type', () => {
      const invalidEntity = {
        name: 'Invalid',
        type: 'InvalidType' as any,
        position: { line: 1, column: 1 },
        raw: 'Invalid',
      } as AnyEntity;

      const result = validator.validateEntity(invalidEntity);
      assert.equal(result.valid, false);
      assert.equal(
        result.errors.some((e) => e.field === 'type'),
        true,
      );
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
      assert.equal(result.valid, true);
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
      assert.equal(result.valid, true);
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
      assert.equal(result.valid, false);
      assert.equal(
        result.errors.some((e) => e.field.includes('fields[0].name')),
        true,
      );
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
      assert.equal(result.valid, false);
      assert.equal(
        result.errors.some((e) => e.field === 'version'),
        true,
      );
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
      assert.equal(result.valid, true);

      const invalidParam = {
        ...validParam,
        paramType: 'invalid',
      } as AnyEntity;

      const result2 = validator.validateEntity(invalidParam);
      assert.equal(result2.valid, false);
      assert.equal(
        result2.errors.some((e) => e.field === 'paramType'),
        true,
      );
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
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
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
      assert.ok(formatted.includes('Grammar validation errors found:'));
      assert.ok(formatted.includes('TodoApp (Program)'));
      assert.ok(formatted.includes("Required field 'entry' is missing"));
    });

    it('should handle empty errors', () => {
      const formatted = validator.formatErrors([]);
      assert.equal(formatted, 'No grammar validation errors found.');
    });
  });
});
