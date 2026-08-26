/**
 * Extensible Plugin Architecture for TypedMind Renderer
 * Provides comprehensive plugin system with custom entity renderers and layout algorithms
 * Author: Enhanced by Claude Code in Matt Pocock style
 */

import type { AnyEntity, EntityType } from '@sammons/typed-mind';
import type * as d3 from 'd3';

/**
 * Core plugin interface - all plugins must implement this
 */
export interface Plugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly dependencies?: string[];
  readonly type: 'renderer' | 'layout' | 'interaction' | 'data-processor' | 'theme' | 'export';

  /**
   * Initialize the plugin
   */
  initialize(context: PluginContext): Promise<void> | void;

  /**
   * Cleanup when plugin is disabled
   */
  cleanup?(): Promise<void> | void;

  /**
   * Plugin configuration schema
   */
  configSchema?: PluginConfigSchema;
}

/**
 * Plugin context provides access to renderer APIs
 */
export interface PluginContext {
  readonly rendererId: string;
  readonly apis: {
    dom: DOMApi;
    d3: D3Api;
    events: EventApi;
    storage: StorageApi;
    theme: ThemeApi;
    metrics: MetricsApi;
  };
  readonly config: Record<string, any>;
}

/**
 * Entity renderer plugin for custom visualization of specific entity types
 */
export interface EntityRendererPlugin extends Plugin {
  readonly type: 'renderer';
  readonly supportedEntityTypes: EntityType[];

  /**
   * Render entity in SVG
   */
  renderEntity(entity: AnyEntity, group: d3.Selection<SVGGElement, any, any, any>, context: EntityRenderContext): EntityRenderResult;

  /**
   * Update entity visual state
   */
  updateEntity?(entity: AnyEntity, group: d3.Selection<SVGGElement, any, any, any>, context: EntityRenderContext): void;

  /**
   * Get entity bounds for layout calculations
   */
  getEntityBounds(
    entity: AnyEntity,
    context: EntityRenderContext,
  ): {
    width: number;
    height: number;
    padding?: { top: number; right: number; bottom: number; left: number };
  };

  /**
   * Handle entity interactions
   */
  handleInteraction?(event: EntityInteractionEvent, entity: AnyEntity, context: EntityRenderContext): boolean; // Return true if handled, false to continue
}

/**
 * Layout algorithm plugin for custom graph layouts
 */
export interface LayoutPlugin extends Plugin {
  readonly type: 'layout';
  readonly layoutType: string;

  /**
   * Calculate layout positions for entities
   */
  calculateLayout(entities: AnyEntity[], links: LayoutLink[], constraints: LayoutConstraints): Promise<LayoutResult> | LayoutResult;

  /**
   * Update layout incrementally (for animations)
   */
  updateLayout?(currentLayout: LayoutResult, changes: LayoutChange[]): Promise<LayoutResult> | LayoutResult;

  /**
   * Get layout-specific configuration UI
   */
  getConfigurationUI?(): HTMLElement;
}

/**
 * Interaction plugin for custom behaviors
 */
export interface InteractionPlugin extends Plugin {
  readonly type: 'interaction';
  readonly interactionTypes: string[];

  /**
   * Handle custom interactions
   */
  handleInteraction(event: InteractionEvent, context: InteractionContext): boolean | Promise<boolean>;

  /**
   * Register custom keyboard shortcuts
   */
  getKeyboardShortcuts?(): KeyboardShortcut[];

  /**
   * Register custom context menu items
   */
  getContextMenuItems?(context: ContextMenuContext): ContextMenuItem[];
}

/**
 * Data processor plugin for custom analysis
 */
export interface DataProcessorPlugin extends Plugin {
  readonly type: 'data-processor';

  /**
   * Process graph data for analysis
   */
  processData(entities: AnyEntity[], context: DataProcessorContext): Promise<ProcessorResult> | ProcessorResult;

  /**
   * Get analysis results display
   */
  renderResults?(results: ProcessorResult): HTMLElement;
}

/**
 * Theme plugin for custom visual themes
 */
export interface ThemePlugin extends Plugin {
  readonly type: 'theme';
  readonly themeName: string;

  /**
   * Get theme CSS variables and styles
   */
  getThemeDefinition(): ThemeDefinition;

