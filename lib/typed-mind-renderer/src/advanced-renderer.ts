/**
 * Advanced TypedMind Renderer - Enterprise-Grade Visualization Platform
 * Integrates all advanced capabilities into a comprehensive renderer system
 * Author: Enhanced by Claude Code in Matt Pocock style
 */

import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import type { ProgramGraph, ValidationResult } from '@sammons/typed-mind';
import { type CodeGenConfig, CodeGenerationEngine, type CodePreview } from './codegen/code-generation.ts';
import { type ArchitectureDiff, ArchitectureDiffAnalyzer, type DiffOptions } from './diff/diff-visualization.ts';
import { GraphMetricsAnalyzer, type HealthScore, type MetricCategory } from './metrics/graph-metrics.ts';
import { type ArchitecturalPattern, PatternRecognitionEngine, type PatternVisualization } from './patterns/pattern-recognition.ts';
// Import all the advanced systems
import {
  LevelOfDetailManager,
  PerformanceMonitor,
  type SpatialItem,
  type ViewportInfo,
  VirtualizationManager,
} from './performance/spatial-index.ts';
import { type Plugin, type PluginContext, PluginManager } from './plugins/plugin-system.ts';
import { type EnhancedValidationError, ErrorVisualizationRenderer, ValidationErrorProcessor } from './validation/error-visualization.ts';

/**
 * Advanced renderer configuration
 */
interface AdvancedRendererOptions {
  // Basic options
  port?: number;
  host?: string;
  openBrowser?: boolean;

  // Performance options
  enableVirtualization?: boolean;
  maxRenderItems?: number;
  enableSpatialIndexing?: boolean;
  performanceMonitoring?: boolean;

  // Feature toggles
  enableErrorVisualization?: boolean;
  enablePluginSystem?: boolean;
  enableMetricsDashboard?: boolean;
  enablePatternRecognition?: boolean;
  enableDiffMode?: boolean;
  enableCodeGeneration?: boolean;

  // Visualization options
  enableDeepLinking?: boolean;
  enablePrintMode?: boolean;
  enableThemeSystem?: boolean;
  enableTelemetry?: boolean;

  // Advanced features
  enableProgressiveEnhancement?: boolean;
  enableClientSideCaching?: boolean;
  enableComprehensiveErrorHandling?: boolean;

  // Customization
  customPlugins?: Plugin[];
  themePreference?: 'dark' | 'light' | 'auto' | 'high-contrast' | 'colorblind-friendly';
  defaultCodeGenLanguage?: 'typescript' | 'javascript' | 'python' | 'java';
}

/**
 * Renderer state for advanced features
 */
interface AdvancedRendererState {
  // Core data
  programGraph: ProgramGraph | null;
  validationResult: ValidationResult | null;

  // Performance state
  viewport: ViewportInfo;
  visibleItems: SpatialItem[];
  lodLevel: number;

  // Analysis results
  healthScore: HealthScore | null;
  detectedPatterns: ArchitecturalPattern[];
  architectureDiff: ArchitectureDiff | null;

  // UI state
  selectedEntities: Set<string>;
  focusedEntity: string | null;
  activePattern: string | null;
  showErrorPanel: boolean;
  showMetricsPanel: boolean;
  showCodeGenPanel: boolean;

  // Feature states
  pluginsLoaded: boolean;
  telemetryEnabled: boolean;
  printModeActive: boolean;
}

/**
 * Advanced event system for complex interactions
 */
interface AdvancedRendererEvents {
  // Core events
  'graph-loaded': { graph: ProgramGraph };
  'validation-complete': { result: ValidationResult; errors: EnhancedValidationError[] };

  // Performance events
  'viewport-changed': { viewport: ViewportInfo };
  'performance-update': { metrics: Record<string, any> };

  // Analysis events
  'health-score-calculated': { score: HealthScore };
  'patterns-detected': { patterns: ArchitecturalPattern[] };
  'diff-completed': { diff: ArchitectureDiff };

  // Interaction events
  'entity-selected': { entityId: string; multiSelect: boolean };
  'entity-focused': { entityId: string };
  'pattern-highlighted': { patternId: string };

