/**
 * Code Generation Preview System for TypedMind
 * Shows how architectural entities would translate to actual code structures
 * Author: Enhanced by Claude Code in Matt Pocock style
 */

import {
  ClassFileNode,
  ClassNode,
  DtoNode,
  type EntityKind,
  type EntityNode,
  FileNode,
  FunctionNode,
  LinkIndex,
  type ParseOutput,
  UiComponentNode,
} from '@sammons/typed-mind';

/**
 * Target programming languages for code generation
 */
export type TargetLanguage = 'typescript' | 'javascript' | 'python' | 'java' | 'csharp' | 'go' | 'rust';

/**
 * Code generation frameworks/libraries
 */
export type TargetFramework =
  | 'react'
  | 'vue'
  | 'angular'
  | 'svelte' // Frontend
  | 'express'
  | 'nest'
  | 'fastapi'
  | 'spring'
  | 'dotnet' // Backend
  | 'none';

/**
 * Generated code structure
 */
export interface GeneratedCode {
  entityId: string;
  entityType: EntityKind;
  language: TargetLanguage;
  framework: TargetFramework;
  files: GeneratedFile[];
  dependencies: CodeDependency[];
  testFiles?: GeneratedFile[];
  metadata: CodeMetadata;
}

export interface GeneratedFile {
  path: string;
  filename: string;
  content: string;
  language: TargetLanguage;
  type: 'source' | 'test' | 'config' | 'interface' | 'type';
  exports: string[];
  imports: CodeImport[];
}

export interface CodeImport {
  from: string;
  imports: string[];
  isDefault?: boolean;
  isNamespace?: boolean;
  alias?: string;
}

export interface CodeDependency {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency' | 'peerDependency';
  purpose: string;
}

export interface CodeMetadata {
  generatedAt: Date;
  confidence: number; // How accurate the generation is (0-1)
  completeness: number; // How complete the implementation is (0-1)
  patterns: string[]; // Architectural patterns detected
  recommendations: string[];
  warnings: string[];
}

/**
 * Code generation configuration
 */
export interface CodeGenConfig {
  language: TargetLanguage;
  framework: TargetFramework;
  outputDirectory: string;
  includeTests: boolean;
  includeComments: boolean;
  includeTypeDefinitions: boolean;
  codeStyle: CodeStyle;
  patterns: {
    useInterfaces: boolean;
    useAbstractClasses: boolean;
    useDependencyInjection: boolean;
    useAsyncAwait: boolean;
  };
}

export interface CodeStyle {
  indentation: 'tabs' | 'spaces';
  indentSize: number;
  quotes: 'single' | 'double';
  semicolons: boolean;
  trailingCommas: boolean;
  maxLineLength: number;
}

/**
 * Main code generation engine
 */
export class CodeGenerationEngine {
  private generators = new Map<TargetLanguage, LanguageGenerator>();
  private templateEngine: CodeTemplateEngine;

  constructor() {
    this.templateEngine = new CodeTemplateEngine();
    this.registerBuiltInGenerators();
  }

  /**
   * Generate code for entire architecture
   */
  async generateArchitecture(graph: ParseOutput, config: CodeGenConfig): Promise<ArchitectureCodeResult> {
    const entities = graph.entities;
    const generatedEntities: GeneratedCode[] = [];
    const globalDependencies = new Set<CodeDependency>();

    // Sort entities by dependency order
    const sortedEntities = this.sortEntitiesByDependencies(entities, graph);

    for (const entity of sortedEntities) {
      try {
        const generated = await this.generateEntity(entity, config, graph);
        generatedEntities.push(generated);

        // Collect dependencies
        for (const dep of generated.dependencies) {
          globalDependencies.add(dep);
        }
      } catch (error) {
        console.warn(`Failed to generate code for ${entity.name}:`, error);
      }
    }

    // Generate project structure files
    const projectFiles = await this.generateProjectFiles(config, Array.from(globalDependencies));

    return {
      entities: generatedEntities,
      projectFiles,
      dependencies: Array.from(globalDependencies),
      config,
      summary: this.generateSummary(generatedEntities),
      recommendations: this.generateRecommendations(generatedEntities, graph),
    };
  }

