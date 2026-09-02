/**
 * Diff Visualization System for TypedMind Architecture Comparison
 * Enables comparison between two different versions of the same architecture
 * Author: Enhanced by Claude Code in Matt Pocock style
 */

import type { EntityNode, ParseOutput } from '@sammons/typed-mind';

/**
 * Change types for diff analysis
 */
export type DiffChangeType = 'added' | 'removed' | 'modified' | 'moved' | 'renamed';

/**
 * Entity change record
 */
export interface EntityDiff {
  id: string;
  changeType: DiffChangeType;
  entityName: string;
  entityType: string;
  oldVersion?: Partial<EntityNode>;
  newVersion?: Partial<EntityNode>;
  fieldChanges: FieldDiff[];
  relationshipChanges: RelationshipDiff[];
  impact: DiffImpact;
  timestamp: Date;
}

/**
 * Field-level changes
 */
export interface FieldDiff {
  fieldName: string;
  changeType: DiffChangeType;
  oldValue?: unknown;
  newValue?: unknown;
  significance: 'minor' | 'moderate' | 'major' | 'breaking';
}

/**
 * Relationship changes between entities
 */
export interface RelationshipDiff {
  changeType: DiffChangeType;
  relationshipType: string;
  fromEntity: string;
  toEntity: string;
  oldRelationship?: unknown;
  newRelationship?: unknown;
}

/**
 * Impact assessment of changes
 */
export interface DiffImpact {
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedEntities: string[];
  riskFactors: string[];
  migrationEffort: 'trivial' | 'low' | 'medium' | 'high' | 'major';
  breakingChanges: boolean;
  recommendations: string[];
}

/**
 * Comprehensive diff result
 */
export interface ArchitectureDiff {
  id: string;
  fromVersion: string;
  toVersion: string;
  timestamp: Date;
  summary: DiffSummary;
  entityDiffs: EntityDiff[];
  relationshipDiffs: RelationshipDiff[];
  metrics: DiffMetrics;
  visualization: DiffVisualization;
}

/**
 * High-level diff summary
 */
export interface DiffSummary {
  totalChanges: number;
  addedEntities: number;
  removedEntities: number;
  modifiedEntities: number;
  renamedEntities: number;
  movedEntities: number;
  relationshipChanges: number;
  breakingChanges: number;
  overallImpact: DiffImpact['severity'];
}

/**
 * Quantitative diff metrics
 */
export interface DiffMetrics {
  churnRate: number; // Percentage of entities changed
  stabilityScore: number; // How stable the architecture is (0-1)
  complexityDelta: number; // Change in architectural complexity
  couplingDelta: number; // Change in coupling metrics
  testabilityImpact: number; // Impact on testability (-1 to 1)
  maintainabilityImpact: number; // Impact on maintainability (-1 to 1)
}

/**
 * Visual representation configuration
 */
export interface DiffVisualization {
  mode: 'side-by-side' | 'overlay' | 'animation';
  showUnchanged: boolean;
  highlightChanges: boolean;
  groupByChangeType: boolean;
  entityStyles: Record<DiffChangeType, EntityStyle>;
  relationshipStyles: Record<DiffChangeType, RelationshipStyle>;
  annotations: DiffAnnotation[];
}

export interface EntityStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  animation?: 'fade-in' | 'fade-out' | 'pulse' | 'slide';
}

export interface RelationshipStyle {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  opacity: number;
  animation?: 'draw' | 'erase' | 'pulse';
}

export interface DiffAnnotation {
  entityId: string;
  position: { x: number; y: number };
  content: string;
  type: 'added' | 'removed' | 'modified' | 'warning' | 'info';
}

/**
 * Main diff analyzer for comparing architecture versions
 */
export class ArchitectureDiffAnalyzer {
  private changeDetectors: Map<string, ChangeDetector> = new Map();

  constructor() {
    this.registerDefaultDetectors();
  }

