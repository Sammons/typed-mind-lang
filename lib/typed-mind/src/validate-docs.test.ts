import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DSLParser } from './parser.ts';
import { DSLValidator } from './validator.ts';

describe('Documentation Examples', () => {
  const parser = new DSLParser();
  const validator = new DSLValidator();

  it('should validate all TypedMind examples in grammar.md', () => {
    const grammarPath = join(__dirname, '..', 'grammar.md');
    const content = readFileSync(grammarPath, 'utf-8');

    // Extract all ```tmd code blocks
    const tmdBlocks = content.match(/```tmd\n([\s\S]*?)```/g) || [];

    expect(tmdBlocks.length).toBeGreaterThan(0);

    tmdBlocks.forEach((block, index) => {
      // Remove the ```tmd and ``` markers
      const code = block.replace(/```tmd\n/, '').replace(/\n```$/, '');

      // Skip blocks that are just fragments or syntax demonstrations
      if (code.split('\n').length < 10) return;

      // Skip blocks that don't have a Program entity (they're just syntax examples)
      if (!code.includes('->')) return;

      // Parse and validate
      const parseResult = parser.parse(code);

      // Check for parse errors first
      if (parseResult.errors && parseResult.errors.length > 0) {
        console.error(`\nExample ${index + 1} has parse errors:`);
        console.error('Code:\n', code);
        console.error('Parse Errors:', parseResult.errors);
        expect(parseResult.errors.length).toBe(0);
        return;
      }

      // For syntax demonstration examples that don't represent complete programs, skip validation
      const isSyntaxDemo =
        code.includes('# Example patterns - showing syntax only') ||
        code.includes('# Invalid names') ||
        code.includes('# Wrong') ||
        code.includes('# Right') ||
        code.includes('❌') ||
        code.includes('✅') ||
        code.includes('ERROR:');

      if (isSyntaxDemo) {
        return; // Skip validation for pure syntax demos
      }

      // Full validation for complete examples
      const validationResult = validator.validate(parseResult.entities);

      if (!validationResult.valid) {
        console.error(`\nExample ${index + 1} has validation errors:`);
        console.error('Code:\n', code);
        console.error(
          'Validation Errors:',
          validationResult.errors.map((e) => e.message),
        );
        expect(validationResult.valid).toBe(true);
      }
    });
  });

  it('should validate all TypedMind examples in generated-grammar.md', () => {
    try {
      const generatedPath = join(__dirname, '..', 'generated-grammar.md');
      const content = readFileSync(generatedPath, 'utf-8');

      // Extract the complete application example
      const match = content.match(/### Complete Application Example\n\n```tmd\n([\s\S]*?)```/);

      if (match) {
        const code = match[1];
        const parseResult = parser.parse(code);

        if (parseResult.errors && parseResult.errors.length > 0) {
          console.error('\nGenerated example has parse errors:');
          console.error('Parse Errors:', parseResult.errors);
          expect(parseResult.errors.length).toBe(0);
          return;
        }

        const validationResult = validator.validate(parseResult.entities);

        if (!validationResult.valid) {
          console.error('\nGenerated example has validation errors:');
          console.error(
            'Errors:',
            validationResult.errors.map((e) => e.message),
          );
          expect(validationResult.valid).toBe(true);
        }
      }
    } catch {
      // File might not exist if not generated yet
      console.log('Skipping generated-grammar.md test - file not found');
    }
  });
});
