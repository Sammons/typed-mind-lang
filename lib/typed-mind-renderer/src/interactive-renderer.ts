/**
 * Interactive TypedMind Renderer - Comprehensive Interactive Features
 * Building on the enhanced renderer with full interaction capabilities
 * Author: Enhanced by Claude Code in Matt Pocock style
 */

import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ClassFileNode,
  ConstantsNode,
  DependencyNode,
  type Diagnostic,
  FileNode,
  FunctionNode,
  type ParseOutput,
  ProgramNode,
} from '@sammons/typed-mind';

export interface InteractiveRendererOptions {
  port?: number;
  host?: string;
  openBrowser?: boolean;
  enableMultiSelection?: boolean;
  enableKeyboardNavigation?: boolean;
  enableAccessibility?: boolean;
  enablePerformanceMonitoring?: boolean;
}

export interface ViewState {
  selectedEntities: Set<string>;
  focusedEntity: string | null;
  hiddenEntities: Set<string>;
  filters: Map<string, boolean>;
  zoomLevel: number;
  panPosition: { x: number; y: number };
  layoutType: string;
  searchQuery: string;
}

export interface InteractionEvent {
  type: 'selection' | 'filter' | 'zoom' | 'pan' | 'layout' | 'search' | 'focus';
  timestamp: number;
  data: unknown;
  state: Partial<ViewState>;
}

// Resolve the directory containing this file. Works in both CJS (built dist,
// where __dirname exists) and ESM (Node type-stripping for tests, where
// import.meta.url is always available under module: nodenext (Node 26+).
const sourceDir = dirname(fileURLToPath(import.meta.url));

const CLIENT_JS_FRAGMENTS = [
  'class-preamble.js',
  'selection.js',
  'context-menus.js',
  'keyboard-navigation.js',
  'tooltips.js',
  'breadcrumbs.js',
  'relationship-tracing.js',
  'focus-mode.js',
  'undo-redo.js',
  'enhanced-export.js',
  'search.js',
  'accessibility.js',
  'view-history.js',
  'entity-comparison.js',
  'performance-monitoring.js',
  'notifications.js',
  'utilities.js',
  'initialization.js',
  'postamble.js',
] as const;

class InteractiveTypedMindRenderer {
  private graph: ParseOutput | null = null;
  // RFC-TM-6 §2/FAQ Q3 (rfc-tm-6-diamond.md) — getGraphSnapshot().errors is
  // field-for-field the Diagnostic[] from TypedMind.check() (CheckOutcome),
  // not ParseOutput.diagnostics (parse-only). setValidationResult's shape
  // changes from legacy ValidationResult to this list; the setter itself is
  // not named for deletion by the doc (only setProgramGraph is), so it
  // survives, retyped.
  private diagnostics: readonly Diagnostic[] = [];

  private options: InteractiveRendererOptions;

  constructor(options: InteractiveRendererOptions = {}) {
    this.options = {
      port: 3000,
      host: 'localhost',
      openBrowser: true,
      enableMultiSelection: true,
      enableKeyboardNavigation: true,
      enableAccessibility: true,
      enablePerformanceMonitoring: true,
      ...options,
    };
  }

  setGraph(output: ParseOutput): void {
    this.graph = output;
  }

  setValidationResult(diagnostics: readonly Diagnostic[]): void {
    this.diagnostics = diagnostics;
  }