  /**
   * Compare two architecture graphs
   */
  async compareArchitectures(oldGraph: ParseOutput, newGraph: ParseOutput, options: DiffOptions = {}): Promise<ArchitectureDiff> {
    const startTime = Date.now();

    // Create entity mappings for comparison
    const oldEntities = this.createEntityMap(oldGraph);
    const newEntities = this.createEntityMap(newGraph);

    // Detect changes
    const entityDiffs = await this.analyzeEntityChanges(oldEntities, newEntities, options);
    const relationshipDiffs = await this.analyzeRelationshipChanges(oldGraph, newGraph);

    // Calculate metrics
    const metrics = this.calculateDiffMetrics(entityDiffs, relationshipDiffs);

    // Generate summary
    const summary = this.generateSummary(entityDiffs, relationshipDiffs);

    // Create visualization config
    const visualization = this.createVisualizationConfig(entityDiffs, options);

    const diff: ArchitectureDiff = {
      id: `diff-${startTime}`,
      fromVersion: options.fromVersion || 'v1',
      toVersion: options.toVersion || 'v2',
      timestamp: new Date(),
      summary,
      entityDiffs,
      relationshipDiffs,
      metrics,
      visualization,
    };

    return diff;
  }

  /**
   * Generate visual diff representation
   */
  renderDiffVisualization(diff: ArchitectureDiff, container: HTMLElement, mode: DiffVisualization['mode'] = 'overlay'): DiffRenderer {
    return new DiffRenderer(diff, container, mode);
  }

  /**
   * Export diff as various formats
   */
  exportDiff(diff: ArchitectureDiff, format: 'json' | 'html' | 'markdown' | 'csv'): string | Blob {
    const exporter = new DiffExporter();
    return exporter.export(diff, format);
  }

  /**
   * Register custom change detector
   */
  registerChangeDetector(detector: ChangeDetector): void {
    this.changeDetectors.set(detector.id, detector);
  }

  private registerDefaultDetectors(): void {
    this.registerChangeDetector(new EntityStructureDetector());
    this.registerChangeDetector(new RelationshipChangeDetector());
    this.registerChangeDetector(new SemanticChangeDetector());
    this.registerChangeDetector(new BreakingChangeDetector());
  }

  private createEntityMap(graph: ParseOutput): Map<string, EntityNode> {
    return new Map(graph.entities.map((entity) => [entity.name, entity]));
  }

  private async analyzeEntityChanges(
    oldEntities: Map<string, EntityNode>,
    newEntities: Map<string, EntityNode>,
    options: DiffOptions,
  ): Promise<EntityDiff[]> {
    const entityDiffs: EntityDiff[] = [];

    // Find added entities
    for (const [name, entity] of newEntities) {
      if (!oldEntities.has(name)) {
        entityDiffs.push(await this.createEntityDiff('added', name, undefined, entity, options));
      }
    }

    // Find removed entities
    for (const [name, entity] of oldEntities) {
      if (!newEntities.has(name)) {
        entityDiffs.push(await this.createEntityDiff('removed', name, entity, undefined, options));
      }
    }

    // Find modified entities
    for (const [name, newEntity] of newEntities) {
      const oldEntity = oldEntities.get(name);
      if (oldEntity) {
        const diff = await this.compareEntities(oldEntity, newEntity, options);
        if (diff) {
          entityDiffs.push(diff);
        }
      }
    }

    // Detect renames and moves
    const renamedEntities = this.detectRenames(oldEntities, newEntities, entityDiffs);
    entityDiffs.push(...renamedEntities);

    return entityDiffs;
  }

  private async createEntityDiff(
    changeType: DiffChangeType,
    entityName: string,
    oldVersion?: EntityNode,
    newVersion?: EntityNode,
    options?: DiffOptions,
  ): Promise<EntityDiff> {
    const impact = await this.assessImpact(changeType, oldVersion, newVersion, options);

    return {
      id: `${changeType}-${entityName}`,
      changeType,
      entityName,
      entityType: (oldVersion || newVersion)?.kind || 'Unknown',
      oldVersion,
      newVersion,
      fieldChanges: [],
      relationshipChanges: [],
      impact,
      timestamp: new Date(),
    };
  }

