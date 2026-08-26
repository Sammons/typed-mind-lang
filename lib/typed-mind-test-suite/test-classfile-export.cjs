const { DSLParser } = require('../typed-mind/dist/parser');
const { DSLValidator } = require('../typed-mind/dist/validator');

const content = `
MyApp -> main v1.0.0

main @ src/index.ts:
  <- [UserService]
  -> [start]

UserService #: src/services/user.ts
  => [createUser]
  -> [helper]  # Only explicitly export helper

helper :: () => void

start :: () => void
  ~> [createUser]  # Call the method
`;

const parser = new DSLParser();
const result = parser.parse(content);
const validator = new DSLValidator();

// Check what UserService exports
const userService = result.entities.get('UserService');
console.log('UserService exports:', userService?.exports);

// Check if main can import UserService
const main = result.entities.get('main');
console.log('main imports:', main?.imports);

// Validate to see if there are any errors
const validationResult = validator.validate(result.entities, result);
const errors = validationResult.errors.filter((e) => e.message.includes('UserService') || e.message.includes('createUser'));

console.log('\nValidation errors related to UserService:');
errors.forEach((e) => console.log(`- ${e.message}`));
