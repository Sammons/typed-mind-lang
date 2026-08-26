const { DSLParser } = require('../typed-mind/dist/parser');

const content = `
MyApp -> main v1.2.3
react ^ "UI library" v18.0.0
axios ^ "HTTP client" 3.0.0
`;

const parser = new DSLParser();
const result = parser.parse(content);

const myApp = result.entities.get('MyApp');
console.log('Program version:', myApp?.version);

const react = result.entities.get('react');
console.log('Dependency react version:', react?.version);

const axios = result.entities.get('axios');
console.log('Dependency axios version:', axios?.version);