  /**
   * Apply theme to DOM
   */
  applyTheme(container: HTMLElement): void;

  /**
   * Cleanup theme application
   */
  removeTheme?(container: HTMLElement): void;
}

/**
 * Export plugin for custom export formats
 */
export interface ExportPlugin extends Plugin {
  readonly type: 'export';
  readonly exportFormat: string;
  readonly fileExtension: string;
  readonly mimeType: string;

  /**
   * Export visualization data
   */
  export(context: ExportContext): Promise<ExportResult> | ExportResult;

  /**
   * Get export options UI
   */
  getExportOptionsUI?(): HTMLElement;
}

// Supporting interfaces and types

export interface EntityRenderContext {
  scale: number;
  viewport: { x: number; y: number; width: number; height: number };
  selected: boolean;
  highlighted: boolean;
  theme: Record<string, any>;
  lodLevel: number;
}

export interface EntityRenderResult {
  width: number;
  height: number;
  anchorPoints?: { x: number; y: number; type: string }[];
  customData?: Record<string, any>;
}

export interface EntityInteractionEvent {
  type: 'click' | 'hover' | 'focus' | 'context' | 'drag';
  originalEvent: Event;
  entityId: string;
  position: { x: number; y: number };
}

export interface LayoutLink {
  source: string;
  target: string;
  type: string;
  weight?: number;
  metadata?: Record<string, any>;
}

export interface LayoutConstraints {
  width: number;
  height: number;
  padding: number;
  entitySpacing: number;
  levelSpacing?: number;
  groupSpacing?: number;
  preserveAspectRatio?: boolean;
  animations?: {
    enabled: boolean;
    duration: number;
    easing: string;
  };
}

export interface LayoutResult {
  positions: Map<string, { x: number; y: number }>;
  bounds: { width: number; height: number };
  metadata?: {
    levels?: number;
    groups?: Array<{ entities: string[]; bounds: { x: number; y: number; width: number; height: number } }>;
    recommendations?: string[];
  };
}

export interface LayoutChange {
  type: 'add' | 'remove' | 'update';
  entityId: string;
  data?: any;
}

export interface InteractionEvent {
  type: string;
  data: any;
  preventDefault: () => void;
  stopPropagation: () => void;
}

export interface InteractionContext {
  selectedEntities: Set<string>;
  focusedEntity: string | null;
  viewport: { x: number; y: number; width: number; height: number; scale: number };
  svg: SVGSVGElement;
}

export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  description: string;
  action: () => void;
  condition?: () => boolean;
}

export interface ContextMenuContext {
  entityId?: string;
  position: { x: number; y: number };
  selectedEntities: Set<string>;
}

export interface ContextMenuItem {
  label: string;
  icon?: string;
  action: () => void;
  separator?: boolean;
  disabled?: boolean;
  submenu?: ContextMenuItem[];
}

export interface DataProcessorContext {
  viewport: { x: number; y: number; width: number; height: number };
  selectedEntities: Set<string>;
  filterState: Record<string, boolean>;
}

export interface ProcessorResult {
  type: string;
  data: any;
  visualizations?: Array<{
    type: 'chart' | 'table' | 'metric' | 'graph';
    data: any;
    title: string;
  }>;
  recommendations?: string[];
}

export interface ThemeDefinition {
  name: string;
  cssVariables: Record<string, string>;
  customCSS?: string;
  entityStyles?: Record<
    EntityType,
    {
      fill: string;
      stroke: string;
      strokeWidth?: number;
      [key: string]: any;
    }
  >;
  linkStyles?: Record<
    string,
    {
      stroke: string;
      strokeWidth?: number;
      strokeDasharray?: string;
      [key: string]: any;
    }
  >;
}

export interface ExportContext {
  svg: SVGSVGElement;
  entities: AnyEntity[];
  selectedEntities: Set<string>;
  viewport: { x: number; y: number; width: number; height: number; scale: number };
  theme: ThemeDefinition;
  options: Record<string, any>;
}

export interface ExportResult {
  data: Blob | string | ArrayBuffer;
  filename: string;
  metadata?: Record<string, any>;
}

