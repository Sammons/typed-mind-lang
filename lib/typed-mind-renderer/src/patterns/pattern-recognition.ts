/**
 * Pattern Recognition System for TypedMind Architecture Analysis
 * Automatically identifies and highlights common architectural patterns
 * Author: Enhanced by Claude Code in Matt Pocock style
 */

import {
  ClassFileNode,
  ClassNode,
  type EntityKind,
  type EntityNode,
  FileNode,
  FunctionNode,
  type ParseOutput,
  QualifiedNameResolver,
} from '@sammons/typed-mind';

/**
 * Architectural pattern definition
 */
export interface ArchitecturalPattern {
  id: string;
  name: string;
  description: string;
  category: 'structural' | 'behavioral' | 'creational' | 'architectural' | 'anti-pattern';
  confidence: number; // 0-1
  entities: PatternEntity[];
  relationships: PatternRelationship[];
  benefits: string[];
  drawbacks?: string[];
  recommendations?: string[];
  documentation?: string;
}

export interface PatternEntity {
  role: string;
  entityId: string;
  entityType: EntityKind;
  description: string;
  optional?: boolean;
}

export interface PatternRelationship {
  from: string; // role name
  to: string; // role name
  type: 'depends' | 'creates' | 'uses' | 'extends' | 'implements' | 'contains' | 'calls';
  description: string;
}

/**
 * Pattern matcher interface
 */
export interface PatternMatcher {
  readonly patternId: string;
  readonly name: string;
  readonly description: string;
  readonly category: ArchitecturalPattern['category'];

  /**
   * Detect if pattern exists in the graph
   */
  detect(graph: ParseOutput): ArchitecturalPattern[];

  /**
   * Calculate confidence score for a potential match
   */
  calculateConfidence(entities: EntityNode[], relationships: Map<string, Set<string>>): number;
}

/**
 * Main pattern recognition engine
 */
export class PatternRecognitionEngine {
  private matchers: Map<string, PatternMatcher> = new Map();
  private detectedPatterns: ArchitecturalPattern[] = [];
  private graph: ParseOutput | null = null;

  constructor() {
    this.registerBuiltInMatchers();
  }

  /**
   * Register a custom pattern matcher
   */
  registerMatcher(matcher: PatternMatcher): void {
    this.matchers.set(matcher.patternId, matcher);
  }

  /**
   * Analyze graph for architectural patterns
   */
  analyzePatterns(graph: ParseOutput): {
    patterns: ArchitecturalPattern[];
    patternsByCategory: Record<string, ArchitecturalPattern[]>;
    recommendations: PatternRecommendation[];
    antiPatterns: ArchitecturalPattern[];
  } {
    this.graph = graph;
    this.detectedPatterns = [];

    // Run all matchers
    for (const matcher of this.matchers.values()) {
      const patterns = matcher.detect(graph);
      this.detectedPatterns.push(...patterns);
    }

    // Sort by confidence
    this.detectedPatterns.sort((a, b) => b.confidence - a.confidence);

    // Group by category
    const patternsByCategory = this.groupPatternsByCategory(this.detectedPatterns);

    // Generate recommendations
    const recommendations = this.generateRecommendations();

    // Identify anti-patterns
    const antiPatterns = this.detectedPatterns.filter((p) => p.category === 'anti-pattern');

    return {
      patterns: this.detectedPatterns,
      patternsByCategory,
      recommendations,
      antiPatterns,
    };
  }

  /**
   * Get pattern details by ID
   */
  getPattern(patternId: string): ArchitecturalPattern | null {
    return this.detectedPatterns.find((p) => p.id === patternId) || null;
  }

