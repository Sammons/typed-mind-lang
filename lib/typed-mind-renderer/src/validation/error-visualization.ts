/**
 * Validation Error Visualization System
 * Provides comprehensive error display with inline badges, severity indicators, and suggested fixes
 * Author: Enhanced by Claude Code in Matt Pocock style
 */

import type { ValidationError, ValidationResult } from '@sammons/typed-mind';

export type ErrorSeverity = 'error' | 'warning' | 'info' | 'success';

export interface EnhancedValidationError extends ValidationError {
  id: string;
  category: 'syntax' | 'reference' | 'structure' | 'best-practice' | 'performance';
  affectedEntities: string[];
  quickFix?: QuickFix;
  documentation?: string;
  examples?: string[];
  relatedErrors?: string[];
}

export interface QuickFix {
  title: string;
  description: string;
  action: 'replace' | 'add' | 'remove' | 'restructure';
  preview?: string;
  confident: boolean;
}

export interface ErrorVisualizationOptions {
  showInlineErrors: boolean;
  showSeverityIcons: boolean;
  groupRelatedErrors: boolean;
  enableQuickFixes: boolean;
  maxInlineErrors: number;
  autoHighlightAffectedEntities: boolean;
}

/**
 * Enhanced error processing and categorization
 */
export class ValidationErrorProcessor {
  private errorCatalog = new Map<
    string,
    {
      category: EnhancedValidationError['category'];
      quickFix?: (error: ValidationError) => QuickFix | null;
      documentation: string;
      examples: string[];
    }
  >();

  constructor() {
    this.initializeErrorCatalog();
  }

  /**
   * Process validation result into enhanced error format
   */
  processErrors(result: ValidationResult): EnhancedValidationError[] {
    return result.errors.map((error, index) => {
      const enhanced: EnhancedValidationError = {
        ...error,
        id: `error-${index}-${Date.now()}`,
        category: this.categorizeError(error),
        affectedEntities: this.extractAffectedEntities(error),
        relatedErrors: [],
      };

      // Add quick fix if available
      const catalog = this.getErrorCatalogEntry(error);
      if (catalog?.quickFix) {
        const quickFix = catalog.quickFix(error);
        if (quickFix) {
          enhanced.quickFix = quickFix;
        }
      }

      if (catalog) {
        enhanced.documentation = catalog.documentation;
        enhanced.examples = catalog.examples;
      }

      return enhanced;
    });
  }

  /**
   * Group related errors together
   */
  groupRelatedErrors(errors: EnhancedValidationError[]): Array<{
    group: string;
    errors: EnhancedValidationError[];
    severity: ErrorSeverity;
  }> {
    const groups = new Map<string, EnhancedValidationError[]>();

    for (const error of errors) {
      const groupKey = this.getGroupKey(error);
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)?.push(error);
    }

