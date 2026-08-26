import type { AnyEntity } from '@sammons/typed-mind';
import { DSLChecker, DSLParser, DSLValidator, SyntaxGenerator } from '@sammons/typed-mind';
import type {
  CompletionItem,
  DefinitionParams,
  Diagnostic,
  Hover,
  InitializeParams,
  InitializeResult,
  Location,
  ReferenceParams,
  SemanticTokens,
  SemanticTokensParams,
  TextDocumentPositionParams,
} from 'vscode-languageserver/node.js';
import {
  CompletionItemKind,
  createConnection,
  DiagnosticSeverity,
  MarkupKind,
  ProposedFeatures,
  SemanticTokenModifiers,
  SemanticTokensBuilder,
  SemanticTokenTypes,
  TextDocumentSyncKind,
  TextDocuments,
} from 'vscode-languageserver/node.js';
import { TextDocument } from 'vscode-languageserver-textdocument';

export class TypedMindLanguageServer {
  private connection = createConnection(ProposedFeatures.all);
  private documents = new TextDocuments<TextDocument>(TextDocument);
  private parser = new DSLParser();
  private validator = new DSLValidator();
  private syntaxGenerator = new SyntaxGenerator();

  // Cache parsed entities per document
  private documentEntities = new Map<string, Map<string, AnyEntity>>();

  // Semantic tokens legend
  private readonly tokenTypes = [
    SemanticTokenTypes.function,
    SemanticTokenTypes.class,
    SemanticTokenTypes.interface,
    SemanticTokenTypes.variable,
    SemanticTokenTypes.parameter,
    SemanticTokenTypes.property,
    SemanticTokenTypes.namespace,
    SemanticTokenTypes.type,
  ];

  private readonly tokenModifiers = [
    SemanticTokenModifiers.declaration,
    SemanticTokenModifiers.definition,
    SemanticTokenModifiers.readonly,
    SemanticTokenModifiers.static,
  ];

  constructor() {
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.connection.onInitialize((_params: InitializeParams): InitializeResult => {
      const result: InitializeResult = {
        capabilities: {
          textDocumentSync: TextDocumentSyncKind.Incremental,
          completionProvider: {
            resolveProvider: false,
            triggerCharacters: ['-', '<', '@', ':', '~', '!', '=', '#'],
          },
          hoverProvider: true,
          definitionProvider: true,
          referencesProvider: true,
          semanticTokensProvider: {
            legend: {
              tokenTypes: this.tokenTypes,
              tokenModifiers: this.tokenModifiers,
            },
            full: true,
          },
        },
      };
      return result;
    });

    this.connection.onInitialized(() => {
      this.connection.console.log('TypedMind Language Server initialized');
    });

    // Handle document open
    this.documents.onDidOpen((event) => {
      this.validateTextDocument(event.document);
    });

    // Handle text document changes
    this.documents.onDidChangeContent((change) => {
      this.validateTextDocument(change.document);
    });

    // Handle completion
    this.connection.onCompletion((params: TextDocumentPositionParams): CompletionItem[] => {
      return this.provideCompletions(params);
    });

    // Handle hover
    this.connection.onHover((params: TextDocumentPositionParams): Hover | null => {
      return this.provideHover(params);
    });

    // Handle go to definition
    this.connection.onDefinition((params: DefinitionParams): Location | null => {
      return this.provideDefinition(params);
    });

    // Handle find references
    this.connection.onReferences((params: ReferenceParams): Location[] => {
      return this.provideReferences(params);
    });

    // Handle semantic tokens
    this.connection.languages.semanticTokens.on((params: SemanticTokensParams): SemanticTokens => {
      return this.provideSemanticTokens(params);
    });

    // Handle custom format toggle request
    this.connection.onRequest('typedmind/toggleFormat', (params: { uri: string; range?: { start: number; end: number } }) => {
      return this.handleToggleFormat(params);
    });
  }

