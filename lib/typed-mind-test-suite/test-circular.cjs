const { DSLParser } = require('../typed-mind/dist/parser');
const { DSLValidator } = require('../typed-mind/dist/validator');

const content = `
ModuleA @ src/module-a.ts:
  <- [ModuleB]
  -> [functionA]

ModuleB @ src/module-b.ts:
  <- [ModuleA]
  -> [functionB]

functionA :: () => void
functionB :: () => void
`;

const parser = new DSLParser();
const result = parser.parse(content);
const validator = new DSLValidator();
const validationResult = validator.validate(result.entities, result);

console.log('Validation errors:');
validationResult.errors.forEach((e) => console.log(`- ${e.message}`));

console.log('\nModuleA:', result.entities.get('ModuleA'));
console.log('\nModuleB:', result.entities.get('ModuleB'));