  /**
   * Generate code for a single entity
   */
  async generateEntity(entity: EntityNode, config: CodeGenConfig, graph: ParseOutput): Promise<GeneratedCode> {
    const generator = this.generators.get(config.language);
    if (!generator) {
      throw new Error(`No generator available for language: ${config.language}`);
    }

    return await generator.generateEntity(entity, config, graph);
  }

  /**
   * Preview code generation for UI display
   */
  async previewCode(entity: EntityNode, config: Partial<CodeGenConfig>): Promise<CodePreview> {
    const fullConfig: CodeGenConfig = this.mergeWithDefaults(config);

    try {
      // RFC-TM-6 §2 (rfc-tm-6-diamond.md) — previewCode has never had a real
      // graph to pass generateEntity (legacy also stubbed this with an empty
      // Map); the stub carries the new ParseOutput shape instead of the
      // legacy Map-shaped ProgramGraph. LinkIndexMaps isn't part of the
      // package's public surface, so the empty index is built from empty
      // per-relation maps directly (the same shape computeLinks([]) yields).
      const emptyLinks = new LinkIndex({
        referencedBy: new Map(),
        containedBy: new Map(),
        affectedBy: new Map(),
        consumedBy: new Map(),
        importedBy: new Map(),
      });
      const emptyGraph: ParseOutput = { entities: [], imports: [], suppressions: [], diagnostics: [], links: emptyLinks };
      const generated = await this.generateEntity(entity, fullConfig, emptyGraph);

      return {
        success: true,
        entity,
        config: fullConfig,
        files: generated.files,
        metadata: generated.metadata,
        preview: this.createPreviewHTML(generated),
      };
    } catch (error) {
      return {
        success: false,
        entity,
        config: fullConfig,
        error: error instanceof Error ? error.message : 'Unknown error',
        preview: this.createErrorPreviewHTML(entity, error),
      };
    }
  }

  /**
   * Register custom language generator
   */
  registerGenerator(language: TargetLanguage, generator: LanguageGenerator): void {
    this.generators.set(language, generator);
  }

  /**
   * Get available languages and frameworks
   */
  getAvailableTargets(): {
    languages: TargetLanguage[];
    frameworks: Record<TargetLanguage, TargetFramework[]>;
  } {
    return {
      languages: Array.from(this.generators.keys()),
      frameworks: {
        typescript: ['react', 'vue', 'angular', 'svelte', 'express', 'nest', 'none'],
        javascript: ['react', 'vue', 'angular', 'svelte', 'express', 'none'],
        python: ['fastapi', 'none'],
        java: ['spring', 'none'],
        csharp: ['dotnet', 'none'],
        go: ['none'],
        rust: ['none'],
      },
    };
  }

  private registerBuiltInGenerators(): void {
    this.registerGenerator('typescript', new TypeScriptGenerator(this.templateEngine));
    this.registerGenerator('javascript', new JavaScriptGenerator(this.templateEngine));
    this.registerGenerator('python', new PythonGenerator(this.templateEngine));
    this.registerGenerator('java', new JavaGenerator(this.templateEngine));
    this.registerGenerator('csharp', new CSharpGenerator(this.templateEngine));
    this.registerGenerator('go', new GoGenerator(this.templateEngine));
    this.registerGenerator('rust', new RustGenerator(this.templateEngine));
  }