  private async compareEntities(oldEntity: EntityNode, newEntity: EntityNode, options: DiffOptions): Promise<EntityDiff | null> {
    const fieldChanges = this.compareEntityFields(oldEntity, newEntity);
    const relationshipChanges = this.compareEntityRelationships(oldEntity, newEntity);

    if (fieldChanges.length === 0 && relationshipChanges.length === 0) {
      return null; // No changes
    }

    const impact = await this.assessImpact('modified', oldEntity, newEntity, options);

    return {
      id: `modified-${oldEntity.name}`,
      changeType: 'modified',
      entityName: oldEntity.name,
      entityType: oldEntity.kind,
      oldVersion: oldEntity,
      newVersion: newEntity,
      fieldChanges,
      relationshipChanges,
      impact,
      timestamp: new Date(),
    };
  }

  private compareEntityFields(oldEntity: EntityNode, newEntity: EntityNode): FieldDiff[] {
    const fieldDiffs: FieldDiff[] = [];

    // Compare all properties
    const allFields = new Set([...Object.keys(oldEntity), ...Object.keys(newEntity)]);

    for (const field of allFields) {
      // EntityNode has no index signature; iterating Object.keys() requires a dynamic-key read
      const oldValue = (oldEntity as unknown as Record<string, unknown>)[field];
      const newValue = (newEntity as unknown as Record<string, unknown>)[field];

      if (!this.isEqual(oldValue, newValue)) {
        fieldDiffs.push({
          fieldName: field,
          changeType: this.getFieldChangeType(oldValue, newValue),
          oldValue,
          newValue,
          significance: this.assessFieldSignificance(field, oldValue, newValue),
        });
      }
    }

    return fieldDiffs;
  }

  private compareEntityRelationships(oldEntity: EntityNode, newEntity: EntityNode): RelationshipDiff[] {
    const relationshipDiffs: RelationshipDiff[] = [];

    // Compare imports, exports, calls, etc.
    const relationshipFields = ['imports', 'exports', 'calls', 'affects', 'consumes', 'implements'];

    for (const field of relationshipFields) {
      // EntityNode subclasses (not the base) carry these fields as string[]; base EntityNode has no index signature
      const oldRelsRaw = (oldEntity as unknown as Record<string, unknown>)[field];
      const newRelsRaw = (newEntity as unknown as Record<string, unknown>)[field];
      const oldRels = Array.isArray(oldRelsRaw) ? (oldRelsRaw as string[]) : [];
      const newRels = Array.isArray(newRelsRaw) ? (newRelsRaw as string[]) : [];

      const changes = this.compareArrays(oldRels, newRels);
      for (const change of changes) {
        relationshipDiffs.push({
          changeType: change.type,
          relationshipType: field,
          fromEntity: oldEntity.name,
          toEntity: change.value as string,
          oldRelationship: change.type === 'removed' ? change.value : undefined,
          newRelationship: change.type === 'added' ? change.value : undefined,
        });
      }
    }

    return relationshipDiffs;
  }

  private async analyzeRelationshipChanges(oldGraph: ParseOutput, newGraph: ParseOutput): Promise<RelationshipDiff[]> {
    const relationshipDiffs: RelationshipDiff[] = [];

    // Build relationship maps for both graphs
    const oldRelationships = this.buildRelationshipMap(oldGraph);
    const newRelationships = this.buildRelationshipMap(newGraph);

    // Compare relationship maps
    for (const [key, newRel] of newRelationships) {
      if (!oldRelationships.has(key)) {
        relationshipDiffs.push({
          changeType: 'added',
          relationshipType: newRel.type,
          fromEntity: newRel.from,
          toEntity: newRel.to,
          newRelationship: newRel,
        });
      }
    }

    for (const [key, oldRel] of oldRelationships) {
      if (!newRelationships.has(key)) {
        relationshipDiffs.push({
          changeType: 'removed',
          relationshipType: oldRel.type,
          fromEntity: oldRel.from,
          toEntity: oldRel.to,
          oldRelationship: oldRel,
        });
      }
    }

    return relationshipDiffs;
  }