  private async validateTextDocument(textDocument: TextDocument): Promise<void> {
    const text = textDocument.getText();
    const diagnostics: Diagnostic[] = [];

    try {
      // Parse the document
      const parseResult = this.parser.parse(text);
      this.documentEntities.set(textDocument.uri, parseResult.entities);

      // Validate the parsed entities
      const validationResult = this.validator.validate(parseResult.entities);

      // Convert validation errors to diagnostics
      for (const error of validationResult.errors) {
        const diagnostic: Diagnostic = {
          severity: error.severity === 'error' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
          range: {
            start: { line: error.position.line - 1, character: error.position.column - 1 },
            end: { line: error.position.line - 1, character: error.position.column + 10 },
          },
          message: error.message,
          source: 'typed-mind',
        };

        if (error.suggestion) {
          diagnostic.message += `\n${error.suggestion}`;
        }

        diagnostics.push(diagnostic);
      }
    } catch (parseError) {
      // Handle parse errors
      const diagnostic: Diagnostic = {
        severity: DiagnosticSeverity.Error,
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 },
        },
        message: `Parse error: ${parseError}`,
        source: 'typed-mind',
      };
      diagnostics.push(diagnostic);
    }

    // Send the diagnostics to VS Code
    await this.connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
  }

  private provideCompletions(params: TextDocumentPositionParams): CompletionItem[] {
    const document = this.documents.get(params.textDocument.uri);
    if (!document) return [];

    const entities = this.documentEntities.get(params.textDocument.uri);
    if (!entities) return [];

    const items: CompletionItem[] = [];

    // Add entity types
    const entityTypes = [
      'Program',
      'File',
      'Function',
      'Class',
      'Constants',
      'DTO',
      'Asset',
      'UIComponent',
      'RunParameter',
      'Dependency',
    ] as const;
    for (const type of entityTypes) {
      items.push({
        label: type,
        kind: CompletionItemKind.Keyword,
        detail: `Entity type: ${type}`,
      });
    }

    // Add operators
    const operators = [
      { label: '->', detail: 'Entry point operator' },
      { label: '<-', detail: 'Import operator' },
      { label: '@', detail: 'Location operator' },
      { label: '::', detail: 'Function signature operator' },
      { label: '~>', detail: 'Function calls operator' },
      { label: '<:', detail: 'Extends operator' },
      { label: '!', detail: 'Constants operator' },
      { label: '=>', detail: 'Methods operator' },
      { label: '%', detail: 'DTO operator' },
      { label: '~', detail: 'Asset operator' },
      { label: '&', detail: 'UIComponent operator' },
      { label: '&!', detail: 'Root UIComponent operator' },
      { label: '^', detail: 'Dependency operator' },
      { label: '$env', detail: 'Environment variable parameter' },
      { label: '$iam', detail: 'IAM role parameter' },
      { label: '$runtime', detail: 'Runtime configuration parameter' },
      { label: '$config', detail: 'Application configuration parameter' },
      { label: '$<', detail: 'Function consumes parameters' },
      { label: '>>', detail: 'Asset contains program' },
      { label: '>', detail: 'UIComponent contains' },
      { label: '<', detail: 'UIComponent contained by' },
    ];

    for (const op of operators) {
      items.push({
        label: op.label,
        kind: CompletionItemKind.Operator,
        detail: op.detail,
      });
    }

    // Add existing entity names for references
    for (const [name, entity] of Array.from(entities)) {
      items.push({
        label: name,
        kind: this.getCompletionItemKind(entity.type),
        detail: `${entity.type}: ${name}`,
      });
    }

    return items;
  }

  private getCompletionItemKind(entityType: string): CompletionItemKind {
    switch (entityType) {
      case 'Program':
        return CompletionItemKind.Module;
      case 'File':
        return CompletionItemKind.File;
      case 'Function':
        return CompletionItemKind.Function;
      case 'Class':
        return CompletionItemKind.Class;
      case 'Constants':
        return CompletionItemKind.Constant;
      case 'DTO':
        return CompletionItemKind.Interface;
      case 'Asset':
        return CompletionItemKind.File;
      case 'UIComponent':
        return CompletionItemKind.Class;
      case 'RunParameter':
        return CompletionItemKind.Property;
      case 'Dependency':
        return CompletionItemKind.Module;
      default:
        return CompletionItemKind.Variable;
    }
  }

  private provideHover(params: TextDocumentPositionParams): Hover | null {
    const document = this.documents.get(params.textDocument.uri);
    if (!document) return null;

    const entities = this.documentEntities.get(params.textDocument.uri);
    if (!entities) return null;

    // Find entity at position
    const text = document.getText();
    const offset = document.offsetAt(params.position);

    // Simple heuristic: find word at position
    const wordRange = this.getWordRangeAtPosition(text, offset);
    if (!wordRange) return null;

    const word = text.substring(wordRange.start, wordRange.end);
    const entity = entities.get(word);

    if (!entity) return null;

    // Build hover content
    const contents: string[] = [`**${entity.type}**: ${entity.name}`];

    if (entity.comment) {
      contents.push(`💬 *${entity.comment}*`);
    }

    if (entity.referencedBy && entity.referencedBy.length > 0) {
      const refsByType = new Map<string, string[]>();
      for (const ref of entity.referencedBy) {
        // Handle both object and string references
        if (typeof ref === 'object' && ref.type && ref.from) {
          if (!refsByType.has(ref.type)) {
            refsByType.set(ref.type, []);
          }
          refsByType.get(ref.type)?.push(ref.from);
        } else if (typeof ref === 'string') {
          // Legacy string format
          if (!refsByType.has('reference')) {
            refsByType.set('reference', []);
          }
          refsByType.get('reference')?.push(ref);
        }
      }

      const refStrings: string[] = [];
      for (const [type, froms] of Array.from(refsByType)) {
        refStrings.push(`${type}: ${froms.join(', ')}`);
      }
      contents.push(`**Referenced By**: ${refStrings.join(' | ')}`);
    }

    if ('path' in entity && entity.path) {
      contents.push(`**Path**: ${entity.path}`);
    }

    if ('signature' in entity && entity.signature) {
      contents.push(`**Signature**: \`${entity.signature}\``);
    }

    if ('description' in entity && entity.description) {
      contents.push(`**Description**: ${entity.description}`);
    }

    // Handle purpose for non-DTO and non-UIComponent entities
    // (DTOs and UIComponents handle purpose in their specific sections)
    if ('purpose' in entity && entity.purpose && entity.type !== 'DTO' && entity.type !== 'UIComponent') {
      contents.push(`**Purpose**: ${entity.purpose}`);
    }

    if ('imports' in entity && entity.imports && entity.imports.length > 0) {
      contents.push(`**Imports**: ${entity.imports.join(', ')}`);
    }

    if ('exports' in entity && entity.exports.length > 0) {
      contents.push(`**Exports**: ${entity.exports.join(', ')}`);
    }

    if ('calls' in entity && entity.calls.length > 0) {
      contents.push(`**Calls**: ${entity.calls.join(', ')}`);
    }

    // DTO-specific information
    if (entity.type === 'DTO') {
      const dtoEntity = entity as any; // DTOEntity not imported in LSP
      if (dtoEntity.purpose) {
        contents.push(`**Purpose**: ${dtoEntity.purpose}`);
      }
      if (dtoEntity.fields && dtoEntity.fields.length > 0) {
        const fieldList = dtoEntity.fields
          .map((field: any) => {
            const optional = field.optional ? ' *(optional)*' : '';
            const desc = field.description ? ` - ${field.description}` : '';
            return `• \`${field.name}: ${field.type}\`${optional}${desc}`;
          })
          .join('\n');
        contents.push(`**Fields**:\n${fieldList}`);
      }
    }

    // Asset-specific information
    if (entity.type === 'Asset') {
      const assetEntity = entity as any;
      if (assetEntity.containsProgram) {
        contents.push(`**Contains Program**: ${assetEntity.containsProgram}`);
      }
    }

    // UIComponent-specific information
    if (entity.type === 'UIComponent') {
      const uiEntity = entity as any;
      if (uiEntity.purpose) {
        contents.push(`**Purpose**: ${uiEntity.purpose}`);
      }
      if (uiEntity.root) {
        contents.push(`**Root Component**: ✓`);
      }
      if (uiEntity.contains && uiEntity.contains.length > 0) {
        contents.push(`**Contains**: ${uiEntity.contains.join(', ')}`);
      }
      if (uiEntity.containedBy && uiEntity.containedBy.length > 0) {
        contents.push(`**Contained By**: ${uiEntity.containedBy.join(', ')}`);
      }
      if (uiEntity.affectedBy && uiEntity.affectedBy.length > 0) {
        contents.push(`**Affected By**: ${uiEntity.affectedBy.join(', ')}`);
      }
    }

    // RunParameter-specific information
    if (entity.type === 'RunParameter') {
      const paramEntity = entity as any;
      contents.push(`**Parameter Type**: ${paramEntity.paramType}`);
      if (paramEntity.required) {
        contents.push(`**Required**: ✓`);
      }
      if (paramEntity.defaultValue) {
        contents.push(`**Default Value**: \`${paramEntity.defaultValue}\``);
      }
      if (paramEntity.consumedBy && paramEntity.consumedBy.length > 0) {
        contents.push(`**Consumed By**: ${paramEntity.consumedBy.join(', ')}`);
      }
    }

    // Function-specific information for new properties
    if (entity.type === 'Function') {
      const funcEntity = entity as any;
      if (funcEntity.input) {
        contents.push(`**Input**: ${funcEntity.input}`);
      }
      if (funcEntity.output) {
        contents.push(`**Output**: ${funcEntity.output}`);
      }
      if (funcEntity.affects && funcEntity.affects.length > 0) {
        contents.push(`**Affects**: ${funcEntity.affects.join(', ')}`);
      }
      if (funcEntity.consumes && funcEntity.consumes.length > 0) {
        contents.push(`**Consumes**: ${funcEntity.consumes.join(', ')}`);
      }
    }

    // Dependency-specific information
    if (entity.type === 'Dependency') {
      const depEntity = entity as any;
      if (depEntity.purpose) {
        contents.push(`**Purpose**: ${depEntity.purpose}`);
      }
      if (depEntity.version) {
        contents.push(`**Version**: ${depEntity.version}`);
      }
      if (depEntity.importedBy && depEntity.importedBy.length > 0) {
        contents.push(`**Imported By**: ${depEntity.importedBy.join(', ')}`);
      }
    }

    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: contents.join('\n\n'),
      },
    };
  }

  private provideDefinition(params: DefinitionParams): Location | null {
    const document = this.documents.get(params.textDocument.uri);
    if (!document) return null;

    const entities = this.documentEntities.get(params.textDocument.uri);
    if (!entities) return null;

    const text = document.getText();
    const offset = document.offsetAt(params.position);
    const wordRange = this.getWordRangeAtPosition(text, offset);
    if (!wordRange) return null;

    const word = text.substring(wordRange.start, wordRange.end);
    const entity = entities.get(word);

    if (!entity) return null;

    // Return location of entity definition
    return {
      uri: params.textDocument.uri,
      range: {
        start: { line: entity.position.line - 1, character: 0 },
        end: { line: entity.position.line - 1, character: entity.raw.length },
      },
    };
  }

  private provideReferences(params: ReferenceParams): Location[] {
    const document = this.documents.get(params.textDocument.uri);
    if (!document) return [];

    const entities = this.documentEntities.get(params.textDocument.uri);
    if (!entities) return [];

    const text = document.getText();
    const offset = document.offsetAt(params.position);
    const wordRange = this.getWordRangeAtPosition(text, offset);
    if (!wordRange) return [];

    const word = text.substring(wordRange.start, wordRange.end);
    const locations: Location[] = [];

    // Find all references to this entity
    const lines = text.split('\n');
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      if (!line) continue;

      let columnIndex = line.indexOf(word);
      while (columnIndex !== -1) {
        // Check if this is a word boundary
        const beforeChar = columnIndex > 0 ? line[columnIndex - 1] : ' ';
        const afterChar = columnIndex + word.length < line.length ? line[columnIndex + word.length] : ' ';

        if (this.isWordBoundary(beforeChar) && this.isWordBoundary(afterChar)) {
          locations.push({
            uri: params.textDocument.uri,
            range: {
              start: { line: lineIndex, character: columnIndex },
              end: { line: lineIndex, character: columnIndex + word.length },
            },
          });
        }

        columnIndex = line.indexOf(word, columnIndex + 1);
      }
    }

    return locations;
  }

  private getWordRangeAtPosition(text: string, offset: number): { start: number; end: number } | null {
    if (offset < 0 || offset >= text.length) return null;

    // Check if we're in a scoped package name (starts with @)
    let start = offset;
    let end = offset;

    // Look backward to find the start
    while (start > 0 && this.isEntityNameChar(text[start - 1])) {
      start--;
    }

    // Check if there's an @ before the word
    if (start > 0 && text[start - 1] === '@') {
      // Verify it's at a word boundary
      if (start === 1 || !this.isEntityNameChar(text[start - 2])) {
        start--; // Include the @
      }
    }

    // Look forward to find the end
    while (end < text.length && this.isEntityNameChar(text[end])) {
      end++;
    }

    if (start === end) return null;

    return { start, end };
  }

  private isEntityNameChar(char: string | undefined): boolean {
    if (!char) return false;
    // Allow alphanumeric, hyphen, underscore, and forward slash (for scoped packages)
    return /[a-zA-Z0-9\-_/]/.test(char);
  }

  private isWordBoundary(char: string | undefined): boolean {
    if (!char) return true;
    return /[\s[\],<>@:~!=#-]/.test(char);
  }

  private provideSemanticTokens(params: SemanticTokensParams): SemanticTokens {
    const document = this.documents.get(params.textDocument.uri);
    if (!document) {
      return { data: [] };
    }

    const entities = this.documentEntities.get(params.textDocument.uri);
    if (!entities) {
      return { data: [] };
    }

    const builder = new SemanticTokensBuilder();
    const text = document.getText();
    const lines = text.split('\n');

    // Build a map of entity names to their types for quick lookup
    const entityTypeMap = new Map<string, string>();
    for (const [name, entity] of Array.from(entities)) {
      entityTypeMap.set(name, entity.type);
    }

    // Find all entity references in the document
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      if (!line) continue;

      // Check each word in the line
      const words = Array.from(line.matchAll(/\b([A-Za-z][A-Za-z0-9@/_-]*)\b/g));
      for (const match of words) {
        const word = match[1];
        const index = match.index;
        if (!word || index === undefined) continue;

        const entityType = entityTypeMap.get(word);

        if (entityType) {
          const tokenType = this.getSemanticTokenType(entityType);
          const tokenModifier = this.getSemanticTokenModifier(line, index);

          builder.push(lineIndex, index, word.length, tokenType, tokenModifier);
        }
      }
    }

    return builder.build();
  }

  private getSemanticTokenType(entityType: string): number {
    switch (entityType) {
      case 'Function':
        return this.tokenTypes.indexOf(SemanticTokenTypes.function);
      case 'Class':
        return this.tokenTypes.indexOf(SemanticTokenTypes.class);
      case 'DTO':
      case 'Asset':
      case 'UIComponent':
        return this.tokenTypes.indexOf(SemanticTokenTypes.interface);
      case 'RunParameter':
        return this.tokenTypes.indexOf(SemanticTokenTypes.parameter);
      case 'Constants':
        return this.tokenTypes.indexOf(SemanticTokenTypes.property);
      case 'Program':
      case 'Dependency':
        return this.tokenTypes.indexOf(SemanticTokenTypes.namespace);
      case 'File':
        return this.tokenTypes.indexOf(SemanticTokenTypes.type);
      default:
        return this.tokenTypes.indexOf(SemanticTokenTypes.variable);
    }
  }

  private getSemanticTokenModifier(line: string, position: number): number {
    // Check if this is a declaration (has an operator after it)
    const afterWord = line.substring(position);
    if (/^\w*\s*(->|@|<:|!|::|%|~|&|\$|\^)/.test(afterWord)) {
      return 1 << this.tokenModifiers.indexOf(SemanticTokenModifiers.declaration);
    }
    return 0;
  }

  /**
   * Handle format toggle request from VS Code extension
   */
  private async handleToggleFormat(params: {
    uri: string;
    range?: { start: number; end: number };
  }): Promise<{ newText: string; error?: string }> {
    try {
      this.connection.console.log(`Toggle format request received for ${params.uri}`);

      const document = this.documents.get(params.uri);
      if (!document) {
        this.connection.console.log('Document not found');
        return { newText: '', error: 'Document not found' };
      }

      const fullText = document.getText();
      let textToProcess = fullText;

      this.connection.console.log(`Original text length: ${fullText.length}`);

      // Handle selection range if provided
      if (params.range) {
        const lines = fullText.split('\n');
        const startLineIndex = Math.max(0, params.range.start);
        const endLineIndex = Math.min(lines.length - 1, params.range.end);

        if (startLineIndex <= endLineIndex) {
          textToProcess = lines.slice(startLineIndex, endLineIndex + 1).join('\n');
        }
        this.connection.console.log(`Processing selected text (lines ${startLineIndex}-${endLineIndex}), length: ${textToProcess.length}`);
      } else {
        this.connection.console.log('Processing entire document');
      }

      // Detect current format first
      const detection = this.syntaxGenerator.detectFormat(textToProcess);
      this.connection.console.log(`Detected format: ${JSON.stringify(detection)}`);

      // Use DSL checker for proper parsing
      const checker = new DSLChecker();
      const result = checker.toggleFormat(textToProcess);

      this.connection.console.log(`Toggle result success: ${result._tag === 'success'}`);

      if (result._tag === 'success') {
        this.connection.console.log(`New text length: ${result.value.length}`);
        this.connection.console.log(`Content changed: ${result.value !== textToProcess}`);
        return { newText: result.value };
      } else {
        this.connection.console.log(`Toggle error: ${result.error.message}`);
        return {
          newText: textToProcess, // Return original on error
          error: result.error.message,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during format toggle';
      this.connection.console.error(`Format toggle error: ${errorMessage}`);

      return {
        newText: '',
        error: errorMessage,
      };
    }
  }

  start(): void {
    this.documents.listen(this.connection);
    this.connection.listen();
  }
}