  /**
   * Highlight pattern in visualization
   */
  getPatternVisualization(patternId: string): PatternVisualization | null {
    const pattern = this.getPattern(patternId);
    if (!pattern) return null;

    return {
      patternId,
      highlightedEntities: pattern.entities.map((e) => ({
        entityId: e.entityId,
        role: e.role,
        color: this.getRoleColor(e.role),
        strokeWidth: 3,
        animation: 'pulse',
      })),
      highlightedRelationships: pattern.relationships.map((r) => ({
        from: pattern.entities.find((e) => e.role === r.from)?.entityId || '',
        to: pattern.entities.find((e) => e.role === r.to)?.entityId || '',
        type: r.type,
        color: this.getRelationshipColor(r.type),
        strokeWidth: 2,
        animation: 'flow',
      })),
      overlay: this.createPatternOverlay(pattern),
    };
  }

  private registerBuiltInMatchers(): void {
    this.registerMatcher(new MVCPatternMatcher());
    this.registerMatcher(new RepositoryPatternMatcher());
    this.registerMatcher(new FactoryPatternMatcher());
    this.registerMatcher(new ObserverPatternMatcher());
    this.registerMatcher(new SingletonPatternMatcher());
    this.registerMatcher(new AdapterPatternMatcher());
    this.registerMatcher(new LayeredArchitectureMatcher());
    this.registerMatcher(new MicroservicesPatternMatcher());
    this.registerMatcher(new GodObjectAntiPatternMatcher());
    this.registerMatcher(new CircularDependencyAntiPatternMatcher());
    this.registerMatcher(new DeadCodeAntiPatternMatcher());
  }

  private groupPatternsByCategory(patterns: ArchitecturalPattern[]): Record<string, ArchitecturalPattern[]> {
    const groups: Record<string, ArchitecturalPattern[]> = {
      structural: [],
      behavioral: [],
      creational: [],
      architectural: [],
      'anti-pattern': [],
    };

    for (const pattern of patterns) {
      groups[pattern.category].push(pattern);
    }

    return groups;
  }

  private generateRecommendations(): PatternRecommendation[] {
    const recommendations: PatternRecommendation[] = [];

    // Recommend missing patterns based on current architecture
    const entities = this.graph?.entities ?? [];
    const hasControllers = entities.some((e) => e.name.toLowerCase().includes('controller'));
    const hasServices = entities.some((e) => e.name.toLowerCase().includes('service'));
    const hasModels = entities.some((e) => e.kind === 'DTO' || e.name.toLowerCase().includes('model'));

    if (hasControllers && hasModels && !hasServices) {
      recommendations.push({
        type: 'missing-pattern',
        priority: 'medium',
        title: 'Consider Service Layer Pattern',
        description: 'You have controllers and models but no service layer. A service layer can help organize business logic.',
        pattern: 'service-layer',
        benefits: ['Better separation of concerns', 'Improved testability', 'Reusable business logic'],
        effort: 'medium',
      });
    }

    // Recommend solutions for anti-patterns
    const antiPatterns = this.detectedPatterns.filter((p) => p.category === 'anti-pattern');
    for (const antiPattern of antiPatterns) {
      if (antiPattern.recommendations) {
        recommendations.push({
          type: 'anti-pattern-fix',
          priority: 'high',
          title: `Fix ${antiPattern.name}`,
          description: antiPattern.recommendations[0],
          pattern: antiPattern.id,
          benefits: ['Improved maintainability', 'Better code quality'],
          effort: 'high',
        });
      }
    }

    return recommendations;
  }

  private getRoleColor(role: string): string {
    const colors: Record<string, string> = {
      controller: '#3fb950',
      service: '#58a6ff',
      model: '#f85149',
      view: '#f9c513',
      factory: '#7c3aed',
      observer: '#e06c75',
      subject: '#56b6c2',
      adapter: '#c678dd',
      repository: '#98c379',
      gateway: '#e5c07b',
    };

    return colors[role.toLowerCase()] || '#8b949e';
  }