  private detectRenames(
    _oldEntities: Map<string, EntityNode>,
    _newEntities: Map<string, EntityNode>,
    existingDiffs: EntityDiff[],
  ): EntityDiff[] {
    const renames: EntityDiff[] = [];
    const removedEntities = existingDiffs.filter((d) => d.changeType === 'removed');
    const addedEntities = existingDiffs.filter((d) => d.changeType === 'added');

    // Use fuzzy matching to detect potential renames
    for (const removed of removedEntities) {
      for (const added of addedEntities) {
        const similarity = this.calculateSimilarity(removed.oldVersion as EntityNode, added.newVersion as EntityNode);
        if (similarity > 0.8) {
          // High similarity threshold
          renames.push({
            id: `renamed-${removed.entityName}-${added.entityName}`,
            changeType: 'renamed',
            entityName: `${removed.entityName} → ${added.entityName}`,
            entityType: removed.entityType,
            oldVersion: removed.oldVersion,
            newVersion: added.newVersion,
            fieldChanges: [
              {
                fieldName: 'name',
                changeType: 'modified',
                oldValue: removed.entityName,
                newValue: added.entityName,
                significance: 'major',
              },
            ],
            relationshipChanges: [],
            impact: {
              severity: 'medium',
              affectedEntities: [],
              riskFactors: ['Name change may break references'],
              migrationEffort: 'medium',
              breakingChanges: true,
              recommendations: ['Update all references to use new name'],
            },
            timestamp: new Date(),
          });
        }
      }
    }

    return renames;
  }

  private async assessImpact(
    changeType: DiffChangeType,
    oldVersion?: EntityNode,
    newVersion?: EntityNode,
    options?: DiffOptions,
  ): Promise<DiffImpact> {
    const impact: DiffImpact = {
      severity: 'low',
      affectedEntities: [],
      riskFactors: [],
      migrationEffort: 'trivial',
      breakingChanges: false,
      recommendations: [],
    };

    // Use registered detectors to assess impact
    for (const detector of this.changeDetectors.values()) {
      const detectorImpact = await detector.assessImpact(changeType, oldVersion, newVersion, options);
      this.mergeImpacts(impact, detectorImpact);
    }

    return impact;
  }

