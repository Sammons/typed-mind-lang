import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GrammarDocGenerator } from './grammar-doc-generator.ts';

describe('GrammarDocGenerator', () => {
  const generator = new GrammarDocGenerator();

  describe('generateMarkdown', () => {
    it('should generate markdown documentation', () => {
      const markdown = generator.generateMarkdown();

      // Check for main sections
      assert.ok(markdown.includes('# TypedMind DSL Grammar Reference'));
      assert.ok(markdown.includes('## Table of Contents'));
      assert.ok(markdown.includes('## Entity Types'));
      assert.ok(markdown.includes('## Entity Patterns'));
      assert.ok(markdown.includes('## Continuation Patterns'));
      assert.ok(markdown.includes('## General Patterns'));
      assert.ok(markdown.includes('## Quick Reference Example'));

      // Check for entity types
      assert.ok(markdown.includes('| Program |'));
      assert.ok(markdown.includes('| File |'));
      assert.ok(markdown.includes('| Function |'));
      assert.ok(markdown.includes('| Class |'));
      assert.ok(markdown.includes('| DTO |'));

      // Check for pattern documentation in table format
      assert.ok(markdown.includes('| Entity | Pattern | Example | Regex |'));

      // Check for example code
      assert.ok(markdown.includes('TodoApp -> main'));
      assert.ok(markdown.includes('UserService #: src/services/user.ts'));
    });
  });

  describe('generateJSON', () => {
    it('should generate valid JSON', () => {
      const json = generator.generateJSON();
      const parsed = JSON.parse(json);

      assert.ok('entityTypes' in parsed);
      assert.ok('patterns' in parsed);
      assert.ok('descriptions' in parsed);

      assert.ok(parsed.entityTypes.includes('Program'));
      assert.ok(parsed.entityTypes.includes('File'));
      assert.ok(parsed.entityTypes.includes('Function'));

      assert.ok('entity' in parsed.patterns);
      assert.ok('continuation' in parsed.patterns);
      assert.ok('general' in parsed.patterns);
    });
  });

  describe('generateEBNF', () => {
    it('should generate EBNF notation', () => {
      const ebnf = generator.generateEBNF();

      // Check for EBNF structure
      assert.ok(ebnf.includes('(* TypedMind DSL Grammar in EBNF notation *)'));
      assert.ok(ebnf.includes('document ='));
      assert.ok(ebnf.includes('entity ='));

      // Check for entity definitions
      assert.ok(ebnf.includes('program = identifier "->" identifier'));
      assert.ok(ebnf.includes('file = identifier "@" path'));
      assert.ok(ebnf.includes('function = identifier "::" signature'));
      assert.ok(ebnf.includes('class = identifier "<:"'));
      assert.ok(ebnf.includes('dto = identifier "%"'));

      // Check for common elements
      assert.ok(ebnf.includes('identifier = letter (letter | digit | "_")*;'));
      assert.ok(ebnf.includes('string_literal ='));
    });
  });
});