  private getRelationshipColor(type: string): string {
    const colors: Record<string, string> = {
      depends: '#58a6ff',
      creates: '#3fb950',
      uses: '#f85149',
      extends: '#f9c513',
      implements: '#7c3aed',
      contains: '#e06c75',
      calls: '#98c379',
    };

    return colors[type] || '#8b949e';
  }

  private createPatternOverlay(pattern: ArchitecturalPattern): PatternOverlay {
    return {
      title: pattern.name,
      description: pattern.description,
      confidence: pattern.confidence,
      category: pattern.category,
      entities: pattern.entities,
      relationships: pattern.relationships,
    };
  }
}

// Built-in pattern matchers

/**
 * MVC Pattern Matcher
 */
class MVCPatternMatcher implements PatternMatcher {
  readonly patternId = 'mvc';
  readonly name = 'Model-View-Controller';
  readonly description = 'Classic MVC architectural pattern with clear separation of concerns';
  readonly category = 'architectural' as const;

  detect(graph: ParseOutput): ArchitecturalPattern[] {
    const entities = graph.entities;
    const patterns: ArchitecturalPattern[] = [];

    // Find potential controllers, models, and views
    const controllers = entities.filter((e) => e.name.toLowerCase().includes('controller') || e.kind === 'Class' || e.kind === 'ClassFile');

    const models = entities.filter(
      (e) => e.kind === 'DTO' || e.name.toLowerCase().includes('model') || e.name.toLowerCase().includes('entity'),
    );

    const views = entities.filter(
      (e) => e.kind === 'UIComponent' || e.name.toLowerCase().includes('view') || e.name.toLowerCase().includes('component'),
    );

    // Look for MVC triads
    for (const controller of controllers) {
      const relatedModels = this.findRelatedEntities(controller, models, graph);
      const relatedViews = this.findRelatedEntities(controller, views, graph);

      if (relatedModels.length > 0 && relatedViews.length > 0) {
        const confidence = this.calculateConfidence([controller, ...relatedModels, ...relatedViews], new Map());

        if (confidence > 0.6) {
          patterns.push({
            id: `mvc-${controller.name}`,
            name: 'Model-View-Controller',
            description: `MVC pattern centered on ${controller.name}`,
            category: 'architectural',
            confidence,
            entities: [
              {
                role: 'controller',
                entityId: controller.name,
                entityType: controller.kind,
                description: 'Handles user input and coordinates model and view',
              },
              ...relatedModels.map((m) => ({
                role: 'model',
                entityId: m.name,
                entityType: m.kind,
                description: 'Represents data and business logic',
              })),
              ...relatedViews.map((v) => ({
                role: 'view',
                entityId: v.name,
                entityType: v.kind,
                description: 'Presents data to user',
              })),
            ],
            relationships: [
              {
                from: 'controller',
                to: 'model',
                type: 'uses',
                description: 'Controller manipulates model',
              },
              {
                from: 'controller',
                to: 'view',
                type: 'uses',
                description: 'Controller updates view',
              },
            ],
            benefits: ['Clear separation of concerns', 'Improved testability', 'Better maintainability'],
          });
        }
      }
    }

    return patterns;
  }

  // Required by PatternMatcher interface
  calculateConfidence(entities: EntityNode[], _relationships: Map<string, Set<string>>): number {
    // Basic confidence calculation based on naming conventions and relationships
    let score = 0.5; // Base score

    const hasController = entities.some((e) => e.name.toLowerCase().includes('controller'));
    const hasModel = entities.some((e) => e.kind === 'DTO' || e.name.toLowerCase().includes('model'));
    const hasView = entities.some((e) => e.kind === 'UIComponent');

    if (hasController) score += 0.2;
    if (hasModel) score += 0.2;
    if (hasView) score += 0.2;

    return Math.min(1.0, score);
  }

  private findRelatedEntities(entity: EntityNode, candidates: EntityNode[], graph: ParseOutput): EntityNode[] {
    const related: EntityNode[] = [];
    const names = new QualifiedNameResolver(new Map(graph.entities.map((candidate) => [candidate.name, candidate])));

    for (const candidate of candidates) {
      if (this.entitiesAreRelated(entity, candidate, names)) {
        related.push(candidate);
      }
    }

    return related;
  }