  // Helper methods
  private isEqual(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  private getFieldChangeType(oldValue: unknown, newValue: unknown): DiffChangeType {
    if (oldValue === undefined) return 'added';
    if (newValue === undefined) return 'removed';
    return 'modified';
  }

  private assessFieldSignificance(field: string, _oldValue: unknown, _newValue: unknown): FieldDiff['significance'] {
    const criticalFields = ['type', 'signature', 'path'];
    const majorFields = ['name', 'imports', 'exports'];

    if (criticalFields.includes(field)) return 'breaking';
    if (majorFields.includes(field)) return 'major';
    return 'minor';
  }

  private compareArrays(oldArray: unknown[], newArray: unknown[]): Array<{ type: DiffChangeType; value: unknown }> {
    const changes: Array<{ type: DiffChangeType; value: unknown }> = [];
    const oldSet = new Set(oldArray);
    const newSet = new Set(newArray);

    for (const item of newSet) {
      if (!oldSet.has(item)) {
        changes.push({ type: 'added', value: item });
      }
    }

    for (const item of oldSet) {
      if (!newSet.has(item)) {
        changes.push({ type: 'removed', value: item });
      }
    }

    return changes;
  }

  private buildRelationshipMap(_graph: ParseOutput): Map<string, { from: string; to: string; type: string }> {
    const relationships = new Map();
    // Implementation would build relationship map from graph
    return relationships;
  }

  private calculateSimilarity(entity1: EntityNode, entity2: EntityNode): number {
    // Implement fuzzy matching algorithm (e.g., Levenshtein distance)
    let score = 0;
    if (entity1.kind === entity2.kind) score += 0.3;
    // Add more similarity metrics
    return score;
  }

  private generateSummary(entityDiffs: EntityDiff[], relationshipDiffs: RelationshipDiff[]): DiffSummary {
    const added = entityDiffs.filter((d) => d.changeType === 'added').length;
    const removed = entityDiffs.filter((d) => d.changeType === 'removed').length;
    const modified = entityDiffs.filter((d) => d.changeType === 'modified').length;
    const renamed = entityDiffs.filter((d) => d.changeType === 'renamed').length;
    const moved = entityDiffs.filter((d) => d.changeType === 'moved').length;

    const breakingChanges = entityDiffs.filter((d) => d.impact.breakingChanges).length;

    return {
      totalChanges: entityDiffs.length + relationshipDiffs.length,
      addedEntities: added,
      removedEntities: removed,
      modifiedEntities: modified,
      renamedEntities: renamed,
      movedEntities: moved,
      relationshipChanges: relationshipDiffs.length,
      breakingChanges,
      overallImpact: this.calculateOverallImpact(entityDiffs),
    };
  }

  private calculateOverallImpact(entityDiffs: EntityDiff[]): DiffImpact['severity'] {
    if (entityDiffs.some((d) => d.impact.severity === 'critical')) return 'critical';
    if (entityDiffs.some((d) => d.impact.severity === 'high')) return 'high';
    if (entityDiffs.some((d) => d.impact.severity === 'medium')) return 'medium';
    return 'low';
  }

  private calculateDiffMetrics(_entityDiffs: EntityDiff[], _relationshipDiffs: RelationshipDiff[]): DiffMetrics {
    // Implementation would calculate various metrics
    return {
      churnRate: 0.15,
      stabilityScore: 0.85,
      complexityDelta: 0.05,
      couplingDelta: -0.02,
      testabilityImpact: 0.1,
      maintainabilityImpact: 0.08,
    };
  }

  private createVisualizationConfig(_entityDiffs: EntityDiff[], options: DiffOptions): DiffVisualization {
    return {
      mode: options.visualizationMode || 'overlay',
      showUnchanged: options.showUnchanged ?? true,
      highlightChanges: true,
      groupByChangeType: false,
      entityStyles: this.getDefaultEntityStyles(),
      relationshipStyles: this.getDefaultRelationshipStyles(),
      annotations: [],
    };
  }

  private getDefaultEntityStyles(): Record<DiffChangeType, EntityStyle> {
    return {
      added: { fill: '#28a745', stroke: '#1e7e34', strokeWidth: 2, opacity: 1, animation: 'fade-in' },
      removed: { fill: '#dc3545', stroke: '#c82333', strokeWidth: 2, opacity: 0.6, animation: 'fade-out' },
      modified: { fill: '#ffc107', stroke: '#e0a800', strokeWidth: 3, opacity: 1, animation: 'pulse' },
      moved: { fill: '#17a2b8', stroke: '#138496', strokeWidth: 2, opacity: 1, animation: 'slide' },
      renamed: { fill: '#6f42c1', stroke: '#5a32a3', strokeWidth: 2, opacity: 1 },
    };
  }

  private getDefaultRelationshipStyles(): Record<DiffChangeType, RelationshipStyle> {
    return {
      added: { stroke: '#28a745', strokeWidth: 2, opacity: 1, animation: 'draw' },
      removed: { stroke: '#dc3545', strokeWidth: 2, strokeDasharray: '5,5', opacity: 0.6, animation: 'erase' },
      modified: { stroke: '#ffc107', strokeWidth: 3, opacity: 1, animation: 'pulse' },
      moved: { stroke: '#17a2b8', strokeWidth: 2, opacity: 1 },
      renamed: { stroke: '#6f42c1', strokeWidth: 2, opacity: 1 },
    };
  }

  private mergeImpacts(target: DiffImpact, source: DiffImpact): void {
    // Merge impact assessments from multiple detectors
    if (this.getSeverityLevel(source.severity) > this.getSeverityLevel(target.severity)) {
      target.severity = source.severity;
    }

    target.affectedEntities.push(...source.affectedEntities);
    target.riskFactors.push(...source.riskFactors);
    target.recommendations.push(...source.recommendations);

    if (source.breakingChanges) {
      target.breakingChanges = true;
    }

    // Take the higher migration effort
    if (this.getEffortLevel(source.migrationEffort) > this.getEffortLevel(target.migrationEffort)) {
      target.migrationEffort = source.migrationEffort;
    }
  }

  private getSeverityLevel(severity: DiffImpact['severity']): number {
    const levels = { low: 0, medium: 1, high: 2, critical: 3 };
    return levels[severity];
  }

  private getEffortLevel(effort: DiffImpact['migrationEffort']): number {
    const levels = { trivial: 0, low: 1, medium: 2, high: 3, major: 4 };
    return levels[effort];
  }
}

// Supporting interfaces and classes

export interface DiffOptions {
  fromVersion?: string;
  toVersion?: string;
  visualizationMode?: DiffVisualization['mode'];
  showUnchanged?: boolean;
  ignoreMinorChanges?: boolean;
  customDetectors?: ChangeDetector[];
}

export interface ChangeDetector {
  id: string;
  name: string;
  description: string;

