/**
 * Spatial Indexing System for High-Performance Graph Visualization
 * Implements quadtree-based spatial partitioning for efficient rendering of large graphs
 * Author: Enhanced by Claude Code in Matt Pocock style
 */

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpatialItem {
  id: string;
  bounds: BoundingBox;
  data: unknown;
}

export interface ViewportInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

/**
 * Quadtree implementation for spatial indexing
 * Provides O(log n) lookup for viewport-based queries
 */
export class QuadTree {
  private maxItems = 10;
  private maxDepth = 8;
  private bounds: BoundingBox;
  private items: SpatialItem[] = [];
  private nodes: QuadTree[] = [];
  private level = 0;

  constructor(bounds: BoundingBox, level = 0) {
    this.bounds = bounds;
    this.level = level;
  }

  /**
   * Insert an item into the quadtree
   */
  insert(item: SpatialItem): void {
    if (this.nodes.length > 0) {
      const index = this.getIndex(item.bounds);
      if (index !== -1) {
        this.nodes[index].insert(item);
        return;
      }
    }

    this.items.push(item);

    if (this.items.length > this.maxItems && this.level < this.maxDepth) {
      if (this.nodes.length === 0) {
        this.split();
      }

      let i = 0;
      while (i < this.items.length) {
        const index = this.getIndex(this.items[i].bounds);
        if (index !== -1) {
          const item = this.items.splice(i, 1)[0];
          this.nodes[index].insert(item);
        } else {
          i++;
        }
      }
    }
  }

  /**
   * Query items within a bounding box
   */
  query(bounds: BoundingBox): SpatialItem[] {
    const result: SpatialItem[] = [];

    if (!this.intersects(bounds, this.bounds)) {
      return result;
    }

    for (const item of this.items) {
      if (this.intersects(bounds, item.bounds)) {
        result.push(item);
      }
    }

    if (this.nodes.length > 0) {
      for (const node of this.nodes) {
        result.push(...node.query(bounds));
      }
    }

    return result;
  }

  /**
   * Query items within viewport with distance-based culling
   */
  queryViewport(viewport: ViewportInfo): SpatialItem[] {
    const bounds: BoundingBox = {
      x: viewport.x,
      y: viewport.y,
      width: viewport.width,
      height: viewport.height,
    };

    const items = this.query(bounds);

    // Additional culling based on scale and item size
    return items.filter((item) => {
      const minSize = Math.min(item.bounds.width, item.bounds.height) * viewport.scale;
      return minSize > 1; // Don't render items smaller than 1 pixel
    });
  }

  /**
   * Clear the quadtree
   */
  clear(): void {
    this.items = [];
    this.nodes = [];
  }

  /**
   * Get statistics about the quadtree
   */
  getStats(): {
    totalItems: number;
    maxDepth: number;
    totalNodes: number;
  } {
    const stats = {
      totalItems: this.items.length,
      maxDepth: this.level,
      totalNodes: 1,
    };

    for (const node of this.nodes) {
      const nodeStats = node.getStats();
      stats.totalItems += nodeStats.totalItems;
      stats.maxDepth = Math.max(stats.maxDepth, nodeStats.maxDepth);
      stats.totalNodes += nodeStats.totalNodes;
    }

    return stats;
  }

  private split(): void {
    const subWidth = this.bounds.width / 2;
    const subHeight = this.bounds.height / 2;
    const x = this.bounds.x;
    const y = this.bounds.y;

    this.nodes[0] = new QuadTree(
      {
        x: x + subWidth,
        y: y,
        width: subWidth,
        height: subHeight,
      },
      this.level + 1,
    );

    this.nodes[1] = new QuadTree(
      {
        x: x,
        y: y,
        width: subWidth,
        height: subHeight,
      },
      this.level + 1,
    );

    this.nodes[2] = new QuadTree(
      {
        x: x,
        y: y + subHeight,
        width: subWidth,
        height: subHeight,
      },
      this.level + 1,
    );

    this.nodes[3] = new QuadTree(
      {
        x: x + subWidth,
        y: y + subHeight,
        width: subWidth,
        height: subHeight,
      },
      this.level + 1,
    );
  }

  private getIndex(bounds: BoundingBox): number {
    const verticalMidpoint = this.bounds.x + this.bounds.width / 2;
    const horizontalMidpoint = this.bounds.y + this.bounds.height / 2;

    const topQuadrant = bounds.y < horizontalMidpoint && bounds.y + bounds.height < horizontalMidpoint;
    const bottomQuadrant = bounds.y > horizontalMidpoint;

    if (bounds.x < verticalMidpoint && bounds.x + bounds.width < verticalMidpoint) {
      if (topQuadrant) return 1;
      if (bottomQuadrant) return 2;
    } else if (bounds.x > verticalMidpoint) {
      if (topQuadrant) return 0;
      if (bottomQuadrant) return 3;
    }

    return -1;
  }

  private intersects(a: BoundingBox, b: BoundingBox): boolean {
    return !(a.x > b.x + b.width || a.x + a.width < b.x || a.y > b.y + b.height || a.y + a.height < b.y);
  }
}

/**
 * Performance monitor for tracking render metrics
 */
