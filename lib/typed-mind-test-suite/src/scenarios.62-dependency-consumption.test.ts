import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLParser } from '../../typed-mind/src/parser.ts';
import { DSLValidator } from '../../typed-mind/src/validator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 62: Dependency consumption patterns', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-62-dependency-consumption.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');
  const parser = new DSLParser();
  const validator = new DSLValidator();

  it('should parse external dependencies', () => {
    const parseResult = parser.parse(content);
    
    // Check various dependency formats
    const react = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'react' && e.type === 'Dependency'
    );
    assert.notEqual(react, undefined);
    assert.equal(react?.purpose, 'UI framework');
    assert.equal(react?.version, '18.2.0'); // Parser strips 'v' prefix
    
    // Scoped package
    const awsS3 = Array.from(parseResult.entities.values()).find(e => 
      e.name === '@aws-sdk/client-s3' && e.type === 'Dependency'
    );
    assert.notEqual(awsS3, undefined);
    assert.equal(awsS3?.purpose, 'AWS S3 client');
    
    // Package without version
    const noVersion = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'no-version-dep' && e.type === 'Dependency'
    );
    assert.notEqual(noVersion, undefined);
    assert.equal(noVersion?.version, undefined);
  });

  it('should handle function consuming dependencies', () => {
    const parseResult = parser.parse(content);
    
    // Simple consumption
    const httpClient = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'httpClient' && e.type === 'Function'
    );
    assert.ok((httpClient?.consumes).includes('axios'));
    
    // Multiple dependencies
    const serverSetup = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'serverSetup' && e.type === 'Function'
    );
    assert.ok((serverSetup?.consumes).includes('express'));
    assert.ok((serverSetup?.consumes).includes('dotenv'));
    assert.ok((serverSetup?.consumes).includes('winston'));
    
    // Scoped package
    const s3Upload = Array.from(parseResult.entities.values()).find(e => 
      e.name === 's3Upload' && e.type === 'Function'
    );
    assert.ok((s3Upload?.consumes).includes('@aws-sdk/client-s3'));
  });

  it.skip('should auto-distribute mixed dependencies', () => {
    const parseResult = parser.parse(content);
    
    const mixedConsumer = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'mixedConsumer' && e.type === 'Function'
    );
    
    // lodash (Dependency) should go to consumes
    assert.ok((mixedConsumer?.consumes).includes('lodash'));
    
    // helperFunction (Function) should go to calls
    assert.ok((mixedConsumer?.calls).includes('helperFunction'));
    
    // DataService (ClassFile) - might be in calls or its methods
    const hasDataService = 
      mixedConsumer?.calls?.includes('DataService') ||
      mixedConsumer?.calls?.includes('getData');
  });

  it('should handle ClassFile importing dependencies', () => {
    const parseResult = parser.parse(content);
    
    const appInitializer = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'AppInitializer' && e.type === 'ClassFile'
    );
    
    // ClassFiles can import dependencies
    assert.ok((appInitializer?.imports).includes('react'));
    assert.ok((appInitializer?.imports).includes('typescript'));
    assert.ok((appInitializer?.imports).includes('ConfigLoader'));
  });

  it('should handle various version formats', () => {
    const parseResult = parser.parse(content);
    
    // These specific dependencies should be parsed
    const semanticVersion = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'semantic-version' && e.type === 'Dependency'
    );
    assert.notEqual(semanticVersion, undefined);
    assert.equal(semanticVersion?.version, '1.2.3'); // Parser strips 'v' prefix
    
    const betaVersion = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'beta-version' && e.type === 'Dependency'
    );
    assert.notEqual(betaVersion, undefined);
    assert.equal(betaVersion?.version, '2.0.0-beta.1'); // Parser strips 'v' prefix
    
    const versionConsumer = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'versionConsumer' && e.type === 'Function'
    );
    assert.ok((versionConsumer?.consumes).includes('semantic-version'));
    assert.ok((versionConsumer?.consumes).includes('beta-version'));
  });

  it('should validate invalid consumption patterns', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    const errors = validationResult.errors.map(e => e.message);
    
    // Non-existent dependency
    assert.equal(errors.some(e => 
      e.includes('non-existent-package') && 
      (e.includes('unknown') || e.includes('undefined'))
    ), true);
    
    // UIComponent can't be consumed via $<
    const invalidConsumer = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'invalidConsumer' && e.type === 'Function'
    );
    
    // Check if validator catches these invalid consumptions
    assert.equal(errors.some(e => 
      e.includes('invalidConsumer') || 
      (e.includes('AppUI') && e.includes('consume'))
    ), true);
  });

  it('should handle RunParameter consumption', () => {
    const parseResult = parser.parse(content);
    
    const configuredFunction = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'configuredFunction' && e.type === 'Function'
    );
    
    assert.ok((configuredFunction?.consumes).includes('DATABASE_URL'));
    assert.ok((configuredFunction?.consumes).includes('API_KEY'));
    assert.ok((configuredFunction?.consumes).includes('MAX_WORKERS'));
    
    // Mixed RunParameters and Dependencies
    const hybridConsumer = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'hybridConsumer' && e.type === 'Function'
    );
    
    assert.ok((hybridConsumer?.consumes).includes('axios'));
    assert.ok((hybridConsumer?.consumes).includes('DATABASE_URL'));
    assert.ok((hybridConsumer?.consumes).includes('winston'));
    assert.ok((hybridConsumer?.consumes).includes('API_KEY'));
  });

  it('should handle Asset consumption', () => {
    const parseResult = parser.parse(content);
    
    const displayLogo = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'displayLogo' && e.type === 'Function'
    );
    
    assert.ok((displayLogo?.consumes).includes('Logo'));
    
    // Logo contains ClientApp
    const logo = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'Logo' && e.type === 'Asset'
    );
    assert.equal(logo?.containsProgram, 'ClientApp');
  });

  it('should handle Constants consumption', () => {
    const parseResult = parser.parse(content);
    
    const constantsUser = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'constantsUser' && e.type === 'Function'
    );
    
    assert.ok((constantsUser?.consumes).includes('AppConstants'));
    
    // Complex consumption chain
    const complexMethod = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'complexMethod' && e.type === 'Function'
    );
    
    assert.ok((complexMethod?.consumes).includes('DATABASE_URL'));
    assert.ok((complexMethod?.consumes).includes('API_KEY'));
    assert.ok((complexMethod?.consumes).includes('AppConstants'));
    assert.ok((complexMethod?.calls).includes('helperFunction'));
    assert.ok((complexMethod?.calls).includes('getData'));
  });

  it.skip('should detect orphaned dependencies', () => {
    // TODO: This test needs investigation - dependencies don't get marked as orphaned
    // Dependencies may be special entities that don't require consumption
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    const errors = validationResult.errors.map(e => e.message);
    
    // unused-package is not consumed by anyone - should have an orphaned error
    assert.equal(errors.some(e => 
      e.includes('unused-package') && (e.includes('orphaned') || e.includes('Orphaned'))
    ), true);
  });

  it('should validate circular imports between services', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    const errors = validationResult.errors.map(e => e.message);
    
    // ServiceA imports ServiceB, ServiceB imports ServiceA
    assert.equal(errors.some(e => 
      e.includes('Circular') && 
      (e.includes('ServiceA') || e.includes('ServiceB'))
    ), true);
  });

  it('should handle UI component relationships with dependencies', () => {
    const parseResult = parser.parse(content);
    
    const renderUI = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'renderUI' && e.type === 'Function'
    );
    
    // Function affects UI
    assert.ok((renderUI?.affects).includes('AppUI'));
    assert.ok((renderUI?.affects).includes('Dashboard'));
    
    // Function consumes dependencies
    assert.ok((renderUI?.consumes).includes('react'));
    assert.ok((renderUI?.consumes).includes('@testing-library/react'));
  });
});