    return Array.from(groups.entries()).map(([group, groupErrors]) => ({
      group,
      errors: groupErrors,
      severity: this.getGroupSeverity(groupErrors),
    }));
  }

  /**
   * Generate error statistics
   */
  generateErrorStats(errors: EnhancedValidationError[]): {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<ErrorSeverity, number>;
    fixable: number;
    critical: number;
  } {
    const stats = {
      total: errors.length,
      byCategory: {} as Record<string, number>,
      bySeverity: { error: 0, warning: 0, info: 0, success: 0 } as Record<ErrorSeverity, number>,
      fixable: 0,
      critical: 0,
    };

    for (const error of errors) {
      // Count by category
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;

      // Count by severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;

      // Count fixable errors
      if (error.quickFix) {
        stats.fixable++;
      }

      // Count critical errors
      if (error.severity === 'error' && error.category !== 'best-practice') {
        stats.critical++;
      }
    }

    return stats;
  }

  private initializeErrorCatalog(): void {
    // Syntax errors
    this.errorCatalog.set('Invalid entity name', {
      category: 'syntax',
      documentation: 'Entity names must start with a letter and contain only letters, numbers, and underscores.',
      examples: ['ValidName', 'valid_name', 'Component123'],
      quickFix: (_error) => ({
        title: 'Fix entity name',
        description: 'Rename to follow valid identifier rules',
        action: 'replace',
        confident: true,
      }),
    });

    // Reference errors
    this.errorCatalog.set('Undefined reference', {
      category: 'reference',
      documentation: 'Referenced entity does not exist in the current scope or imported modules.',
      examples: ['Make sure entity is defined', 'Check import statements', 'Verify spelling'],
      quickFix: (_error) => ({
        title: 'Create missing entity',
        description: 'Generate a skeleton entity definition',
        action: 'add',
        confident: false,
      }),
    });

    // Structure errors
    this.errorCatalog.set('Circular dependency', {
      category: 'structure',
      documentation: 'Entities form a circular dependency chain, which can cause runtime issues.',
      examples: ['Introduce abstraction layer', 'Use dependency injection', 'Refactor shared logic'],
      quickFix: (_error) => ({
        title: 'Break circular dependency',
        description: 'Extract shared functionality to new entity',
        action: 'restructure',
        confident: false,
      }),
    });

    // Best practice warnings
    this.errorCatalog.set('Unused entity', {
      category: 'best-practice',
      documentation: 'Entity is defined but not referenced by any other entity.',
      examples: ['Remove if truly unused', 'Export for external use', 'Add documentation'],
      quickFix: (_error) => ({
        title: 'Remove unused entity',
        description: 'Delete entity if not needed',
        action: 'remove',
        confident: true,
      }),
    });
  }

  private categorizeError(error: ValidationError): EnhancedValidationError['category'] {
    const message = error.message.toLowerCase();

    if (message.includes('invalid') || message.includes('syntax')) {
      return 'syntax';
    }

    if (message.includes('undefined') || message.includes('not found') || message.includes('reference')) {
      return 'reference';
    }

    if (message.includes('circular') || message.includes('dependency') || message.includes('structure')) {
      return 'structure';
    }

    if (message.includes('unused') || message.includes('should') || message.includes('recommend')) {
      return 'best-practice';
    }

    if (message.includes('performance') || message.includes('slow')) {
      return 'performance';
    }

    return 'syntax'; // Default fallback
  }

  private extractAffectedEntities(error: ValidationError): string[] {
    // Extract entity names from error message using regex
    const entityPattern = /\b([A-Z][a-zA-Z0-9_]*)\b/g;
    const matches = error.message.match(entityPattern) || [];
    return [...new Set(matches)]; // Remove duplicates
  }

  private getErrorCatalogEntry(error: ValidationError) {
    // Try to match error message to known patterns
    for (const [pattern, entry] of this.errorCatalog.entries()) {
      if (error.message.toLowerCase().includes(pattern.toLowerCase())) {
        return entry;
      }
    }
    return null;
  }

  private getGroupKey(error: EnhancedValidationError): string {
    // Group by category and affected entities
    const entityKey = error.affectedEntities.sort().join(',');
    return `${error.category}-${entityKey}`;
  }

  private getGroupSeverity(errors: EnhancedValidationError[]): ErrorSeverity {
    const severityOrder: ErrorSeverity[] = ['error', 'warning', 'info', 'success'];

    for (const severity of severityOrder) {
      if (errors.some((e) => e.severity === severity)) {
        return severity;
      }
    }

    return 'info';
  }
}

/**
 * Visual error rendering system
 */
export class ErrorVisualizationRenderer {
  private container: HTMLElement;
  private options: ErrorVisualizationOptions;
  private processor: ValidationErrorProcessor;

  constructor(container: HTMLElement, options: Partial<ErrorVisualizationOptions> = {}) {
    this.container = container;
    this.processor = new ValidationErrorProcessor();
    this.options = {
      showInlineErrors: true,
      showSeverityIcons: true,
      groupRelatedErrors: true,
      enableQuickFixes: true,
      maxInlineErrors: 10,
      autoHighlightAffectedEntities: true,
      ...options,
    };
  }