  // Feature events
  'plugin-loaded': { plugin: Plugin };
  'code-generated': { entityId: string; preview: CodePreview };
  'export-requested': { format: 'svg' | 'png' | 'pdf' | 'json' };
}

/**
 * Main advanced renderer class
 */
class AdvancedTypedMindRenderer {
  private options: Required<AdvancedRendererOptions>;
  private state: AdvancedRendererState;
  private eventListeners = new Map<keyof AdvancedRendererEvents, Array<(data: any) => void>>();

  // Advanced system instances
  private virtualizationManager: VirtualizationManager | null = null;
  private performanceMonitor: PerformanceMonitor;
  private lodManager: LevelOfDetailManager;
  private errorProcessor: ValidationErrorProcessor;
  private pluginManager: PluginManager;
  private metricsAnalyzer: GraphMetricsAnalyzer | null = null;
  private patternEngine: PatternRecognitionEngine;
  private diffAnalyzer: ArchitectureDiffAnalyzer;
  private codeGenerator: CodeGenerationEngine;

  constructor(options: Partial<AdvancedRendererOptions> = {}) {
    this.options = this.mergeWithDefaults(options);
    this.state = this.initializeState();

    // Initialize advanced systems
    this.performanceMonitor = new PerformanceMonitor();
    this.lodManager = new LevelOfDetailManager();
    this.errorProcessor = new ValidationErrorProcessor();
    this.patternEngine = new PatternRecognitionEngine();
    this.diffAnalyzer = new ArchitectureDiffAnalyzer();
    this.codeGenerator = new CodeGenerationEngine();

    // Initialize plugin system
    this.pluginManager = new PluginManager(this.createPluginContext());
    this.loadCustomPlugins();
  }

  /**
   * Set program graph and trigger analysis
   */
  async setProgramGraph(graph: ProgramGraph): Promise<void> {
    const startTime = performance.now();

    this.state.programGraph = graph;

    // Initialize spatial indexing for large graphs
    if (this.options.enableVirtualization) {
      await this.initializeVirtualization(graph);
    }

    // Run metrics analysis
    if (this.options.enableMetricsDashboard) {
      this.metricsAnalyzer = new GraphMetricsAnalyzer(graph);
      const analysis = this.metricsAnalyzer.analyzeGraph();
      this.state.healthScore = analysis.healthScore;
      this.emit('health-score-calculated', { score: analysis.healthScore });
    }

    // Run pattern recognition
    if (this.options.enablePatternRecognition) {
      const patternAnalysis = this.patternEngine.analyzePatterns(graph);
      this.state.detectedPatterns = patternAnalysis.patterns;
      this.emit('patterns-detected', { patterns: patternAnalysis.patterns });
    }

    const loadTime = performance.now() - startTime;
    this.performanceMonitor.recordMetric('graph-load-time', loadTime);

    this.emit('graph-loaded', { graph });
  }

  /**
   * Set validation result and process errors
   */
  async setValidationResult(result: ValidationResult): Promise<void> {
    this.state.validationResult = result;

    if (this.options.enableErrorVisualization && result.errors.length > 0) {
      const enhancedErrors = this.errorProcessor.processErrors(result);
      this.state.showErrorPanel = true;
      this.emit('validation-complete', { result, errors: enhancedErrors });
    }
  }

  /**
   * Compare two architectures (diff mode)
   */
  async compareArchitectures(oldGraph: ProgramGraph, newGraph: ProgramGraph, options?: DiffOptions): Promise<ArchitectureDiff> {
    if (!this.options.enableDiffMode) {
      throw new Error('Diff mode is not enabled');
    }

    const diff = await this.diffAnalyzer.compareArchitectures(oldGraph, newGraph, options);
    this.state.architectureDiff = diff;
    this.emit('diff-completed', { diff });

    return diff;
  }

