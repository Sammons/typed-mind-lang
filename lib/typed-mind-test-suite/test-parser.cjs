const { DSLParser } = require('../typed-mind/dist/parser');
const fs = require('node:fs');

const content = fs.readFileSync('scenarios/scenario-59-program-classfile-entrypoint.tmd', 'utf-8');
const parser = new DSLParser();
const result = parser.parse(content);

console.log('Total entities:', result.entities.size);
console.log('First 10 entities:');
let count = 0;
for (const [name, entity] of result.entities) {
  console.log(`  ${name}: type=${entity.type}`);
  if (++count >= 10) break;
}

const entities = Array.from(result.entities.values());
console.log(
  '\nPrograms:',
  entities.filter((e) => e.type === 'program').map((e) => e.name),
);
console.log(
  'ClassFiles:',
  entities.filter((e) => e.type === 'classfile').map((e) => e.name),
);
console.log(
  'Files:',
  entities.filter((e) => e.type === 'file').map((e) => e.name),
);