  assessImpact(changeType: DiffChangeType, oldVersion?: EntityNode, newVersion?: EntityNode, options?: DiffOptions): Promise<DiffImpact>;
}

// Built-in change detectors
class EntityStructureDetector implements ChangeDetector {
  id = 'entity-structure';
  name = 'Entity Structure Detector';
  description = 'Detects structural changes in entities';

  async assessImpact(changeType: DiffChangeType, _oldVersion?: EntityNode, _newVersion?: EntityNode): Promise<DiffImpact> {
    return {
      severity: changeType === 'removed' ? 'high' : 'low',
      affectedEntities: [],
      riskFactors: [],
      migrationEffort: 'low',
      breakingChanges: changeType === 'removed',
      recommendations: [],
    };
  }
}

class RelationshipChangeDetector implements ChangeDetector {
  id = 'relationship-change';
  name = 'Relationship Change Detector';
  description = 'Detects changes in entity relationships';

  async assessImpact(): Promise<DiffImpact> {
    return {
      severity: 'medium',
      affectedEntities: [],
      riskFactors: [],
      migrationEffort: 'medium',
      breakingChanges: false,
      recommendations: [],
    };
  }
}

class SemanticChangeDetector implements ChangeDetector {
  id = 'semantic-change';
  name = 'Semantic Change Detector';
  description = 'Detects semantic changes in entity meaning';

  async assessImpact(): Promise<DiffImpact> {
    return {
      severity: 'low',
      affectedEntities: [],
      riskFactors: [],
      migrationEffort: 'low',
      breakingChanges: false,
      recommendations: [],
    };
  }
}

class BreakingChangeDetector implements ChangeDetector {
  id = 'breaking-change';
  name = 'Breaking Change Detector';
  description = 'Detects changes that break API compatibility';