  /**
   * Generate code preview for entity
   */
  async generateCodePreview(entityId: string, config: Partial<CodeGenConfig> = {}): Promise<CodePreview> {
    if (!this.options.enableCodeGeneration) {
      throw new Error('Code generation is not enabled');
    }

    const entity = this.state.programGraph?.entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity not found: ${entityId}`);
    }

    const preview = await this.codeGenerator.previewCode(entity, config);
    this.emit('code-generated', { entityId, preview });

    return preview;
  }

  /**
   * Start the advanced renderer server
   */
  async serve(): Promise<void> {
    const server = createServer(async (req, res) => {
      const url = req.url || '/';

      try {
        if (url === '/') {
          await this.handleMainPage(req, res);
        } else if (url.startsWith('/api/')) {
          await this.handleApiRequest(req, res, url);
        } else if (url.startsWith('/static/')) {
          await this.handleStaticAssets(req, res, url);
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
        }
      } catch (error) {
        console.error('Request handling error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
          }),
        );
      }
    });

    const { port, host } = this.options;
    server.listen(port, host, () => {
      console.log(`🚀 Advanced TypedMind Renderer running at http://${host}:${port}`);
      console.log(`📊 Features enabled: ${this.getEnabledFeatures().join(', ')}`);

      if (this.options.openBrowser) {
        this.openInBrowser(`http://${host}:${port}`);
      }
    });
  }

  /**
   * Event system
   */
  on<K extends keyof AdvancedRendererEvents>(event: K, listener: (data: AdvancedRendererEvents[K]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(listener);
  }

  off<K extends keyof AdvancedRendererEvents>(event: K, listener?: (data: AdvancedRendererEvents[K]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners) return;

    if (listener) {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    } else {
      listeners.length = 0;
    }
  }

  private emit<K extends keyof AdvancedRendererEvents>(event: K, data: AdvancedRendererEvents[K]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      }
    }
  }

  /**
   * Generate comprehensive static HTML output
   */
  generateStaticHTML(): string {
    const html = this.getAdvancedHTML();
    const scriptContent = this.generateAdvancedRendererJS();

    return html.replace('<script src="advanced-renderer.js"></script>', `<script>${scriptContent}</script>`);
  }

  // Private implementation methods

  private mergeWithDefaults(options: Partial<AdvancedRendererOptions>): Required<AdvancedRendererOptions> {
    return {
      port: 3000,
      host: 'localhost',
      openBrowser: true,
      enableVirtualization: true,
      maxRenderItems: 1000,
      enableSpatialIndexing: true,
      performanceMonitoring: true,
      enableErrorVisualization: true,
      enablePluginSystem: true,
      enableMetricsDashboard: true,
      enablePatternRecognition: true,
      enableDiffMode: true,
      enableCodeGeneration: true,
      enableDeepLinking: true,
      enablePrintMode: true,
      enableThemeSystem: true,
      enableTelemetry: false, // Privacy-first default
      enableProgressiveEnhancement: true,
      enableClientSideCaching: true,
      enableComprehensiveErrorHandling: true,
      customPlugins: [],
      themePreference: 'auto',
      defaultCodeGenLanguage: 'typescript',
      ...options,
    };
  }

  private initializeState(): AdvancedRendererState {
    return {
      programGraph: null,
      validationResult: null,
      viewport: { x: 0, y: 0, width: 1200, height: 800, scale: 1 },
      visibleItems: [],
      lodLevel: 0,
      healthScore: null,
      detectedPatterns: [],
      architectureDiff: null,
      selectedEntities: new Set(),
      focusedEntity: null,
      activePattern: null,
      showErrorPanel: false,
      showMetricsPanel: false,
      showCodeGenPanel: false,
      pluginsLoaded: false,
      telemetryEnabled: this.options.enableTelemetry,
      printModeActive: false,
    };
  }

  private async initializeVirtualization(graph: ProgramGraph): Promise<void> {
    const entities = Array.from(graph.entities.values());

    // Calculate graph bounds
    const bounds = this.calculateGraphBounds(entities);
    this.virtualizationManager = new VirtualizationManager(bounds);

    // Create spatial items
    const spatialItems: SpatialItem[] = entities.map((entity) => ({
      id: entity.name,
      bounds: {
        x: Math.random() * bounds.width,
        y: Math.random() * bounds.height,
        width: 100, // Default entity width
        height: 50, // Default entity height
      },
      data: entity,
    }));

    this.virtualizationManager.updateIndex(spatialItems);
  }

  private calculateGraphBounds(entities: any[]): { x: number; y: number; width: number; height: number } {
    const nodeCount = entities.length;
    const estimatedArea = nodeCount * 15000; // Rough estimate
    const aspectRatio = 16 / 9;

    const width = Math.sqrt(estimatedArea * aspectRatio);
    const height = width / aspectRatio;

    return { x: 0, y: 0, width, height };
  }

  private createPluginContext(): Omit<PluginContext, 'config'> {
    return {
      rendererId: 'advanced-typed-mind-renderer',
      apis: {
        dom: {
          createElement: <T extends keyof HTMLElementTagNameMap>(tagName: T) => {
            // Server-side fallback
            if (typeof document === 'undefined') return {} as HTMLElementTagNameMap[T];
            return document.createElement(tagName);
          },
          querySelector: <T extends Element = Element>(selector: string) => {
            if (typeof document === 'undefined') return null;
            return document.querySelector<T>(selector);
          },
          querySelectorAll: <T extends Element = Element>(selector: string) => {
            if (typeof document === 'undefined') return [] as any;
            return document.querySelectorAll<T>(selector);
          },
          appendChild: (parent: Element, child: Element) => {
            if (parent && child && parent.appendChild) parent.appendChild(child);
          },
          removeChild: (parent: Element, child: Element) => {
            if (parent && child && parent.removeChild) parent.removeChild(child);
          },
        },
        d3: {
          select: (selector: any) => {
            // Server-side fallback - return minimal d3 Selection-like object
            if (typeof window === 'undefined') return { attr: () => ({}), selectAll: () => ({ data: () => ({}) }) };
            return (globalThis as any).d3?.select?.(selector) || {};
          },
          selectAll: (_selector: any) => ({ data: () => ({}) }) as any,
          scaleOrdinal: () => ({ range: () => ({}), domain: () => ({}) }) as any,
          scaleLinear: () => ({ range: () => ({}), domain: () => ({}) }) as any,
          interpolate: (a: any, _b: any) => () => a,
          transition: () => ({ duration: () => ({}) }) as any,
        },
        events: {
          on: (event, handler) => this.on(event as any, handler),
          off: (event, handler) => this.off(event as any, handler),
          emit: (event, ...args) => this.emit(event as any, args[0]),
          once: (event, handler) => {
            const onceHandler = (data: any) => {
              handler(data);
              this.off(event as any, onceHandler);
            };
            this.on(event as any, onceHandler);
          },
        },
        storage: {
          get: (key: string) => {
            try {
              if (typeof localStorage === 'undefined') return null;
              const value = localStorage.getItem(key);
              return value ? JSON.parse(value) : null;
            } catch (_error) {
              return null;
            }
          },
          set: (key: string, value: any) => {
            try {
              if (typeof localStorage !== 'undefined') {
                localStorage.setItem(key, JSON.stringify(value));
              }
            } catch (error) {
              console.warn('Failed to save to localStorage:', error);
            }
          },
          remove: (key: string) => {
            if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
          },
          clear: () => {
            if (typeof localStorage !== 'undefined') localStorage.clear();
          },
          keys: () => {
            if (typeof localStorage === 'undefined') return [];
            return Object.keys(localStorage);
          },
        },
        theme: {
          getCurrentTheme: () => ({ name: 'default', cssVariables: {} }),
          setTheme: () => {},
          getEntityStyle: () => ({}),
          getLinkStyle: () => ({}),
        },
        metrics: {
          recordMetric: (name, value, _tags) => this.performanceMonitor.recordMetric(name, value),
          getMetric: (name) => this.performanceMonitor.getMetric(name)?.current || null,
          getAllMetrics: () => {
            const metrics = this.performanceMonitor.getAllMetrics();
            const result: Record<string, number> = {};
            for (const [key, value] of Object.entries(metrics)) {
              if (value) result[key] = value.current;
            }
            return result;
          },
        },
      },
    };
  }

  private async loadCustomPlugins(): Promise<void> {
    for (const plugin of this.options.customPlugins) {
      try {
        await this.pluginManager.registerPlugin(plugin);
        this.emit('plugin-loaded', { plugin });
      } catch (error) {
        console.error(`Failed to load plugin ${plugin.id}:`, error);
      }
    }
    this.state.pluginsLoaded = true;
  }

  private async handleMainPage(_req: any, res: any): Promise<void> {
    const html = this.getAdvancedHTML();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  private async handleApiRequest(_req: any, res: any, url: string): Promise<void> {
    const path = url.replace('/api/', '');

    switch (path) {
      case 'graph':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.getGraphData()));
        break;

      case 'health':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.state.healthScore));
        break;

      case 'patterns':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.state.detectedPatterns));
        break;

      case 'performance':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.performanceMonitor.getAllMetrics()));
        break;

      case 'plugins':
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.pluginManager.getAllPlugins()));
        break;

      default:
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API endpoint not found' }));
    }
  }

  private async handleStaticAssets(_req: any, res: any, url: string): Promise<void> {
    // Serve static files (CSS, JS, images)
    const filePath = url.replace('/static/', '');

    try {
      const staticPath = join(__dirname, 'static', filePath);
      const content = readFileSync(staticPath);

      const mimeTypes: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
      };

      const ext = filePath.substring(filePath.lastIndexOf('.'));
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (_error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
    }
  }

  private getAdvancedHTML(): string {
    try {
      const htmlPath = join(__dirname, 'static', 'advanced-index.html');
      return readFileSync(htmlPath, 'utf-8');
    } catch (_error) {
      return this.generateFallbackHTML();
    }
  }

  private generateFallbackHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Advanced TypedMind Renderer</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        margin: 0;
        padding: 20px;
        background: #0d1117;
        color: #c9d1d9;
      }
      .header {
        text-align: center;
        margin-bottom: 30px;
      }
      .features {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
      }
      .feature {
        background: #161b22;
        padding: 20px;
        border-radius: 8px;
        border: 1px solid #30363d;
      }
      .feature h3 {
        color: #58a6ff;
        margin-top: 0;
      }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Advanced TypedMind Renderer</h1>
        <p>Enterprise-grade architectural visualization platform</p>
        <p>Enabled features: ${this.getEnabledFeatures().join(', ')}</p>
    </div>

    <div class="features">
        ${this.generateFeatureCards().join('')}
    </div>

    <div id="visualization-container" style="margin-top: 30px; height: 600px; background: #0d1117; border: 1px solid #30363d; border-radius: 8px;">
        <p style="text-align: center; padding: 50px;">Load a TypedMind graph to see advanced visualization</p>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js" integrity="sha384-su5kReKyYlIFrI62mbQRKXHzFobMa7BHp1cK6julLPbnYcCW9NIZKJiTODjLPeDh" crossorigin="anonymous"></script>
    <script src="advanced-renderer.js"></script>