  private sortEntitiesByDependencies(entities: readonly EntityNode[], graph: ParseOutput): EntityNode[] {
    // Topological sort based on dependencies
    const sorted: EntityNode[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const byName = new Map(graph.entities.map((candidate) => [candidate.name, candidate]));

    const visit = (entity: EntityNode) => {
      if (visiting.has(entity.name)) {
        // Circular dependency - add anyway
        return;
      }

      if (visited.has(entity.name)) {
        return;
      }

      visiting.add(entity.name);

      // Visit dependencies first
      const dependencies = this.getEntityDependencies(entity);
      for (const depName of dependencies) {
        const depEntity = byName.get(depName);
        if (depEntity) {
          visit(depEntity);
        }
      }

      visiting.delete(entity.name);
      visited.add(entity.name);
      sorted.push(entity);
    };

    for (const entity of entities) {
      visit(entity);
    }

    return sorted;
  }

  // RFC-TM-6 §2 (rfc-tm-6-diamond.md) — class dispatch over EntityNode
  // subclasses replaces the legacy six-field duck-typing ('imports' in
  // entity / 'extends' in entity / 'implements' in entity / 'input' in
  // entity / 'output' in entity / 'consumes' in entity). Field ownership on
  // the new AST: imports on File|ClassFile; extends/implements on
  // Class|ClassFile; input/output/consumes on Function. The dependency-
  // branch golden (goldens/legacy-baseline/dependency-branches/
  // tm6-branches.json, captured in Q1) exercises every branch.
  private getEntityDependencies(entity: EntityNode): string[] {
    const deps: string[] = [];

    if (entity instanceof FileNode || entity instanceof ClassFileNode) {
      deps.push(...entity.imports);
    }
    if (entity instanceof ClassNode || entity instanceof ClassFileNode) {
      if (entity.extends) deps.push(entity.extends);
      deps.push(...entity.implements);
    }
    if (entity instanceof FunctionNode) {
      if (entity.input) deps.push(entity.input);
      if (entity.output) deps.push(entity.output);
      deps.push(...(entity.consumes ?? []));
    }

    return deps;
  }

  private async generateProjectFiles(config: CodeGenConfig, dependencies: CodeDependency[]): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Generate package.json/requirements.txt/etc.
    if (config.language === 'typescript' || config.language === 'javascript') {
      files.push(this.generatePackageJson(dependencies, config));
      files.push(this.generateTsConfig(config));
    } else if (config.language === 'python') {
      files.push(this.generateRequirementsTxt(dependencies));
    }

    // Generate configuration files
    files.push(...this.generateConfigFiles(config));

    return files;
  }

  private generatePackageJson(dependencies: CodeDependency[], config: CodeGenConfig): GeneratedFile {
    const deps = dependencies.filter((d) => d.type === 'dependency');
    const devDeps = dependencies.filter((d) => d.type === 'devDependency');

    const packageJson = {
      name: 'generated-typed-mind-project',
      version: '1.0.0',
      description: 'Generated from TypedMind architecture',
      main: 'index.js',
      scripts: {
        build: config.language === 'typescript' ? 'tsc' : 'echo "No build step"',
        start: 'node dist/index.js',
        dev: 'nodemon src/index.ts',
        test: 'jest',
      },
      dependencies: Object.fromEntries(deps.map((d) => [d.name, d.version])),
      devDependencies: Object.fromEntries(devDeps.map((d) => [d.name, d.version])),
    };

    return {
      path: '.',
      filename: 'package.json',
      content: JSON.stringify(packageJson, null, 2),
      language: 'javascript' as TargetLanguage,
      type: 'config',
      exports: [],
      imports: [],
    };
  }

  private generateTsConfig(config: CodeGenConfig): GeneratedFile {
    const tsConfig = {
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        lib: ['ES2020'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: config.includeTypeDefinitions,
        declarationMap: config.includeTypeDefinitions,
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    };

    return {
      path: '.',
      filename: 'tsconfig.json',
      content: JSON.stringify(tsConfig, null, 2),
      language: 'typescript',
      type: 'config',
      exports: [],
      imports: [],
    };
  }

  private generateRequirementsTxt(dependencies: CodeDependency[]): GeneratedFile {
    const content = dependencies
      .filter((d) => d.type === 'dependency')
      .map((d) => `${d.name}==${d.version}`)
      .join('\n');

    return {
      path: '.',
      filename: 'requirements.txt',
      content,
      language: 'python',
      type: 'config',
      exports: [],
      imports: [],
    };
  }

  private generateConfigFiles(config: CodeGenConfig): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Generate .gitignore
    files.push({
      path: '.',
      filename: '.gitignore',
      content: this.generateGitIgnore(config.language),
      language: config.language,
      type: 'config',
      exports: [],
      imports: [],
    });

    // Generate README.md
    files.push({
      path: '.',
      filename: 'README.md',
      content: this.generateReadme(config),
      language: config.language,
      type: 'config',
      exports: [],
      imports: [],
    });

    return files;
  }

  private generateGitIgnore(language: TargetLanguage): string {
    const common = `
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
build/
dist/

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`.trim();

    const languageSpecific = {
      typescript: '\n# TypeScript\n*.tsbuildinfo',
      javascript: '',
      python: '\n# Python\n__pycache__/\n*.py[cod]\n*$py.class\n.pytest_cache/',
      java: '\n# Java\n*.class\ntarget/',
      csharp: '\n# C#\nbin/\nobj/',
      go: '\n# Go\n*.exe\n*.exe~',
      rust: '\n# Rust\ntarget/',
    };

    return common + (languageSpecific[language] || '');
  }

