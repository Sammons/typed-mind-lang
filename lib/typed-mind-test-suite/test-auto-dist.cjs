const { DSLParser } = require('../typed-mind/dist/parser');

const content = `
# Test auto-distribution
processOrder :: (order: OrderDTO) => void
  <- [OrderDTO, validateOrder, Database, OrderUI, API_KEY]

# Entities needed for test
OrderDTO % "Order data"
  - id: string "Order ID"

validateOrder :: () => void

Database #: src/db.ts
  => [query]

OrderUI & "Order UI component"

API_KEY $env "API key" (required)
`;

const parser = new DSLParser();
const result = parser.parse(content);

const processOrder = result.entities.get('processOrder');
console.log('processOrder auto-distribution:', {
  input: processOrder?.input,
  output: processOrder?.output,
  calls: processOrder?.calls,
  affects: processOrder?.affects,
  consumes: processOrder?.consumes,
});

// Check bidirectional references
const orderUI = result.entities.get('OrderUI');
console.log('\nOrderUI.affectedBy:', orderUI?.affectedBy);

const apiKey = result.entities.get('API_KEY');
console.log('API_KEY.consumedBy:', apiKey?.consumedBy);
