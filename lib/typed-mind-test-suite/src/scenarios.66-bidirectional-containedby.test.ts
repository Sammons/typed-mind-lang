import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DSLParser } from '../../typed-mind/src/parser.ts';
import { DSLValidator } from '../../typed-mind/src/validator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Scenario 66: Bidirectional containedBy for UIComponents', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-66-bidirectional-containedby.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');
  const parser = new DSLParser();
  const validator = new DSLValidator();

  it('should automatically populate UIComponent.containedBy when parent contains it', () => {
    const parseResult = parser.parse(content);
    
    // Check Header.containedBy
    const header = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'Header' && e.type === 'UIComponent'
    ) as any;
    
    assert.notEqual(header, undefined);
    assert.notEqual(header.containedBy, undefined);
    assert.deepEqual(header.containedBy, ['App']);
  });

  it('should handle nested containment hierarchy', () => {
    const parseResult = parser.parse(content);
    
    // Check multi-level nesting: App > Header > NavBar > NavItem1
    const navItem1 = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'NavItem1' && e.type === 'UIComponent'
    ) as any;
    const navBar = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'NavBar' && e.type === 'UIComponent'
    ) as any;
    const header = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'Header' && e.type === 'UIComponent'
    ) as any;
    
    assert.deepEqual(navItem1.containedBy, ['NavBar']);
    assert.deepEqual(navBar.containedBy, ['Header']);
    assert.deepEqual(header.containedBy, ['App']);
  });

  it('should handle multiple children with same parent', () => {
    const parseResult = parser.parse(content);
    
    // App contains Header, MainContent, Footer
    const header = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'Header' && e.type === 'UIComponent'
    ) as any;
    const mainContent = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'MainContent' && e.type === 'UIComponent'
    ) as any;
    const footer = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'Footer' && e.type === 'UIComponent'
    ) as any;
    
    assert.deepEqual(header.containedBy, ['App']);
    assert.deepEqual(mainContent.containedBy, ['App']);
    assert.deepEqual(footer.containedBy, ['App']);
  });

  it('should handle root component without containedBy', () => {
    const parseResult = parser.parse(content);
    
    // App is root, should not have containedBy
    const app = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'App' && e.type === 'UIComponent'
    ) as any;
    
    assert.notEqual(app, undefined);
    assert.equal(app.root, true);
    assert.deepEqual(app.containedBy, []);
  });

  it('should handle orphan component without parent', () => {
    const parseResult = parser.parse(content);
    
    // OrphanComponent has no parent
    const orphan = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'OrphanComponent' && e.type === 'UIComponent'
    ) as any;
    
    assert.notEqual(orphan, undefined);
    assert.deepEqual(orphan.containedBy, []);
  });

  it('should maintain consistency between contains and containedBy', () => {
    const parseResult = parser.parse(content);
    
    // Check bidirectional relationship
    const navBar = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'NavBar' && e.type === 'UIComponent'
    ) as any;
    const navItem1 = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'NavItem1' && e.type === 'UIComponent'
    ) as any;
    const navItem2 = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'NavItem2' && e.type === 'UIComponent'
    ) as any;
    
    assert.ok((navBar.contains).includes('NavItem1'));
    assert.ok((navBar.contains).includes('NavItem2'));
    assert.deepEqual(navItem1.containedBy, ['NavBar']);
    assert.deepEqual(navItem2.containedBy, ['NavBar']);
  });

  it('should handle complex nested structure', () => {
    const parseResult = parser.parse(content);
    
    // MainContent > ContentArea > Article
    const article = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'Article' && e.type === 'UIComponent'
    ) as any;
    const contentArea = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'ContentArea' && e.type === 'UIComponent'
    ) as any;
    
    assert.deepEqual(article.containedBy, ['ContentArea']);
    assert.deepEqual(contentArea.containedBy, ['MainContent']);
    assert.ok((contentArea.contains).includes('Article'));
  });

  it('should handle component that contains but is not contained', () => {
    const parseResult = parser.parse(content);
    
    // FloatingPanel contains CloseButton but is not contained by anything
    const floatingPanel = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'FloatingPanel' && e.type === 'UIComponent'
    ) as any;
    const closeButton = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'CloseButton' && e.type === 'UIComponent'
    ) as any;
    
    assert.deepEqual(floatingPanel.contains, ['CloseButton']);
    assert.deepEqual(floatingPanel.containedBy, []);
    assert.deepEqual(closeButton.containedBy, ['FloatingPanel']);
  });

  it('should validate without errors when bidirectional relationships are correct', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    // Should not have any validation errors about missing containedBy
    const containedByErrors = validationResult.errors.filter(e => 
      e.message.includes('containedBy')
    );
    
    assert.deepEqual(containedByErrors, []);
  });
});