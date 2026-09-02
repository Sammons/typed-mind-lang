// RFC-TM-5 §1 (rfc-tm-5-diamond.md) — the LSP core migration off the legacy
// bridge (DSLChecker/DSLParser/DSLValidator/SyntaxGenerator, legacy
// server.ts:1-2,33-35) onto TypedMind.create(). Async bootstrap with a race
// guard (leaf b): the server is constructed with an already-ready TypedMind
// facade — see start-server.ts for the static create()/listen() ordering that
// makes this safe. Real-range diagnostics (leaf a), the DocumentState cache,
// CST NameOccurrenceIndex (leaf c), the ClassFile enum-table cases (leaf d),
// and hover joined to LinkIndex (S-CONS-LSP-2) are each delegated to their own
// module; this class is the connection/handler wiring only.

import { TypedMind } from '@sammons/typed-mind';
import type {
  CompletionItem,
  DefinitionParams,
  Hover,
  InitializeParams,
  InitializeResult,
  Location,
  ReferenceParams,
  SemanticTokens,
  SemanticTokensParams,
  TextDocumentPositionParams,
} from 'vscode-languageserver/node';
import { createConnection, MarkupKind, ProposedFeatures, TextDocumentSyncKind, TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { provideCompletionsForEntities } from './completions.ts';
import { buildDocumentState, type DocumentState } from './document-state.ts';
import { renderHoverContents } from './hover.ts';
import { toLspDiagnostics } from './lsp-diagnostics.ts';
import { provideReferencesForName } from './references.ts';
import { provideSemanticTokensForDocument, SEMANTIC_TOKEN_LEGEND, SEMANTIC_TOKEN_MODIFIERS } from './semantic-tokens.ts';
import { handleToggleFormat, type ToggleFormatParams, type ToggleFormatResult } from './toggle-format.ts';
import { resolveWasmPaths } from './wasm-resolution.ts';

export class TypedMindLanguageServer {
  private readonly connection = createConnection(ProposedFeatures.all);
  private readonly documents = new TextDocuments<TextDocument>(TextDocument);
  private readonly typedMind: TypedMind;

  // Cache: Map<uri, DocumentState> — DocumentState = { output, nameIndex, byName }.
  private readonly documentStates = new Map<string, DocumentState>();

  // The constructor takes an already-ready TypedMind facade (the async wasm
  // load happened in the static create() below, before this class ever
  // exists) — no I/O in the constructor (no_side_effects_in_constructors).
  private constructor(typedMind: TypedMind) {
    this.typedMind = typedMind;
    this.setupHandlers();
  }

  // Async bootstrap with race guard (RFC-TM-5 §1 leaf b): callers must await
  // this before calling start(), so connection.listen() (which is what
  // starts reading stdin) never runs before the parser is ready. See
  // start-server.ts for the ordering that makes this the only construction
  // path.
  static async create(): Promise<TypedMindLanguageServer> {
    // RFC-TM-5 §2 — ordered candidate resolution for both wasm artifacts:
    // bundle-adjacent first (the dist-bundled/ layout tsup.bundled.config.ts
    // populates), then the core package's own layouts. Either field may
    // resolve to undefined, in which case TypedMind.create() falls through to
    // its own default resolution unchanged (dev layout parity).
    const typedMind = await TypedMind.create(resolveWasmPaths());
    return new TypedMindLanguageServer(typedMind);
  }

  private setupHandlers(): void {
    this.connection.onInitialize((_params: InitializeParams): InitializeResult => {
      return {
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
              tokenTypes: [...SEMANTIC_TOKEN_LEGEND],
              tokenModifiers: [...SEMANTIC_TOKEN_MODIFIERS],
            },
            full: true,
          },
        },
      };
    });

    this.connection.onInitialized(() => {
      this.connection.console.log('TypedMind Language Server initialized');
    });

    this.documents.onDidOpen((event) => {
      this.validateTextDocument(event.document);
    });

    this.documents.onDidChangeContent((change) => {
      this.validateTextDocument(change.document);
    });

    this.connection.onCompletion((params: TextDocumentPositionParams): CompletionItem[] => {
      return this.provideCompletions(params);
    });

    this.connection.onHover((params: TextDocumentPositionParams): Hover | null => {
      return this.provideHover(params);
    });

    this.connection.onDefinition((params: DefinitionParams): Location | null => {
      return this.provideDefinition(params);
    });

    this.connection.onReferences((params: ReferenceParams): Location[] => {
      return this.provideReferences(params);
    });

    this.connection.languages.semanticTokens.on((params: SemanticTokensParams): SemanticTokens => {
      return this.provideSemanticTokens(params);
    });

    this.connection.onRequest('typedmind/toggleFormat', (params: ToggleFormatParams): ToggleFormatResult => {
      return this.handleToggleFormatRequest(params);
    });
  }

  // Real-range diagnostics (RFC-TM-5 §1 leaf a): typedMind.check(text) never
  // throws (the tolerant pipeline, rfc-tm-3-diamond.md §3.3), so there is no
  // catch arm and no 0,0 collapse — CheckOutcome.diagnostics maps straight
  // onto LSP Ranges via toLspDiagnostics.
  private async validateTextDocument(textDocument: TextDocument): Promise<void> {
    const text = textDocument.getText();
    const parsed = this.typedMind.parseWithCst(text);
    this.documentStates.set(textDocument.uri, buildDocumentState(parsed));
    const checked = this.typedMind.check(text);
    await this.connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: toLspDiagnostics(checked.diagnostics) });
  }

  private provideCompletions(params: TextDocumentPositionParams): CompletionItem[] {
    const state = this.documentStates.get(params.textDocument.uri);
    if (state === undefined) {
      return [];
    }
    return provideCompletionsForEntities(state.byName);
  }

  private provideHover(params: TextDocumentPositionParams): Hover | null {
    const state = this.documentStates.get(params.textDocument.uri);
    if (state === undefined) {
      return null;
    }
    const occurrence = state.nameIndex.occurrenceAt(params.position.line + 1, params.position.character + 1);
    if (occurrence === undefined) {
      return null;
    }
    const entity = state.byName.get(occurrence.name);
    if (entity === undefined) {
      return null;
    }
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: renderHoverContents(entity, state.output.links),
      },
    };
  }

  private provideDefinition(params: DefinitionParams): Location | null {
    const state = this.documentStates.get(params.textDocument.uri);
    if (state === undefined) {
      return null;
    }
    const occurrence = state.nameIndex.occurrenceAt(params.position.line + 1, params.position.character + 1);
    if (occurrence === undefined) {
      return null;
    }
    const entity = state.byName.get(occurrence.name);
    if (entity === undefined) {
      return null;
    }
    return {
      uri: params.textDocument.uri,
      range: {
        start: { line: entity.span.start.line - 1, character: entity.span.start.column - 1 },
        end: { line: entity.span.end.line - 1, character: entity.span.end.column - 1 },
      },
    };
  }

  private provideReferences(params: ReferenceParams): Location[] {
    const state = this.documentStates.get(params.textDocument.uri);
    if (state === undefined) {
      return [];
    }
    const occurrence = state.nameIndex.occurrenceAt(params.position.line + 1, params.position.character + 1);
    if (occurrence === undefined) {
      return [];
    }
    return provideReferencesForName(params.textDocument.uri, occurrence.name, state.nameIndex);
  }

  private provideSemanticTokens(params: SemanticTokensParams): SemanticTokens {
    const state = this.documentStates.get(params.textDocument.uri);
    if (state === undefined) {
      return { data: [] };
    }
    return provideSemanticTokensForDocument(state);
  }

  private handleToggleFormatRequest(params: ToggleFormatParams): ToggleFormatResult {
    try {
      const document = this.documents.get(params.uri);
      if (document === undefined) {
        return { newText: '', error: 'Document not found' };
      }
      return handleToggleFormat(this.typedMind, document.getText(), params);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error during format toggle';
      this.connection.console.error(`Format toggle error: ${message}`);
      return { newText: '', error: message };
    }
  }

  // Only called after create() has resolved: the connection reads stdin
  // (connection.listen()) only from here, so no request can observe an
  // uninitialized parser (RFC-TM-5 §1 leaf b).
  start(): void {
    this.documents.listen(this.connection);
    this.connection.listen();
  }
}