  private generateReadme(config: CodeGenConfig): string {
    return `# Generated TypedMind Project

This project was generated from a TypedMind architecture definition.

## Language: ${config.language}
## Framework: ${config.framework}

## Getting Started

1. Install dependencies:
   ${config.language === 'python' ? 'pip install -r requirements.txt' : 'npm install'}

2. Run the project:
   ${config.language === 'python' ? 'python main.py' : 'npm start'}

## Architecture

This project follows the architectural patterns defined in the TypedMind specification.

Generated at: ${new Date().toISOString()}
`;
  }

  private createPreviewHTML(generated: GeneratedCode): string {
    return `
      <div class="code-preview">
        <div class="code-preview-header">
          <h3>${generated.entityId} (${generated.entityType})</h3>
          <div class="code-preview-meta">
            <span class="language">${generated.language}</span>
            <span class="framework">${generated.framework}</span>
            <span class="confidence">${Math.round(generated.metadata.confidence * 100)}% confidence</span>
          </div>
        </div>
        <div class="code-preview-files">
          ${generated.files
            .map(
              (file) => `
            <div class="code-file">
              <div class="file-header">
                <span class="file-path">${file.path}/${file.filename}</span>
                <span class="file-type">${file.type}</span>
              </div>
              <pre class="file-content"><code class="language-${file.language}">${this.escapeHtml(file.content)}</code></pre>
            </div>
          `,
            )
            .join('')}
        </div>
        ${
          generated.dependencies.length > 0
            ? `
          <div class="code-dependencies">
            <h4>Dependencies</h4>
            <ul>
              ${generated.dependencies
                .map(
                  (dep) => `
                <li>${dep.name}@${dep.version} (${dep.type})</li>
              `,
                )
                .join('')}
            </ul>
          </div>
        `
            : ''
        }
        ${
          generated.metadata.recommendations.length > 0
            ? `
          <div class="code-recommendations">
            <h4>Recommendations</h4>
            <ul>
              ${generated.metadata.recommendations.map((rec) => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
        `
            : ''
        }
      </div>
    `;
  }

  private createErrorPreviewHTML(entity: EntityNode, error: unknown): string {
    return `
      <div class="code-preview-error">
        <h3>Code Generation Error</h3>
        <p>Failed to generate code for <strong>${entity.name}</strong> (${entity.kind})</p>
        <div class="error-message">
          <code>${error instanceof Error ? error.message : 'Unknown error'}</code>
        </div>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  private mergeWithDefaults(config: Partial<CodeGenConfig>): CodeGenConfig {
    return {
      language: 'typescript',
      framework: 'none',
      outputDirectory: './generated',
      includeTests: true,
      includeComments: true,
      includeTypeDefinitions: true,
      codeStyle: {
        indentation: 'spaces',
        indentSize: 2,
        quotes: 'single',
        semicolons: true,
        trailingCommas: true,
        maxLineLength: 100,
      },
      patterns: {
        useInterfaces: true,
        useAbstractClasses: true,
        useDependencyInjection: true,
        useAsyncAwait: true,
      },
      ...config,
    };
  }

  private generateSummary(entities: GeneratedCode[]): ArchitectureSummary {
    return {
      totalEntities: entities.length,
      totalFiles: entities.reduce((sum, e) => sum + e.files.length, 0),
      totalDependencies: new Set(entities.flatMap((e) => e.dependencies.map((d) => d.name))).size,
      averageConfidence: entities.reduce((sum, e) => sum + e.metadata.confidence, 0) / entities.length,
      languages: [...new Set(entities.map((e) => e.language))],
      patterns: [...new Set(entities.flatMap((e) => e.metadata.patterns))],
    };
  }

  private generateRecommendations(entities: GeneratedCode[], _graph: ParseOutput): string[] {
    const recommendations: string[] = [];

    // Check for common issues
    const lowConfidenceEntities = entities.filter((e) => e.metadata.confidence < 0.7);
    if (lowConfidenceEntities.length > 0) {
      recommendations.push(`Review ${lowConfidenceEntities.length} entities with low generation confidence`);
    }

    // Check for missing patterns
    const hasControllers = entities.some((e) => e.entityType === 'Class' && e.entityId.includes('Controller'));
    const hasServices = entities.some((e) => e.entityType === 'Class' && e.entityId.includes('Service'));

    if (hasControllers && !hasServices) {
      recommendations.push('Consider adding service layer for better separation of concerns');
    }

    return recommendations;
  }
}

// Language-specific generators (abbreviated implementations)

abstract class LanguageGenerator {
  protected templateEngine: CodeTemplateEngine;

  constructor(templateEngine: CodeTemplateEngine) {
    this.templateEngine = templateEngine;
  }

  abstract generateEntity(entity: EntityNode, config: CodeGenConfig, graph: ParseOutput): Promise<GeneratedCode>;

  protected createMetadata(_entity: EntityNode, confidence: number): CodeMetadata {
    return {
      generatedAt: new Date(),
      confidence,
      completeness: 0.8,
      patterns: [],
      recommendations: [],
      warnings: [],
    };
  }
}

class TypeScriptGenerator extends LanguageGenerator {
  async generateEntity(entity: EntityNode, config: CodeGenConfig, _graph: ParseOutput): Promise<GeneratedCode> {
    const files: GeneratedFile[] = [];
    const dependencies: CodeDependency[] = [];

    if (entity instanceof DtoNode) {
      files.push(this.generateDTOInterface(entity, config));
    } else if (entity instanceof ClassNode || entity instanceof ClassFileNode) {
      files.push(this.generateClass(entity, config));
      if (config.includeTests) {
        files.push(this.generateClassTest(entity, config));
      }
    } else if (entity instanceof FunctionNode) {
      files.push(this.generateFunction(entity, config));
    } else if (entity instanceof UiComponentNode) {
      files.push(...this.generateUIComponent(entity, config));
      dependencies.push({ name: 'react', version: '^18.0.0', type: 'dependency', purpose: 'UI framework' });
    }

    return {
      entityId: entity.name,
      entityType: entity.kind,
      language: 'typescript',
      framework: config.framework,
      files,
      dependencies,
      metadata: this.createMetadata(entity, 0.85),
    };
  }

  private generateDTOInterface(entity: DtoNode, config: CodeGenConfig): GeneratedFile {
    const fields = entity.fields;

    const content = `${config.includeComments ? `/**\n * ${entity.purpose || `DTO for ${entity.name}`}\n */\n` : ''}export interface ${entity.name} {
${fields
  .map((field) => {
    const optional = field.isOptional ? '?' : '';
    const comment = config.includeComments && field.description ? `\n  /** ${field.description} */` : '';
    return `${comment}\n  ${field.name}${optional}: ${field.type};`;
  })
  .join('\n')}
}

${config.includeTypeDefinitions ? `\nexport type Partial${entity.name} = Partial<${entity.name}>;\n` : ''}`;

    return {
      path: 'src/types',
      filename: `${entity.name}.ts`,
      content,
      language: 'typescript',
      type: 'interface',
      exports: [entity.name],
      imports: [],
    };
  }

  private generateClass(entity: ClassNode | ClassFileNode, config: CodeGenConfig): GeneratedFile {
    const methods = entity.methods;
    const extendsClause = entity.extends ? ` extends ${entity.extends}` : '';
    const implementsClause = entity.implements.length ? ` implements ${entity.implements.join(', ')}` : '';

    const content = `${config.includeComments ? `/**\n * ${entity.purpose || `Class ${entity.name}`}\n */\n` : ''}export class ${entity.name}${extendsClause}${implementsClause} {
  constructor() {
    // TODO: Implement constructor
  }

${methods
  .map(
    (method) => `  ${method}(): void {
    // TODO: Implement ${method}
  }`,
  )
  .join('\n\n')}
}`;

    return {
      path: 'src/classes',
      filename: `${entity.name}.ts`,
      content,
      language: 'typescript',
      type: 'source',
      exports: [entity.name],
      imports: [],
    };
  }

  private generateClassTest(entity: ClassNode | ClassFileNode, _config: CodeGenConfig): GeneratedFile {
    const content = `import { ${entity.name} } from '../classes/${entity.name}';

describe('${entity.name}', () => {
  let instance: ${entity.name};

  beforeEach(() => {
    instance = new ${entity.name}();
  });

  it('should be created', () => {
    expect(instance).toBeDefined();
  });

  // TODO: Add more tests
});`;

    return {
      path: 'src/__tests__',
      filename: `${entity.name}.test.ts`,
      content,
      language: 'typescript',
      type: 'test',
      exports: [],
      imports: [{ from: `../classes/${entity.name}`, imports: [entity.name] }],
    };
  }

  private generateFunction(entity: FunctionNode, config: CodeGenConfig): GeneratedFile {
    const signature = entity.signature || `${entity.name}(): void`;
    const content = `${config.includeComments ? `/**\n * ${entity.description || `Function ${entity.name}`}\n */\n` : ''}export function ${signature} {
  // TODO: Implement function
}`;

    return {
      path: 'src/functions',
      filename: `${entity.name}.ts`,
      content,
      language: 'typescript',
      type: 'source',
      exports: [entity.name],
      imports: [],
    };
  }

  private generateUIComponent(entity: UiComponentNode, config: CodeGenConfig): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // React component
    const componentContent = `import React from 'react';

${config.includeComments ? `/**\n * ${entity.purpose || `UI Component ${entity.name}`}\n */\n` : ''}export const ${entity.name}: React.FC = () => {
  return (
    <div className="${entity.name.toLowerCase()}">
      {/* TODO: Implement component */}
      <h1>${entity.name}</h1>
    </div>
  );
};

export default ${entity.name};`;

    files.push({
      path: 'src/components',
      filename: `${entity.name}.tsx`,
      content: componentContent,
      language: 'typescript',
      type: 'source',
      exports: [entity.name, 'default'],
      imports: [{ from: 'react', imports: ['React'] }],
    });

    // CSS module (optional)
    const cssContent = `.${entity.name.toLowerCase()} {
  /* TODO: Add styles */
}`;

    files.push({
      path: 'src/components',
      filename: `${entity.name}.module.css`,
      content: cssContent,
      language: 'css' as TargetLanguage,
      type: 'source',
      exports: [],
      imports: [],
    });

    return files;
  }
}

// Other language generators would follow similar patterns...
class JavaScriptGenerator extends LanguageGenerator {
  async generateEntity(): Promise<GeneratedCode> {
    return {} as GeneratedCode; // Simplified
  }
}

class PythonGenerator extends LanguageGenerator {
  async generateEntity(): Promise<GeneratedCode> {
    return {} as GeneratedCode; // Simplified
  }
}

class JavaGenerator extends LanguageGenerator {
  async generateEntity(): Promise<GeneratedCode> {
    return {} as GeneratedCode; // Simplified
  }
}

class CSharpGenerator extends LanguageGenerator {
  async generateEntity(): Promise<GeneratedCode> {
    return {} as GeneratedCode; // Simplified
  }
}

class GoGenerator extends LanguageGenerator {
  async generateEntity(): Promise<GeneratedCode> {
    return {} as GeneratedCode; // Simplified
  }
}

class RustGenerator extends LanguageGenerator {
  async generateEntity(): Promise<GeneratedCode> {
    return {} as GeneratedCode; // Simplified
  }
}

/**
 * Template engine for code generation
 */
class CodeTemplateEngine {
  private templates = new Map<string, string>();

  registerTemplate(name: string, template: string): void {
    this.templates.set(name, template);
  }

  render(templateName: string, context: Record<string, unknown>): string {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    let result = template;
    for (const [key, value] of Object.entries(context)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }
}

// Supporting interfaces

export interface ArchitectureCodeResult {
  entities: GeneratedCode[];
  projectFiles: GeneratedFile[];
  dependencies: CodeDependency[];
  config: CodeGenConfig;
  summary: ArchitectureSummary;
  recommendations: string[];
}

export interface ArchitectureSummary {
  totalEntities: number;
  totalFiles: number;
  totalDependencies: number;
  averageConfidence: number;
  languages: TargetLanguage[];
  patterns: string[];
}

export interface CodePreview {
  success: boolean;
  entity: EntityNode;
  config: CodeGenConfig;
  files?: GeneratedFile[];
  metadata?: CodeMetadata;
  error?: string;
  preview: string;
}