  // RFC-TM-6 §2 (rfc-tm-6-diamond.md) — class dispatch over EntityNode
  // subclasses replaces the legacy 'imports' in entity1 / 'calls' in entity1
  // / 'affects' in entity1 duck-typing. File/ClassFile carry imports,
  // Function carries calls/affects/input/output — same field set the legacy
  // duck-typing probed. RFC-TM-14 §S2 — calls resolve through the
  // qualified-name resolver so `Owner.constructor` relates to the owner.
  private entitiesAreRelated(entity1: EntityNode, entity2: EntityNode, names: QualifiedNameResolver): boolean {
    if ((entity1 instanceof FileNode || entity1 instanceof ClassFileNode) && entity1.imports.includes(entity2.name)) return true;
    if (entity1 instanceof FunctionNode) {
      if (entity1.calls.some((call) => names.target(call) === entity2)) return true;
      if (entity1.affects?.includes(entity2.name)) return true;
      if (entity1.input === entity2.name) return true;
      if (entity1.output === entity2.name) return true;
    }

    return false;
  }
}

/**
 * Repository Pattern Matcher
 */
class RepositoryPatternMatcher implements PatternMatcher {
  readonly patternId = 'repository';
  readonly name = 'Repository Pattern';
  readonly description = 'Data access abstraction layer pattern';
  readonly category = 'structural' as const;

  detect(graph: ParseOutput): ArchitecturalPattern[] {
    const entities = graph.entities;
    const patterns: ArchitecturalPattern[] = [];

    const repositories = entities.filter((e) => e.name.toLowerCase().includes('repository') || e.name.toLowerCase().includes('dao'));

    for (const repo of repositories) {
      const confidence = this.calculateConfidence([repo], new Map());

      if (confidence > 0.7) {
        patterns.push({
          id: `repository-${repo.name}`,
          name: 'Repository Pattern',
          description: `Repository pattern implementation: ${repo.name}`,
          category: 'structural',
          confidence,
          entities: [
            {
              role: 'repository',
              entityId: repo.name,
              entityType: repo.kind,
              description: 'Provides data access abstraction',
            },
          ],
          relationships: [],
          benefits: ['Centralized data access logic', 'Improved testability through mocking', 'Separation of data access concerns'],
        });
      }
    }

    return patterns;
  }

  // Required by PatternMatcher interface
  calculateConfidence(entities: EntityNode[], _relationships: Map<string, Set<string>>): number {
    const repo = entities[0];
    let confidence = 0.3;

    if (repo.name.toLowerCase().includes('repository')) confidence += 0.4;
    if (repo.name.toLowerCase().includes('dao')) confidence += 0.3;
    if (repo.kind === 'Class' || repo.kind === 'ClassFile') confidence += 0.2;

    return Math.min(1.0, confidence);
  }
}

// Additional pattern matchers would be implemented similarly...
// For brevity, I'll provide abbreviated implementations

class FactoryPatternMatcher implements PatternMatcher {
  readonly patternId = 'factory';
  readonly name = 'Factory Pattern';
  readonly description = 'Object creation abstraction pattern';
  readonly category = 'creational' as const;

  detect(graph: ParseOutput): ArchitecturalPattern[] {
    const entities = graph.entities;
    const factories = entities.filter((e) => e.name.toLowerCase().includes('factory') || e.name.toLowerCase().includes('builder'));

    return factories.map((factory) => ({
      id: `factory-${factory.name}`,
      name: 'Factory Pattern',
      description: `Factory pattern: ${factory.name}`,
      category: 'creational' as const,
      confidence: this.calculateConfidence([factory], new Map()),
      entities: [
        {
          role: 'factory',
          entityId: factory.name,
          entityType: factory.kind,
          description: 'Creates objects without exposing instantiation logic',
        },
      ],
      relationships: [],
      benefits: ['Encapsulates object creation', 'Reduces coupling', 'Supports dependency injection'],
    }));
  }