  /**
   * Render error visualization panel
   */
  renderErrorPanel(result: ValidationResult): void {
    const errors = this.processor.processErrors(result);
    const stats = this.processor.generateErrorStats(errors);
    const groups = this.options.groupRelatedErrors
      ? this.processor.groupRelatedErrors(errors)
      : [{ group: 'All Errors', errors, severity: 'error' as ErrorSeverity }];

    this.container.innerHTML = this.generateErrorPanelHTML(stats, groups);
    this.attachEventListeners();
  }

  /**
   * Create inline error badges for entities
   */
  createInlineErrorBadge(entityId: string, errors: EnhancedValidationError[]): HTMLElement {
    const badge = document.createElement('div');
    badge.className = 'error-badge';
    badge.dataset['entityId'] = entityId;

    const severestError = errors.sort((a, b) => this.getSeverityOrder(b.severity) - this.getSeverityOrder(a.severity))[0];

    badge.className += ` error-badge-${severestError.severity}`;

    if (this.options.showSeverityIcons) {
      badge.innerHTML = `
        <div class="error-badge-icon">${this.getSeverityIcon(severestError.severity)}</div>
        <div class="error-badge-count">${errors.length}</div>
      `;
    } else {
      badge.textContent = errors.length.toString();
    }

    // Add tooltip
    badge.title = this.generateErrorTooltip(errors);

    return badge;
  }

  /**
   * Highlight affected entities in the visualization
   */
  highlightAffectedEntities(errors: EnhancedValidationError[], svg: SVGSVGElement): void {
    if (!this.options.autoHighlightAffectedEntities) return;

    // Clear previous highlights
    svg.querySelectorAll('.error-highlight').forEach((el) => {
      el.classList.remove('error-highlight');
    });

    // Apply new highlights
    for (const error of errors) {
      for (const entityName of error.affectedEntities) {
        const entityNode = svg.querySelector(`[data-entity-id="${entityName}"]`);
        if (entityNode) {
          entityNode.classList.add('error-highlight', `error-${error.severity}`);
        }
      }
    }
  }

  private generateErrorPanelHTML(
    stats: ReturnType<ValidationErrorProcessor['generateErrorStats']>,
    groups: ReturnType<ValidationErrorProcessor['groupRelatedErrors']>,
  ): string {
    return `
      <div class="error-panel">
        <div class="error-panel-header">
          <h3>Validation Results</h3>
          <div class="error-stats">
            <div class="error-stat error-stat-total">
              <span class="error-stat-value">${stats.total}</span>
              <span class="error-stat-label">Total Issues</span>
            </div>
            <div class="error-stat error-stat-critical">
              <span class="error-stat-value">${stats.critical}</span>
              <span class="error-stat-label">Critical</span>
            </div>
            <div class="error-stat error-stat-fixable">
              <span class="error-stat-value">${stats.fixable}</span>
              <span class="error-stat-label">Fixable</span>
            </div>
          </div>
        </div>

        <div class="error-groups">
          ${groups.map((group) => this.generateErrorGroupHTML(group)).join('')}
        </div>

        ${this.generateErrorCategoryBreakdown(stats)}
      </div>
    `;
  }

  private generateErrorGroupHTML(group: ReturnType<ValidationErrorProcessor['groupRelatedErrors']>[0]): string {
    return `
      <div class="error-group" data-severity="${group.severity}">
        <div class="error-group-header">
          <div class="error-group-title">
            ${this.getSeverityIcon(group.severity)}
            <span>${group.group}</span>
            <span class="error-group-count">${group.errors.length}</span>
          </div>
          <button class="error-group-toggle">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
        </div>
        <div class="error-group-content">
          ${group.errors.map((error) => this.generateErrorItemHTML(error)).join('')}
        </div>
      </div>
    `;
  }

