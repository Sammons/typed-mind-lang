#!/usr/bin/env node

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GrammarDocGenerator } from './grammar-doc-generator.ts';

const generator = new GrammarDocGenerator();

// Generate markdown documentation
const markdown = generator.generateMarkdown();
const mdPath = join(__dirname, '..', 'grammar.md');
writeFileSync(mdPath, markdown);
console.log(`✅ Generated Markdown grammar documentation: ${mdPath}`);

// Generate JSON representation
const json = generator.generateJSON();
const jsonPath = join(__dirname, '..', 'grammar.json');
writeFileSync(jsonPath, json);
console.log(`✅ Generated JSON grammar representation: ${jsonPath}`);

// Generate EBNF notation
const ebnf = generator.generateEBNF();
const ebnfPath = join(__dirname, '..', 'grammar.ebnf');
writeFileSync(ebnfPath, ebnf);
console.log(`✅ Generated EBNF grammar notation: ${ebnfPath}`);

console.log('\n📚 Grammar documentation generated successfully!');
console.log('\n💡 Note: grammar.md is auto-generated. Do not edit it manually.');
