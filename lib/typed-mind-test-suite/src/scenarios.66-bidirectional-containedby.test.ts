import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DSLParser } from '../../typed-mind/src/parser.ts';
import { DSLValidator } from '../../typed-mind/src/validator.ts';

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
    
    expect(header).toBeDefined();
    expect(header.containedBy).toBeDefined();
    expect(header.containedBy).toEqual(['App']);
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
    
    expect(navItem1.containedBy).toEqual(['NavBar']);
    expect(navBar.containedBy).toEqual(['Header']);
    expect(header.containedBy).toEqual(['App']);
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
    
    expect(header.containedBy).toEqual(['App']);
    expect(mainContent.containedBy).toEqual(['App']);
    expect(footer.containedBy).toEqual(['App']);
  });

  it('should handle root component without containedBy', () => {
    const parseResult = parser.parse(content);
    
    // App is root, should not have containedBy
    const app = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'App' && e.type === 'UIComponent'
    ) as any;
    
    expect(app).toBeDefined();
    expect(app.root).toBe(true);
    expect(app.containedBy).toEqual([]);
  });

  it('should handle orphan component without parent', () => {
    const parseResult = parser.parse(content);
    
    // OrphanComponent has no parent
    const orphan = Array.from(parseResult.entities.values()).find(e => 
      e.name === 'OrphanComponent' && e.type === 'UIComponent'
    ) as any;
    
    expect(orphan).toBeDefined();
    expect(orphan.containedBy).toEqual([]);
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
    
    expect(navBar.contains).toContain('NavItem1');
    expect(navBar.contains).toContain('NavItem2');
    expect(navItem1.containedBy).toEqual(['NavBar']);
    expect(navItem2.containedBy).toEqual(['NavBar']);
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
    
    expect(article.containedBy).toEqual(['ContentArea']);
    expect(contentArea.containedBy).toEqual(['MainContent']);
    expect(contentArea.contains).toContain('Article');
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
    
    expect(floatingPanel.contains).toEqual(['CloseButton']);
    expect(floatingPanel.containedBy).toEqual([]);
    expect(closeButton.containedBy).toEqual(['FloatingPanel']);
  });

  it('should validate without errors when bidirectional relationships are correct', () => {
    const parseResult = parser.parse(content);
    const validationResult = validator.validate(parseResult.entities, parseResult);
    
    // Should not have any validation errors about missing containedBy
    const containedByErrors = validationResult.errors.filter(e => 
      e.message.includes('containedBy')
    );
    
    expect(containedByErrors).toEqual([]);
  });
});