  private generateErrorItemHTML(error: EnhancedValidationError): string {
    return `
      <div class="error-item" data-error-id="${error.id}">
        <div class="error-item-header">
          <div class="error-item-severity">${this.getSeverityIcon(error.severity)}</div>
          <div class="error-item-message">${error.message}</div>
          <div class="error-item-category">${error.category}</div>
        </div>

        ${
          error.affectedEntities.length > 0
            ? `
          <div class="error-item-entities">
            <strong>Affects:</strong>
            ${error.affectedEntities.map((entity) => `<span class="error-entity-tag" data-entity="${entity}">${entity}</span>`).join('')}
          </div>
        `
            : ''
        }

        ${
          error.suggestion
            ? `
          <div class="error-item-suggestion">
            <strong>Suggestion:</strong> ${error.suggestion}
          </div>
        `
            : ''
        }

        ${
          error.quickFix && this.options.enableQuickFixes
            ? `
          <div class="error-item-quickfix">
            <button class="quickfix-btn" data-error-id="${error.id}">
              ${error.quickFix.title}
            </button>
            <div class="quickfix-description">${error.quickFix.description}</div>
            ${error.quickFix.confident ? '' : '<div class="quickfix-warning">⚠️ Review suggested changes</div>'}
          </div>
        `
            : ''
        }

        ${
          error.documentation
            ? `
          <details class="error-item-details">
            <summary>More Information</summary>
            <div class="error-documentation">${error.documentation}</div>
            ${
              error.examples && error.examples.length > 0
                ? `
              <div class="error-examples">
                <strong>Examples:</strong>
                <ul>${error.examples.map((ex) => `<li>${ex}</li>`).join('')}</ul>
              </div>
            `
                : ''
            }
          </details>
        `
            : ''
        }
      </div>
    `;
  }

  private generateErrorCategoryBreakdown(stats: ReturnType<ValidationErrorProcessor['generateErrorStats']>): string {
    return `
      <div class="error-category-breakdown">
        <h4>Issues by Category</h4>
        <div class="error-categories">
          ${Object.entries(stats.byCategory)
            .map(
              ([category, count]) => `
            <div class="error-category-item">
              <span class="error-category-name">${category}</span>
              <span class="error-category-count">${count}</span>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `;
  }

  private generateErrorTooltip(errors: EnhancedValidationError[]): string {
    return errors.map((error) => `${this.getSeverityIcon(error.severity)} ${error.message}`).join('\n');
  }

  private getSeverityIcon(severity: ErrorSeverity): string {
    const icons = {
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      success: '✅',
    };
    return icons[severity] || '❓';
  }

  private getSeverityOrder(severity: ErrorSeverity): number {
    const order = { error: 3, warning: 2, info: 1, success: 0 };
    return order[severity] || 0;
  }

  private attachEventListeners(): void {
    // Group toggle functionality
    this.container.querySelectorAll('.error-group-toggle').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const group = (e.target as HTMLElement).closest('.error-group');
        group?.classList.toggle('collapsed');
      });
    });

    // Entity highlighting on hover
    this.container.querySelectorAll('.error-entity-tag').forEach((tag) => {
      tag.addEventListener('mouseenter', (e) => {
        const entityName = (e.target as HTMLElement).dataset['entity'];
        if (entityName) {
          document.dispatchEvent(new CustomEvent('highlightEntity', { detail: entityName }));
        }
      });

      tag.addEventListener('mouseleave', () => {
        document.dispatchEvent(new CustomEvent('clearEntityHighlight'));
      });
    });

    // Quick fix buttons
    this.container.querySelectorAll('.quickfix-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const errorId = (e.target as HTMLElement).dataset['errorId'];
        if (errorId) {
          document.dispatchEvent(new CustomEvent('applyQuickFix', { detail: errorId }));
        }
      });
    });
  }
}
