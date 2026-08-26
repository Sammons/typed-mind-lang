import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLParser } from '../../typed-mind/src/parser.ts';
import { DSLValidator } from '../../typed-mind/src/validator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 64: Bidirectional affectedBy for UIComponents', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-64-bidirectional-affectedby.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');
  const parser = new DSLParser();
  const validator = new DSLValidator();

  it('should automatically populate UIComponent.affectedBy when Function affects it', () => {
    const parseResult = parser.parse(content);
    
    // Check UserList.affectedBy
    const userList = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'UserList' && e.type === 'UIComponent'
    ) as any;
    
    assert.notEqual(userList, undefined);
    assert.notEqual(userList.affectedBy, undefined);
    assert.ok((userList.affectedBy).includes('updateUserList'));
    assert.ok((userList.affectedBy).includes('refreshDashboard'));
    assert.equal(userList.affectedBy.length, 2);
  });

  it('should handle multiple functions affecting the same UIComponent', () => {
    const parseResult = parser.parse(content);
    
    // UserList is affected by both updateUserList and refreshDashboard
    const userList = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'UserList' && e.type === 'UIComponent'
    ) as any;
    
    for (const expected of ['updateUserList', 'refreshDashboard']) {
      assert.ok(userList.affectedBy.includes(expected));
    }
  });

  it('should handle single function affecting UIComponent', () => {
    const parseResult = parser.parse(content);
    
    // Button is only affected by handleClick
    const button = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'Button' && e.type === 'UIComponent'
    ) as any;
    
    assert.notEqual(button, undefined);
    assert.deepEqual(button.affectedBy, ['handleClick']);
  });

  it('should handle UIComponent with no affecting functions', () => {
    const parseResult = parser.parse(content);
    
    // Footer has no functions affecting it
    const footer = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'Footer' && e.type === 'UIComponent'
    ) as any;
    
    assert.notEqual(footer, undefined);
    assert.deepEqual(footer.affectedBy, []);
  });

  it('should maintain consistency between Function.affects and UIComponent.affectedBy', () => {
    const parseResult = parser.parse(content);
    
    // Check that relationships are bidirectional
    const updateUserList = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'updateUserList' && e.type === 'Function'
    ) as any;
    const userList = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'UserList' && e.type === 'UIComponent'
    ) as any;
    
    assert.ok((updateUserList.affects).includes('UserList'));
    assert.ok((userList.affectedBy).includes('updateUserList'));
  });

  it('should validate without errors when bidirectional relationships are correct', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    // Should not have any validation errors about missing affectedBy
    const affectedByErrors = validationResult.errors.filter(e => 
      e.message.includes('affectedBy')
    );
    
    assert.deepEqual(affectedByErrors, []);
  });

  it('should handle root UIComponent with affectedBy', () => {
    const parseResult = parser.parse(content);
    
    // Dashboard is a root component but still can be affected
    const dashboard = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'Dashboard' && e.type === 'UIComponent'
    ) as any;
    
    assert.notEqual(dashboard, undefined);
    assert.equal(dashboard.root, true);
    assert.deepEqual(dashboard.affectedBy, ['refreshDashboard']);
  });
});