export interface PluginConfigSchema {
  type: 'object';
  properties: Record<
    string,
    {
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      description: string;
      default?: any;
      enum?: any[];
      minimum?: number;
      maximum?: number;
      items?: any;
    }
  >;
  required?: string[];
}

// API interfaces for plugin context

export interface DOMApi {
  createElement<T extends keyof HTMLElementTagNameMap>(tagName: T): HTMLElementTagNameMap[T];
  querySelector<T extends Element = Element>(selectors: string): T | null;
  querySelectorAll<T extends Element = Element>(selectors: string): NodeListOf<T>;
  appendChild(parent: Element, child: Element): void;
  removeChild(parent: Element, child: Element): void;
}

export interface D3Api {
  select: typeof d3.select;
  selectAll: typeof d3.selectAll;
  scaleOrdinal: typeof d3.scaleOrdinal;
  scaleLinear: typeof d3.scaleLinear;
  interpolate: typeof d3.interpolate;
  transition: typeof d3.transition;
}

export interface EventApi {
  on(event: string, handler: (...args: any[]) => void): void;
  off(event: string, handler?: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  once(event: string, handler: (...args: any[]) => void): void;
}

export interface StorageApi {
  get<T = any>(key: string): T | null;
  set<T = any>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
  keys(): string[];
}

export interface ThemeApi {
  getCurrentTheme(): ThemeDefinition;
  setTheme(theme: ThemeDefinition): void;
  getEntityStyle(entityType: EntityType): Record<string, any>;
  getLinkStyle(linkType: string): Record<string, any>;
}

export interface MetricsApi {
  recordMetric(name: string, value: number, tags?: Record<string, string>): void;
  getMetric(name: string): number | null;
  getAllMetrics(): Record<string, number>;
}

/**
 * Plugin manager for loading, managing, and coordinating plugins
 */
export class PluginManager {
  private plugins = new Map<string, Plugin>();
  private activePlugins = new Set<string>();
  private pluginContexts = new Map<string, PluginContext>();
  private dependencyGraph = new Map<string, Set<string>>();

  constructor(private baseContext: Omit<PluginContext, 'config'>) {}