</body>
</html>
    `;
  }

  private getEnabledFeatures(): string[] {
    const features: string[] = [];

    if (this.options.enableVirtualization) features.push('Virtualization');
    if (this.options.enableErrorVisualization) features.push('Error Visualization');
    if (this.options.enablePluginSystem) features.push('Plugin System');
    if (this.options.enableMetricsDashboard) features.push('Metrics Dashboard');
    if (this.options.enablePatternRecognition) features.push('Pattern Recognition');
    if (this.options.enableDiffMode) features.push('Diff Mode');
    if (this.options.enableCodeGeneration) features.push('Code Generation');
    if (this.options.enableDeepLinking) features.push('Deep Linking');
    if (this.options.performanceMonitoring) features.push('Performance Monitoring');

    return features;
  }

  private generateFeatureCards(): string[] {
    const features = [
      {
        title: '⚡ Performance Optimization',
        description: 'Spatial indexing and virtualization for smooth rendering of 1000+ entities',
      },
      {
        title: '🔍 Error Visualization',
        description: 'Comprehensive error analysis with severity indicators and quick fixes',
      },
      {
        title: '🔌 Plugin Architecture',
        description: 'Extensible system for custom renderers and layout algorithms',
      },
      {
        title: '📊 Metrics Dashboard',
        description: 'Architecture health metrics, complexity analysis, and coupling indicators',
      },
      {
        title: '🎯 Pattern Recognition',
        description: 'Automatic detection of architectural patterns and anti-patterns',
      },
      {
        title: '🔄 Diff Visualization',
        description: 'Compare different versions of architectures with detailed change analysis',
      },
      {
        title: '💻 Code Generation',
        description: 'Preview how entities translate to actual code in multiple languages',
      },
      {
        title: '🎨 Theme System',
        description: 'Multiple visual themes including colorblind-friendly options',
      },
    ];

    return features.map(
      (feature) => `
      <div class="feature">
        <h3>${feature.title}</h3>
        <p>${feature.description}</p>
      </div>
    `,
    );
  }

  private generateAdvancedRendererJS(): string {
    return `
