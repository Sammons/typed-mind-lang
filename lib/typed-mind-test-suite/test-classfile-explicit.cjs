const { DSLParser } = require('../typed-mind/dist/parser');
const { DSLValidator } = require('../typed-mind/dist/validator');

const content = `
MyApp -> main v1.0.0

main @ src/index.ts:
  <- [UserService]
  -> [start]

UserService #: src/services/user.ts
  => [createUser]
  # Not explicitly exporting UserService itself

start :: () => void
  ~> [createUser]  # Call the method
`;

const parser = new DSLParser();
const result = parser.parse(content);
const validator = new DSLValidator();

// Check what UserService exports
const userService = result.entities.get('UserService');
console.log('UserService type:', userService?.type);
console.log('UserService exports:', userService?.exports);
console.log('Does UserService export itself?', userService?.exports?.includes('UserService'));

// Check if main can import UserService
const main = result.entities.get('main');
console.log('\nmain imports:', main?.imports);

// Validate to see if there are any errors
const validationResult = validator.validate(result.entities, result);
console.log('\nValidation errors:');
validationResult.errors.forEach((e) => console.log(`- ${e.message}`));