  /**
   * Register a plugin
   */
  async registerPlugin(plugin: Plugin, config: Record<string, any> = {}): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} is already registered`);
    }

    // Validate plugin
    this.validatePlugin(plugin);

    // Check dependencies
    if (plugin.dependencies) {
      for (const depId of plugin.dependencies) {
        if (!this.plugins.has(depId)) {
          throw new Error(`Plugin ${plugin.id} depends on ${depId}, which is not registered`);
        }
      }
    }

    this.plugins.set(plugin.id, plugin);

    // Update dependency graph
    this.dependencyGraph.set(plugin.id, new Set(plugin.dependencies || []));

    // Create plugin context
    const pluginContext: PluginContext = {
      ...this.baseContext,
      config,
    };

    this.pluginContexts.set(plugin.id, pluginContext);

    // Initialize if no dependencies or all dependencies are active
    if (this.canActivatePlugin(plugin.id)) {
      await this.activatePlugin(plugin.id);
    }
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return;
    }

    // Deactivate first
    if (this.activePlugins.has(pluginId)) {
      await this.deactivatePlugin(pluginId);
    }

    // Remove from registry
    this.plugins.delete(pluginId);
    this.pluginContexts.delete(pluginId);
    this.dependencyGraph.delete(pluginId);

    // Remove from other plugins' dependencies
    for (const [_id, deps] of this.dependencyGraph.entries()) {
      deps.delete(pluginId);
    }
  }

  /**
   * Activate a plugin
   */
  async activatePlugin(pluginId: string): Promise<void> {
    if (this.activePlugins.has(pluginId)) {
      return;
    }

    if (!this.canActivatePlugin(pluginId)) {
      throw new Error(`Cannot activate plugin ${pluginId}: dependencies not met`);
    }

    const plugin = this.plugins.get(pluginId)!;
    const context = this.pluginContexts.get(pluginId)!;

    await plugin.initialize(context);
    this.activePlugins.add(pluginId);

    // Activate dependent plugins
    for (const [id, deps] of this.dependencyGraph.entries()) {
      if (deps.has(pluginId) && this.canActivatePlugin(id)) {
        await this.activatePlugin(id);
      }
    }
  }

  /**
   * Deactivate a plugin
   */
  async deactivatePlugin(pluginId: string): Promise<void> {
    if (!this.activePlugins.has(pluginId)) {
      return;
    }

    // Deactivate dependent plugins first
    for (const [id, deps] of this.dependencyGraph.entries()) {
      if (deps.has(pluginId) && this.activePlugins.has(id)) {
        await this.deactivatePlugin(id);
      }
    }

    const plugin = this.plugins.get(pluginId)!;
    if (plugin.cleanup) {
      await plugin.cleanup();
    }

    this.activePlugins.delete(pluginId);
  }

  /**
   * Get active plugins by type
   */
  getActivePlugins<T extends Plugin>(type?: Plugin['type']): T[] {
    const result: T[] = [];

    for (const pluginId of this.activePlugins) {
      const plugin = this.plugins.get(pluginId)!;
      if (!type || plugin.type === type) {
        result.push(plugin as T);
      }
    }

    return result;
  }

  /**
   * Get plugin by ID
   */
  getPlugin<T extends Plugin>(pluginId: string): T | null {
    return (this.plugins.get(pluginId) as T) || null;
  }

  /**
   * Check if plugin is active
   */
  isPluginActive(pluginId: string): boolean {
    return this.activePlugins.has(pluginId);
  }

  /**
   * Update plugin configuration
   */
  updatePluginConfig(pluginId: string, config: Record<string, any>): void {
    const context = this.pluginContexts.get(pluginId);
    if (context) {
      Object.assign(context.config, config);
    }
  }

  /**
   * Get all registered plugins with their status
   */
  getAllPlugins(): Array<{
    plugin: Plugin;
    active: boolean;
    canActivate: boolean;
    dependencies: string[];
  }> {
    return Array.from(this.plugins.values()).map((plugin) => ({
      plugin,
      active: this.activePlugins.has(plugin.id),
      canActivate: this.canActivatePlugin(plugin.id),
      dependencies: plugin.dependencies || [],
    }));
  }

  private validatePlugin(plugin: Plugin): void {
    if (!plugin.id || !plugin.name || !plugin.version || !plugin.type) {
      throw new Error('Plugin must have id, name, version, and type properties');
    }

    if (typeof plugin.initialize !== 'function') {
      throw new Error('Plugin must implement initialize method');
    }
  }

  private canActivatePlugin(pluginId: string): boolean {
    const deps = this.dependencyGraph.get(pluginId);
    if (!deps) return false;

    for (const depId of deps) {
      if (!this.activePlugins.has(depId)) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Built-in plugin registry for common functionality
 */
export class BuiltInPluginRegistry {
  /**
   * Create a simple entity renderer plugin
   */
  static createEntityRenderer(
    id: string,
    name: string,
    entityTypes: EntityType[],
    renderer: EntityRendererPlugin['renderEntity'],
  ): EntityRendererPlugin {
    return {
      id,
      name,
      version: '1.0.0',
      description: `Custom renderer for ${entityTypes.join(', ')}`,
      author: 'User',
      type: 'renderer',
      supportedEntityTypes: entityTypes,
      initialize: async () => {},
      renderEntity: renderer,
      getEntityBounds: (_entity) => ({ width: 100, height: 50 }), // Default bounds
    };
  }

  /**
   * Create a simple layout plugin
   */
  static createLayoutPlugin(id: string, name: string, layoutType: string, algorithm: LayoutPlugin['calculateLayout']): LayoutPlugin {
    return {
      id,
      name,
      version: '1.0.0',
      description: `${layoutType} layout algorithm`,
      author: 'User',
      type: 'layout',
      layoutType,
      initialize: async () => {},
      calculateLayout: algorithm,
    };
  }

  /**
   * Create a simple theme plugin
   */
  static createThemePlugin(id: string, name: string, themeName: string, definition: ThemeDefinition): ThemePlugin {
    return {
      id,
      name,
      version: '1.0.0',
      description: `${themeName} theme`,
      author: 'User',
      type: 'theme',
      themeName,
      initialize: async () => {},
      getThemeDefinition: () => definition,
      applyTheme: (container) => {
        for (const [property, value] of Object.entries(definition.cssVariables)) {
          container.style.setProperty(property, value);
        }
      },
    };
  }
}