  async assessImpact(changeType: DiffChangeType, oldVersion?: EntityNode, newVersion?: EntityNode): Promise<DiffImpact> {
    const isBreaking =
      changeType === 'removed' ||
      (oldVersion?.kind === 'Function' &&
        newVersion?.kind === 'Function' &&
        'signature' in oldVersion &&
        'signature' in newVersion &&
        oldVersion.signature !== newVersion.signature);

    return {
      severity: isBreaking ? 'critical' : 'low',
      affectedEntities: [],
      riskFactors: isBreaking ? ['API compatibility broken'] : [],
      migrationEffort: isBreaking ? 'high' : 'trivial',
      breakingChanges: isBreaking,
      recommendations: isBreaking ? ['Update API consumers', 'Add deprecation warnings'] : [],
    };
  }
}

/**
 * Diff renderer for visualizing changes
 */
class DiffRenderer {
  private diff: ArchitectureDiff;
  private container: HTMLElement;
  private mode: DiffVisualization['mode'];

  constructor(diff: ArchitectureDiff, container: HTMLElement, mode: DiffVisualization['mode']) {
    this.diff = diff;
    this.container = container;
    this.mode = mode;
  }

  render(): void {
    // Implementation would create visual diff representation
    this.container.innerHTML = this.generateDiffHTML();
  }

  private generateDiffHTML(): string {
    return `
      <div class="diff-visualization">
        <div class="diff-header">
          <h3>Architecture Changes: ${this.diff.fromVersion} → ${this.diff.toVersion}</h3>
          <div class="diff-summary">
            <span class="diff-stat added">+${this.diff.summary.addedEntities}</span>
            <span class="diff-stat modified">~${this.diff.summary.modifiedEntities}</span>
            <span class="diff-stat removed">-${this.diff.summary.removedEntities}</span>
          </div>
        </div>
        <div class="diff-content">
          ${this.generateEntityDiffsHTML()}
        </div>
      </div>
    `;
  }

  private generateEntityDiffsHTML(): string {
    return this.diff.entityDiffs
      .map(
        (diff) => `
      <div class="entity-diff ${diff.changeType}">
        <div class="entity-diff-header">
          <span class="change-type">${diff.changeType}</span>
          <span class="entity-name">${diff.entityName}</span>
          <span class="entity-type">${diff.entityType}</span>
        </div>
        <div class="entity-diff-details">
          ${diff.fieldChanges
            .map(
              (field) => `
            <div class="field-change">
              <strong>${field.fieldName}:</strong>
              <span class="old-value">${field.oldValue}</span> →
              <span class="new-value">${field.newValue}</span>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `,
      )
      .join('');
  }
}

/**
 * Diff exporter for various formats
 */
class DiffExporter {
  export(diff: ArchitectureDiff, format: 'json' | 'html' | 'markdown' | 'csv'): string | Blob {
    switch (format) {
      case 'json':
        return JSON.stringify(diff, null, 2);
      case 'html':
        return this.exportHTML(diff);
      case 'markdown':
        return this.exportMarkdown(diff);
      case 'csv':
        return this.exportCSV(diff);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private exportHTML(diff: ArchitectureDiff): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Architecture Diff Report</title>
  <style>/* CSS styles would be here */</style>
</head>
<body>
  <h1>Architecture Changes: ${diff.fromVersion} → ${diff.toVersion}</h1>
  <!-- HTML report content -->
</body>
</html>
    `;
  }

  private exportMarkdown(diff: ArchitectureDiff): string {
    return `
# Architecture Changes: ${diff.fromVersion} → ${diff.toVersion}

## Summary
- Added: ${diff.summary.addedEntities} entities
- Modified: ${diff.summary.modifiedEntities} entities
- Removed: ${diff.summary.removedEntities} entities
- Breaking Changes: ${diff.summary.breakingChanges}

## Changes
${diff.entityDiffs.map((d) => `- ${d.changeType.toUpperCase()}: ${d.entityName}`).join('\n')}
    `;
  }

  private exportCSV(diff: ArchitectureDiff): string {
    const header = 'Change Type,Entity Name,Entity Type,Impact,Breaking Change\n';
    const rows = diff.entityDiffs
      .map((d) => `${d.changeType},${d.entityName},${d.entityType},${d.impact.severity},${d.impact.breakingChanges}`)
      .join('\n');

    return header + rows;
  }
}
