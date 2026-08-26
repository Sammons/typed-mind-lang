import { describe, it, expect } from 'vitest';
import { GrammarDocGenerator } from './grammar-doc-generator.ts';

describe('GrammarDocGenerator', () => {
  const generator = new GrammarDocGenerator();

  describe('generateMarkdown', () => {
    it('should generate markdown documentation', () => {
      const markdown = generator.generateMarkdown();

      // Check for main sections
      expect(markdown).toContain('# TypedMind DSL Grammar Reference');
      expect(markdown).toContain('## Table of Contents');
      expect(markdown).toContain('## Entity Types');
      expect(markdown).toContain('## Entity Patterns');
      expect(markdown).toContain('## Continuation Patterns');
      expect(markdown).toContain('## General Patterns');
      expect(markdown).toContain('## Quick Reference Example');

      // Check for entity types
      expect(markdown).toContain('| Program |');
      expect(markdown).toContain('| File |');
      expect(markdown).toContain('| Function |');
      expect(markdown).toContain('| Class |');
      expect(markdown).toContain('| DTO |');

      // Check for pattern documentation in table format
      expect(markdown).toContain('| Entity | Pattern | Example | Regex |');

      // Check for example code
      expect(markdown).toContain('TodoApp -> main');
      expect(markdown).toContain('UserService #: src/services/user.ts');
    });
  });

  describe('generateJSON', () => {
    it('should generate valid JSON', () => {
      const json = generator.generateJSON();
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('entityTypes');
      expect(parsed).toHaveProperty('patterns');
      expect(parsed).toHaveProperty('descriptions');

      expect(parsed.entityTypes).toContain('Program');
      expect(parsed.entityTypes).toContain('File');
      expect(parsed.entityTypes).toContain('Function');

      expect(parsed.patterns).toHaveProperty('entity');
      expect(parsed.patterns).toHaveProperty('continuation');
      expect(parsed.patterns).toHaveProperty('general');
    });
  });

  describe('generateEBNF', () => {
    it('should generate EBNF notation', () => {
      const ebnf = generator.generateEBNF();

      // Check for EBNF structure
      expect(ebnf).toContain('(* TypedMind DSL Grammar in EBNF notation *)');
      expect(ebnf).toContain('document =');
      expect(ebnf).toContain('entity =');

      // Check for entity definitions
      expect(ebnf).toContain('program = identifier "->" identifier');
      expect(ebnf).toContain('file = identifier "@" path');
      expect(ebnf).toContain('function = identifier "::" signature');
      expect(ebnf).toContain('class = identifier "<:"');
      expect(ebnf).toContain('dto = identifier "%"');

      // Check for common elements
      expect(ebnf).toContain('identifier = letter (letter | digit | "_")*;');
      expect(ebnf).toContain('string_literal =');
    });
  });
});
