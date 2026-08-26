/**
 * TypedMind Renderer - Main Entry Point
 * Exports both the original renderer and the new advanced renderer
 */

// Export advanced renderer as the main export
export { AdvancedTypedMindRenderer } from './advanced-renderer.ts';
export {
  type CodeGenConfig,
  CodeGenerationEngine,
  type CodePreview,
  type GeneratedCode,
  type TargetFramework,
  type TargetLanguage,
} from './codegen/code-generation.ts';
export {
  type ArchitectureDiff,
  ArchitectureDiffAnalyzer,
  type DiffChangeType,
  type DiffOptions,
  type DiffSummary,
  type EntityDiff,
} from './diff/diff-visualization.ts';
// Re-export enhanced renderer options for convenience
export type { EnhancedRendererOptions } from './enhanced-index.ts';
// Export original renderer for backward compatibility
export { EnhancedTypedMindRenderer as TypedMindRenderer } from './enhanced-index.ts';

export {
  GraphMetricsAnalyzer,
  type HealthScore,
  type Metric,
  type MetricCategory,
  type Recommendation,
  type Risk,
} from './metrics/graph-metrics.ts';

export {
  type ArchitecturalPattern,
  type PatternMatcher,
  PatternRecognitionEngine,
  type PatternRecommendation,
  type PatternVisualization,
} from './patterns/pattern-recognition.ts';
// Export all advanced system components for granular usage
export {
  LevelOfDetailManager,
  PerformanceMonitor,
  type SpatialItem,
  type ViewportInfo,
  VirtualizationManager,
} from './performance/spatial-index.ts';
export {
  BuiltInPluginRegistry,
  type DataProcessorPlugin,
  type EntityRendererPlugin,
  type ExportPlugin,
  type InteractionPlugin,
  type LayoutPlugin,
  type Plugin,
  type PluginContext,
  PluginManager,
  type ThemePlugin,
} from './plugins/plugin-system.ts';
export {
  type EnhancedValidationError,
  type ErrorSeverity,
  ErrorVisualizationRenderer,
  ValidationErrorProcessor,
} from './validation/error-visualization.ts';

// Type-only exports for advanced configuration
export type AdvancedRendererOptions = {
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
};

// Default export is the advanced renderer
export { AdvancedTypedMindRenderer as default } from './advanced-renderer.ts';