// Advanced TypedMind Renderer JavaScript
(function() {
  const config = ${JSON.stringify(this.options)};
  const initialState = ${JSON.stringify(this.state)};

  console.log('🚀 Advanced TypedMind Renderer initialized');
  console.log('Features:', ${JSON.stringify(this.getEnabledFeatures())});

  // Advanced renderer would be implemented here
  // This is a placeholder for the comprehensive client-side implementation

  window.advancedTypedMindRenderer = {
    config,
    state: initialState,

    // API methods
    loadGraph: (graph) => console.log('Loading graph:', graph),
    generateCode: (entityId, options) => console.log('Generating code:', entityId, options),
    compareArchitectures: (oldGraph, newGraph) => console.log('Comparing architectures'),

    // Event system
    on: (event, handler) => console.log('Event listener added:', event),
    emit: (event, data) => console.log('Event emitted:', event, data),

    // Plugin system
    registerPlugin: (plugin) => console.log('Plugin registered:', plugin),

    // Utility methods
    exportVisualization: (format) => console.log('Exporting as:', format),
    toggleTheme: (theme) => console.log('Theme changed:', theme),
    showMetrics: () => console.log('Showing metrics dashboard'),
    showPatterns: () => console.log('Showing detected patterns')
  };
})();
`;
  }

  private getGraphData(): any {
    if (!this.state.programGraph) {
      return { entities: [], links: [], errors: [] };
    }

    // This would generate the comprehensive graph data
    // including performance optimizations, error annotations, etc.
    const entities = Array.from(this.state.programGraph.entities.values());
    return {
      entities,
      links: [], // Would be populated with relationship links
      errors: this.state.validationResult?.errors || [],
      metadata: {
        healthScore: this.state.healthScore,
        patterns: this.state.detectedPatterns,
        performance: this.performanceMonitor.getAllMetrics(),
      },
    };
  }

  private openInBrowser(url: string): void {
    const { exec } = require('node:child_process');
    const platform = process.platform;

    let command: string;
    if (platform === 'darwin') {
      command = `open ${url}`;
    } else if (platform === 'win32') {
      command = `start ${url}`;
    } else {
      command = `xdg-open ${url}`;
    }

    exec(command, (error: Error | null) => {
      if (error) {
        console.error('Failed to open browser:', error);
      }
    });
  }
}

// Export types for TypeScript users
export type {
  AdvancedRendererEvents,
  AdvancedRendererOptions,
  AdvancedRendererState,
  ArchitecturalPattern,
  ArchitectureDiff,
  CodeGenConfig,
  CodePreview,
  DiffOptions,
  EnhancedValidationError,
  HealthScore,
  MetricCategory,
  PatternVisualization,
  Plugin,
  PluginContext,
  SpatialItem,
  ViewportInfo,
};
// Export the advanced renderer as the main export
// Re-export all the advanced systems for direct use
export {
  AdvancedTypedMindRenderer,
  ArchitectureDiffAnalyzer,
  CodeGenerationEngine,
  ErrorVisualizationRenderer,
  GraphMetricsAnalyzer,
  LevelOfDetailManager,
  PatternRecognitionEngine,
  PerformanceMonitor,
  PluginManager,
  ValidationErrorProcessor,
  VirtualizationManager,
};