  // Required by PatternMatcher interface
  calculateConfidence(entities: EntityNode[], _relationships: Map<string, Set<string>>): number {
    const factory = entities[0];
    return factory.name.toLowerCase().includes('factory') ? 0.8 : 0.6;
  }
}

class ObserverPatternMatcher implements PatternMatcher {
  readonly patternId = 'observer';
  readonly name = 'Observer Pattern';
  readonly description = 'Event-driven pattern with subjects and observers';
  readonly category = 'behavioral' as const;

  detect(_graph: ParseOutput): ArchitecturalPattern[] {
    // Implementation would detect observer/subject relationships
    return [];
  }

  // Required by PatternMatcher interface
  calculateConfidence(_entities: EntityNode[], _relationships: Map<string, Set<string>>): number {
    return 0.5;
  }
}

class SingletonPatternMatcher implements PatternMatcher {
  readonly patternId = 'singleton';
  readonly name = 'Singleton Pattern';
  readonly description = 'Ensures single instance of a class';
  readonly category = 'creational' as const;

  detect(_graph: ParseOutput): ArchitecturalPattern[] {
    // Implementation would detect singleton patterns
    return [];
  }

  // Required by PatternMatcher interface
  calculateConfidence(_entities: EntityNode[], _relationships: Map<string, Set<string>>): number {
    return 0.5;
  }
}

class AdapterPatternMatcher implements PatternMatcher {
  readonly patternId = 'adapter';
  readonly name = 'Adapter Pattern';
  readonly description = 'Interface compatibility pattern';
  readonly category = 'structural' as const;

  detect(_graph: ParseOutput): ArchitecturalPattern[] {
    // Implementation would detect adapter patterns
    return [];
  }

  // Required by PatternMatcher interface
  calculateConfidence(_entities: EntityNode[], _relationships: Map<string, Set<string>>): number {
    return 0.5;
  }
}

class LayeredArchitectureMatcher implements PatternMatcher {
  readonly patternId = 'layered';
  readonly name = 'Layered Architecture';
  readonly description = 'Hierarchical layers with unidirectional dependencies';
  readonly category = 'architectural' as const;

  detect(_graph: ParseOutput): ArchitecturalPattern[] {
    // Implementation would detect layered architecture
    return [];
  }

  // Required by PatternMatcher interface
  calculateConfidence(_entities: EntityNode[], _relationships: Map<string, Set<string>>): number {
    return 0.5;
  }
}

class MicroservicesPatternMatcher implements PatternMatcher {
  readonly patternId = 'microservices';
  readonly name = 'Microservices Architecture';
  readonly description = 'Distributed architecture with independent services';
  readonly category = 'architectural' as const;

  detect(_graph: ParseOutput): ArchitecturalPattern[] {
    // Implementation would detect microservices patterns
    return [];
  }

  // Required by PatternMatcher interface
  calculateConfidence(_entities: EntityNode[], _relationships: Map<string, Set<string>>): number {
    return 0.5;
  }
}

// Anti-pattern matchers

class GodObjectAntiPatternMatcher implements PatternMatcher {
  readonly patternId = 'god-object';
  readonly name = 'God Object Anti-Pattern';
  readonly description = 'Object that knows too much or does too much';
  readonly category = 'anti-pattern' as const;