export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  private maxSamples = 100;

  recordMetric(name: string, value: number): void {
    let samples = this.metrics.get(name);
    if (!samples) {
      samples = [];
      this.metrics.set(name, samples);
    }

    samples.push(value);

    if (samples.length > this.maxSamples) {
      samples.shift();
    }
  }

  getMetric(name: string): {
    current: number;
    average: number;
    min: number;
    max: number;
    samples: number;
  } | null {
    const samples = this.metrics.get(name);
    if (!samples || samples.length === 0) {
      return null;
    }

    const sum = samples.reduce((a, b) => a + b, 0);
    return {
      current: samples[samples.length - 1],
      average: sum / samples.length,
      min: Math.min(...samples),
      max: Math.max(...samples),
      samples: samples.length,
    };
  }

  getAllMetrics(): Record<string, ReturnType<PerformanceMonitor['getMetric']>> {
    const result: Record<string, ReturnType<PerformanceMonitor['getMetric']>> = {};

    for (const [name] of this.metrics) {
      result[name] = this.getMetric(name);
    }

    return result;
  }

  clear(): void {
    this.metrics.clear();
  }
}

/**
 * Virtualization manager for efficient rendering of large datasets
 */
export class VirtualizationManager {
  private spatialIndex: QuadTree;
  private performanceMonitor: PerformanceMonitor;
  private viewportBuffer = 0.2; // 20% buffer around viewport

  constructor(bounds: BoundingBox) {
    this.spatialIndex = new QuadTree(bounds);
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Update spatial index with new items
   */
  updateIndex(items: SpatialItem[]): void {
    const startTime = performance.now();

    this.spatialIndex.clear();
    for (const item of items) {
      this.spatialIndex.insert(item);
    }

    const updateTime = performance.now() - startTime;
    this.performanceMonitor.recordMetric('indexUpdate', updateTime);
  }

  /**
   * Get visible items for current viewport with performance tracking
   */
  getVisibleItems(viewport: ViewportInfo): {
    items: SpatialItem[];
    stats: {
      total: number;
      visible: number;
      cullRatio: number;
      queryTime: number;
    };
  } {
    const startTime = performance.now();

    // Expand viewport with buffer
    const bufferedViewport: ViewportInfo = {
      x: viewport.x - viewport.width * this.viewportBuffer,
      y: viewport.y - viewport.height * this.viewportBuffer,
      width: viewport.width * (1 + 2 * this.viewportBuffer),
      height: viewport.height * (1 + 2 * this.viewportBuffer),
      scale: viewport.scale,
    };

    const items = this.spatialIndex.queryViewport(bufferedViewport);
    const queryTime = performance.now() - startTime;

    this.performanceMonitor.recordMetric('queryTime', queryTime);
    this.performanceMonitor.recordMetric('visibleItems', items.length);

    const spatialStats = this.spatialIndex.getStats();

    return {
      items,
      stats: {
        total: spatialStats.totalItems,
        visible: items.length,
        cullRatio: spatialStats.totalItems > 0 ? (spatialStats.totalItems - items.length) / spatialStats.totalItems : 0,
        queryTime,
      },
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Record<string, ReturnType<PerformanceMonitor['getMetric']>> {
    return this.performanceMonitor.getAllMetrics();
  }

  /**
   * Update viewport buffer (useful for performance tuning)
   */
  setViewportBuffer(buffer: number): void {
    this.viewportBuffer = Math.max(0, Math.min(1, buffer));
  }

  /**
   * Rebuild spatial index with new bounds
   */
  rebuild(bounds: BoundingBox): void {
    this.spatialIndex = new QuadTree(bounds);
  }
}

/**
 * Level-of-detail manager for dynamic quality adjustment
 */
export class LevelOfDetailManager {
  private lodLevels: Array<{
    minScale: number;
    maxItems: number;
    simplification: 'none' | 'basic' | 'aggressive';
    hideLabels: boolean;
    hideDetails: boolean;
  }> = [
    {
      minScale: 2.0,
      maxItems: Infinity,
      simplification: 'none',
      hideLabels: false,
      hideDetails: false,
    },
    {
      minScale: 1.0,
      maxItems: 1000,
      simplification: 'basic',
      hideLabels: false,
      hideDetails: true,
    },
    {
      minScale: 0.5,
      maxItems: 500,
      simplification: 'basic',
      hideLabels: true,
      hideDetails: true,
    },
    {
      minScale: 0.0,
      maxItems: 200,
      simplification: 'aggressive',
      hideLabels: true,
      hideDetails: true,
    },
  ];

  getLevelOfDetail(
    scale: number,
    itemCount: number,
  ): {
    level: number;
    maxItems: number;
    simplification: 'none' | 'basic' | 'aggressive';
    hideLabels: boolean;
    hideDetails: boolean;
    shouldCull: boolean;
  } {
    let selectedLevel = this.lodLevels[this.lodLevels.length - 1];
    let levelIndex = this.lodLevels.length - 1;

    for (let i = 0; i < this.lodLevels.length; i++) {
      if (scale >= this.lodLevels[i].minScale) {
        selectedLevel = this.lodLevels[i];
        levelIndex = i;
        break;
      }
    }

    return {
      level: levelIndex,
      maxItems: selectedLevel.maxItems,
      simplification: selectedLevel.simplification,
      hideLabels: selectedLevel.hideLabels,
      hideDetails: selectedLevel.hideDetails,
      shouldCull: itemCount > selectedLevel.maxItems,
    };
  }

  /**
   * Customize LOD levels for specific use cases
   */
  setLodLevels(levels: typeof this.lodLevels): void {
    this.lodLevels = levels.sort((a, b) => b.minScale - a.minScale);
  }
}
