const { DSLParser } = require('../typed-mind/dist/parser');
const { DSLValidator } = require('../typed-mind/dist/validator');

const content = `
MyApp -> main v1.0.0

main @ src/index.ts:
  -> [start]

start :: () => void
  ~ [UserList]
  $< [API_KEY]

UserList & "User list component"
  # Should have affectedBy: [start]

API_KEY $env "API key" (required)
  # Should have consumedBy: [start]

ParentUI &! "Root component"
  > [ChildUI]

ChildUI & "Child component"
  # Should have containedBy: [ParentUI]

WebAsset ~ "Web bundle"
  >> MyApp
  # MyApp must exist
`;

const parser = new DSLParser();
const result = parser.parse(content);

// Check bidirectional relationships
const userList = result.entities.get('UserList');
console.log('UserList.affectedBy:', userList?.affectedBy);

const apiKey = result.entities.get('API_KEY');
console.log('API_KEY.consumedBy:', apiKey?.consumedBy);

const childUI = result.entities.get('ChildUI');
console.log('ChildUI.containedBy:', childUI?.containedBy);

const webAsset = result.entities.get('WebAsset');
console.log('WebAsset.containsProgram:', webAsset?.containsProgram);

// Validate
const validator = new DSLValidator();
const validationResult = validator.validate(result.entities, result);
console.log('\nValidation result:', validationResult.valid ? 'VALID' : 'INVALID');
if (!validationResult.valid) {
  console.log('Errors:');
  validationResult.errors.forEach((e) => console.log(`- ${e.message}`));
}