  detect(graph: ParseOutput): ArchitecturalPattern[] {
    const entities = graph.entities;
    const patterns: ArchitecturalPattern[] = [];

    // Look for entities with too many dependencies or responsibilities.
    // RFC-TM-6 §2 (rfc-tm-6-diamond.md) — class dispatch replaces the
    // legacy 'methods' in entity / 'imports' in entity duck-typing.
    // ClassNode carries no imports field (RFC-TM-3 §2.2 F3 disposition,
    // already-approved, out of this RFC's scope) — only ClassFileNode does.
    for (const entity of entities) {
      if (entity instanceof ClassNode || entity instanceof ClassFileNode) {
        const methods = entity.methods.length;
        const imports = entity instanceof ClassFileNode ? entity.imports.length : 0;

        if (methods > 20 || imports > 15) {
          patterns.push({
            id: `god-object-${entity.name}`,
            name: 'God Object Anti-Pattern',
            description: `${entity.name} may be doing too much`,
            category: 'anti-pattern',
            confidence: this.calculateConfidence([entity], new Map()),
            entities: [
              {
                role: 'god-object',
                entityId: entity.name,
                entityType: entity.kind,
                description: 'Object with excessive responsibilities',
              },
            ],
            relationships: [],
            benefits: [], // Anti-patterns have no benefits
            drawbacks: ['Difficult to test', 'Hard to maintain', 'Violates single responsibility principle'],
            recommendations: [
              'Break into smaller, focused classes',
              'Apply single responsibility principle',
              'Extract related functionality into separate classes',
            ],
          });
        }
      }
    }

    return patterns;
  }

  // Required by PatternMatcher interface
  calculateConfidence(entities: EntityNode[], _relationships: Map<string, Set<string>>): number {
    const entity = entities[0];
    if (entity instanceof ClassNode || entity instanceof ClassFileNode) {
      const methods = entity.methods.length;
      const imports = entity instanceof ClassFileNode ? entity.imports.length : 0;

      let score = 0;
      if (methods > 20) score += 0.5;
      if (imports > 15) score += 0.3;
      if (entity.name.toLowerCase().includes('manager')) score += 0.2;

      return Math.min(1.0, score);
    }
    return 0;
  }
}

class CircularDependencyAntiPatternMatcher implements PatternMatcher {
  readonly patternId = 'circular-dependency';
  readonly name = 'Circular Dependency Anti-Pattern';
  readonly description = 'Entities that depend on each other in a cycle';
  readonly category = 'anti-pattern' as const;

  detect(_graph: ParseOutput): ArchitecturalPattern[] {
    // Implementation would detect circular dependencies
    return [];
  }

  // Required by PatternMatcher interface
  calculateConfidence(_entities: EntityNode[], _relationships: Map<string, Set<string>>): number {
    return 0.8;
  }
}

class DeadCodeAntiPatternMatcher implements PatternMatcher {
  readonly patternId = 'dead-code';
  readonly name = 'Dead Code Anti-Pattern';
  readonly description = 'Code that is never used or executed';
  readonly category = 'anti-pattern' as const;

  detect(_graph: ParseOutput): ArchitecturalPattern[] {
    // Implementation would detect dead code
    return [];
  }

  // Required by PatternMatcher interface
  calculateConfidence(_entities: EntityNode[], _relationships: Map<string, Set<string>>): number {
    return 0.9;
  }
}

// Supporting interfaces

export interface PatternRecommendation {
  type: 'missing-pattern' | 'anti-pattern-fix' | 'pattern-improvement';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  pattern: string;
  benefits: string[];
  effort: 'low' | 'medium' | 'high';
}

export interface PatternVisualization {
  patternId: string;
  highlightedEntities: Array<{
    entityId: string;
    role: string;
    color: string;
    strokeWidth: number;
    animation: 'pulse' | 'glow' | 'none';
  }>;
  highlightedRelationships: Array<{
    from: string;
    to: string;
    type: string;
    color: string;
    strokeWidth: number;
    animation: 'flow' | 'pulse' | 'none';
  }>;
  overlay: PatternOverlay;
}

export interface PatternOverlay {
  title: string;
  description: string;
  confidence: number;
  category: string;
  entities: PatternEntity[];
  relationships: PatternRelationship[];
}
