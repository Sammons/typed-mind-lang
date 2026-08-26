const { DSLParser } = require('../typed-mind/dist/parser');

const content = `
simpleTransform :: (input: InputDTO) => OutputDTO
  <- InputDTO
  -> OutputDTO

DATABASE_URL $env "Database URL" (required)

httpClient :: (url: string) => Promise<any>
  $< [axios]

react ^ "UI framework" v18.2.0
`;

const parser = new DSLParser();
const result = parser.parse(content);

for (const [name, entity] of result.entities) {
  if (entity.type === 'Function') {
    console.log(`Function ${name}:`, {
      input: entity.input,
      output: entity.output,
      consumes: entity.consumes,
      calls: entity.calls,
      affects: entity.affects,
    });
  }
  if (entity.type === 'Dependency') {
    console.log(`Dependency ${name}:`, {
      version: entity.version,
      purpose: entity.purpose,
    });
  }
}