  async serve(): Promise<void> {
    const server = createServer((req, res) => {
      const url = req.url || '/';

      if (url === '/') {
        const html = this.getHTML();
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      } else if (url === '/interactive-renderer.js') {
        const js = this.generateInteractiveRendererJS();
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(js);
      } else if (url === '/api/graph') {
        const data = this.getGraphData();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } else if (url === '/api/export' && req.method === 'POST') {
        this.handleExportRequest(req, res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    const { port, host } = this.options;
    server.listen(port, host, () => {
      console.log(`Interactive TypedMind renderer running at http://${host}:${port}`);
      if (this.options.openBrowser) {
        this.openInBrowser(`http://${host}:${port}`);
      }
    });
  }

  generateStaticHTML(): string {
    const html = this.getHTML();
    const inlineScript = `<script>
${this.generateInteractiveRendererJS()}
</script>`;

    return html.replace('<script src="interactive-renderer.js"></script>', inlineScript);
  }

  private handleExportRequest(req: IncomingMessage, res: ServerResponse): void {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const exportData = JSON.parse(body);
        const result = this.processExport(exportData);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (_error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid export request' }));
      }
    });
  }

  private processExport(exportData: unknown) {
    // Request body is untrusted JSON; `format` is read defensively and validated by the switch below.
    const format = (exportData as { format?: unknown } | null)?.format;
    const data = this.getGraphData();

    switch (format) {
      case 'json':
        return { data: JSON.stringify(data, null, 2), mimeType: 'application/json' };
      case 'csv':
        return { data: this.convertToCSV(data), mimeType: 'text/csv' };
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private convertToCSV(data: ReturnType<InteractiveTypedMindRenderer['getGraphData']>): string {
    if (!data.entities || data.entities.length === 0) return '';

    const headers = ['name', 'type', 'path', 'signature', 'description'] as const;
    const rows = data.entities.map((entity) =>
      headers
        .map((header) => `"${(((entity as unknown as Record<string, unknown>)[header] as string | undefined) || '').replace(/"/g, '""')}"`)
        .join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }

  private getHTML(): string {
    const srcDir = sourceDir;
    const htmlPath = join(srcDir, 'static', 'interactive-index.html');
    try {
      return readFileSync(htmlPath, 'utf-8');
    } catch {
      const enhancedHtmlPath = join(srcDir, 'static', 'enhanced-index.html');
      const html = readFileSync(enhancedHtmlPath, 'utf-8');
      return html.replace('enhanced-renderer.js', 'interactive-renderer.js');
    }
  }

  private generateInteractiveRendererJS(): string {
    const data = this.getGraphData();
    const clientJsDir = join(sourceDir, 'static', 'client-js');

    const classMethods = CLIENT_JS_FRAGMENTS.map((name) => readFileSync(join(clientJsDir, name), 'utf-8')).join('\n');

    return `
// Interactive TypedMind Renderer - Full Feature Implementation
(function() {
  const graphData = ${JSON.stringify(data)};
  const rendererOptions = ${JSON.stringify(this.options)};

${classMethods}
`;
  }

  /**
   * Public accessor over the private graph-data computation, added by
   * RFC-TM-6 Q1 (rfc-tm-6-diamond.md) to capture legacy-baseline goldens
   * before any bridge flip. Zero behavior change — same object this class
   * has always produced.
   */
  getGraphSnapshot() {
    return this.getGraphData();
  }

  private getGraphData() {
    if (!this.graph) {
      return {
        entities: [],
        links: [],
        errors: [],
      };
    }

    const entities = this.graph.entities;
    const byName = new Map(entities.map((entity) => [entity.name, entity]));
    const links: Array<{ source: string; target: string; type: 'import' | 'export' | 'call' | 'entry' }> = [];

    // RFC-TM-6 §2 (rfc-tm-6-diamond.md) — class dispatch over EntityNode
    // subclasses replaces the legacy 'imports' in entity / 'exports' in
    // entity / 'calls' in entity duck-typing. Every branch mirrors the
    // legacy field read exactly (imports/exports on File|ClassFile|
    // Dependency|Program, calls on Function, entry on Program) — same
    // link set, kind-safe construction.
    for (const entity of entities) {
      if (entity instanceof FileNode || entity instanceof ClassFileNode) {
        for (const imp of entity.imports) {
          if (byName.has(imp)) {
            links.push({ source: entity.name, target: imp, type: 'import' });
          }
        }
        for (const exp of entity.exports) {
          if (byName.has(exp)) {
            links.push({ source: entity.name, target: exp, type: 'export' });
          }
        }
      } else if (entity instanceof DependencyNode || entity instanceof ProgramNode) {
        for (const exp of entity.exports ?? []) {
          if (byName.has(exp)) {
            links.push({ source: entity.name, target: exp, type: 'export' });
          }
        }
      }

      if (entity instanceof FunctionNode || entity instanceof ConstantsNode) {
        for (const call of entity.calls) {
          if (byName.has(call)) {
            links.push({ source: entity.name, target: call, type: 'call' });
          }
        }
      }

      if (entity instanceof ProgramNode && byName.has(entity.entry)) {
        links.push({ source: entity.name, target: entity.entry, type: 'entry' });
      }
    }

    return {
      entities,
      links,
      errors: this.diagnostics,
    };
  }

  private async openInBrowser(url: string): Promise<void> {
    const { exec } = await import('node:child_process');
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

export { InteractiveTypedMindRenderer };
