// TypedMind Language Support for Monaco Editor with Real Parser Integration
//
// RFC-TM-7 §2 (rfc-tm-7-diamond.md, S-CONS-WEB-1): moved from the deleted
// vendored regex parser's synchronous `new TypedMindParser()` /
// `parser.parse(code)` (Map-shaped entities, `.type`, `.position.line`) to
// the async `window.typedMindBrowser` global (list-shaped entities, `.kind`,
// `.span.start.line`) — set by assets/js/typedmind-browser-init.js after it
// awaits the tsc-emitted browser build. This file waits for the
// `typedmind-ready` event before treating the parser as available, per the
// guard `typeof TypedMindParser !== 'undefined'` this replaces.

function registerTypedMindLanguage(monaco) {
  // Register the language
  monaco.languages.register({ 
    id: 'typedmind',
    extensions: ['.tmd'],
    aliases: ['TypedMind', 'typedmind', 'TMD'],
    mimetypes: ['text/x-typedmind']
  });

  // Set language configuration
  monaco.languages.setLanguageConfiguration('typedmind', {
    comments: {
      lineComment: '#'
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"', notIn: ['string'] }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' }
    ]
  });

  // Define simplified monarch tokenizer for basic syntax highlighting
  monaco.languages.setMonarchTokensProvider('typedmind', {
    keywords: [
      'program', 'file', 'function', 'class', 'dto', 'constants', 
      'asset', 'component', 'runParameter', 'dependency',
      'entryPoint', 'version', 'path', 'imports', 'exports',
      'signature', 'description', 'input', 'output', 'calls',
      'affects', 'consumes', 'extends', 'methods', 'fields',
      'name', 'type', 'optional', 'root', 'contains', 'containedBy',
      'schema', 'mimeTypes', 'sourceFile', 'targetFile',
      'true', 'false'
    ],
    
    operators: [
      '->', '@', '::', '<:', '%', '!', '&', '&!', '~', '~>',
      '<-', '$<', '$', '=>', '>', '<', '+', '*', '-', ':'
    ],
    
    // Simple tokenizer - no complex regex with capture groups
    tokenizer: {
      root: [
        // Comments
        [/#.*$/, 'comment'],
        
        // Keywords
        [/\b(?:program|file|function|class|dto|component|constants|asset|dependency|runParameter)\b/, 'keyword'],
        [/\b(?:entryPoint|version|path|imports|exports|signature|description|input|output|calls|affects|consumes|extends|methods|fields|name|type|optional|root|contains|containedBy|schema|mimeTypes|sourceFile|targetFile)\b/, 'keyword'],
        
        // Strings - simplified pattern
        [/"[^"]*"/, 'string'],
        [/"[^"]*$/, 'string.invalid'],
        
        // Numbers
        [/\d+\.\d+/, 'number.float'],
        [/\d+/, 'number'],
        
        // Simple operators
        [/->/, 'operator'],
        [/@/, 'operator'],
        [/::/, 'operator'],
        [/<:/, 'operator'],
        [/%/, 'operator'],
        [/!/, 'operator'],
        [/&!/, 'operator'],
        [/&/, 'operator'],
        [/~>/, 'operator'],
        [/~/, 'operator'],
        [/<-/, 'operator'],
        [/\$</, 'operator'],
        [/\$/, 'operator'],
        [/=>/, 'operator'],
        [/>/, 'operator'],
        [/</, 'operator'],
        [/:/, 'operator'],
        
        // Type identifiers (capitalized words)
        [/\b[A-Z]\w*\b/, 'type'],
        
        // Identifiers
        [/\b\w+\b/, 'identifier'],
        
        // Brackets
        [/[{}()\[\]]/, '@brackets'],
        
        // Whitespace
        [/[ \t\r\n]+/, 'white']
      ]
    }
  });

  // Define theme
  monaco.editor.defineTheme('typedmind-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '608B4E' },
      { token: 'keyword', foreground: 'C586C0' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'operator', foreground: 'D4D4D4' },
      { token: 'type', foreground: '4EC9B0' },
      { token: 'identifier', foreground: 'D4D4D4' }
    ],
    colors: {}
  });
}

// Default examples
//
// Defect fix (typed-mind-lang#125): the previous longform default used
// `fields: [ {...}, {...} ]` (a JSON-style array of objects) — not a syntax
// the longform grammar recognizes for DTO fields (dto_fields_block only
// supports the named-block form, `fields: { name: { type, description } }`)
// — and `entryPoint:` instead of the real `entry:` property key
// (longform-builder.ts's applyProperties reads `entry` only). Both produced
// 11 diagnostics on first load, before any user action. This rewrite is
// verified (scratchpad check-single-toggle.mjs, not committed) to parse with
// zero diagnostics and to stay at zero visible diagnostics through
// longform -> shortform -> longform, exercising: a longform TypeDef enum
// (`typedef TodoStatus { variant: enum, members: [...] }` / shortform
// `TodoStatus = enum [...]`), a structured DTO field block referencing that
// TypeDef by name (`status: { type: "TodoStatus" }`), a Class with a real
// method (TodoService/createTodo, so the demo covers more than DTOs alone),
// and one `suppress` line demonstrating the suppression surface
// (LegacyTodoDraft would otherwise be a genuine orphaned-entity error).
const TYPEDMIND_EXAMPLES = {
  longform: `# Longform syntax is for humans
program TodoApp {
  entry: models
  version: 1.0.0
}

# Data Models
file models {
  path: models.ts
  imports: [TodoService]
  exports: [Todo, CreateTodoInput, TodoService]
}

typedef TodoStatus {
  variant: enum
  members: [Active, Done, Archived]
}

dto Todo {
  description: "Todo entity"
  fields: {
    id: {
      type: "string"
      description: "Unique identifier"
    }
    title: {
      type: "string"
      description: "Todo title"
    }
    status: {
      type: "TodoStatus"
      description: "Current lifecycle state"
    }
    createdAt: {
      type: "Date"
      description: "Creation timestamp"
    }
  }
}

dto CreateTodoInput {
  description: "Input for creating a todo"
  fields: {
    title: {
      type: "string"
      description: "Todo title"
    }
  }
}

class TodoService {
  methods: [createTodo]
}

function createTodo {
  signature: (input: CreateTodoInput) => Todo
  description: "Creates a new todo item"
  input: CreateTodoInput
  output: Todo
}

dto LegacyTodoDraft {
  description: "Retained for a downstream migration script, not referenced here"
}

suppress LegacyTodoDraft checker/orphaned-entity "consumed only by the one-time migration script"`,

  shortform: `# Shortform syntax is for LLMs
TodoApp -> models v1.0.0

models @ models.ts:
  <- [TodoService]
  -> [Todo, CreateTodoInput, TodoService]

TodoStatus = enum [Active, Done, Archived]

Todo % "Todo entity"
  - id: string "Unique identifier"
  - title: string "Todo title"
  - status: TodoStatus "Current lifecycle state"
  - createdAt: Date "Creation timestamp"

CreateTodoInput % "Input for creating a todo"
  - title: string "Todo title"

TodoService <:
  => [createTodo]

createTodo :: (input: CreateTodoInput) => Todo
  "Creates a new todo item"
  <- CreateTodoInput
  -> Todo

LegacyTodoDraft % "Retained for a downstream migration script, not referenced here"

suppress LegacyTodoDraft checker/orphaned-entity "consumed only by the one-time migration script"`
};

// Parser integration and validation
let parser = null;
let lastValidationTimeout = null;
let currentParseResult = null; // Store the latest parse result for language providers

// Module scripts (typedmind-browser-init.js) run deferred relative to this
// classic script, so `typedmind-ready` may fire before or after this file's
// own DOMContentLoaded handler runs. Resolve once either the global is
// already set (event already fired) or the event arrives, then re-run
// whatever depends on the parser being ready.
function whenTypedMindBrowserReady(callback) {
  if (typeof window.typedMindBrowser !== 'undefined') {
    callback();
    return;
  }
  window.addEventListener('typedmind-ready', callback, { once: true });
}

function initializeParser() {
  console.log('Initializing parser, window.typedMindBrowser available:', typeof window.typedMindBrowser !== 'undefined');
  if (typeof window.typedMindBrowser !== 'undefined') {
    parser = window.typedMindBrowser;
    console.log('TypedMind browser parser initialized successfully:', parser);
  } else {
    console.warn('TypedMind browser parser not available yet');
    console.log('Available globals:', Object.keys(window).filter(k => k.includes('TypedMind') || k.includes('parser')));
  }
}

// entities arrives as a list (ParseOutcome.entities), not the legacy Map —
// build a name -> entity lookup once per parse for the hover/definition/
// completion providers below, which all look entities up by name.
function entityMapFrom(entities) {
  const map = new Map();
  for (const entity of entities) {
    map.set(entity.name, entity);
  }
  return map;
}

function validateCode(editor) {
  console.log('validateCode called, parser available:', !!parser);
  if (!parser) {
    console.log('No parser available for validation');
    return;
  }

  clearTimeout(lastValidationTimeout);
  lastValidationTimeout = setTimeout(() => {
    const code = editor.getValue();
    console.log('Checking code:', code.substring(0, 100) + '...');
    const result = parser.check(code);
    console.log('Check result:', result);

    // Store the result for language providers. entities/links come from a
    // separate parse() call (check() only returns valid+diagnostics) — same
    // source text, so this is the same document's entity list.
    const parsed = parser.parse(code);
    currentParseResult = { ...parsed, entities: entityMapFrom(parsed.entities) };
    console.log('Stored parse result for language providers');

    // Clear existing markers
    monaco.editor.setModelMarkers(editor.getModel(), 'typedmind', []);

    // typed-mind-lang#125 audit finding: a diagnostic carrying `.suppression`
    // (RFC-TM-8 §8, I-10 "suppressed-not-silenced") is intentionally excluded
    // from the error count that drives `check()`'s `valid` flag, but this
    // file used to paint it as a live red squiggle + Problems-panel error
    // regardless — the opposite of what an author who wrote a `suppress`
    // line wants to see. A document using `suppress` (the playground's own
    // default document showcases it) should read as clean, not as "1 error,
    // but don't worry about it." Filtering here, not in the parser/checker:
    // the diagnostic still exists and still carries its suppression record
    // for any consumer that wants it (e.g. a future "suppressed" panel) —
    // this is a display-layer decision, matching typed-mind.ts/browser.ts's
    // own `valid` semantics.
    const activeDiagnostics = (result.diagnostics || []).filter((diagnostic) => diagnostic.suppression === undefined);

    // Add error and warning markers. Diagnostic spans are 1-based
    // {start,end}.{line,column} (ast/span.ts); Monaco markers want the same
    // 1-based line/column convention directly, unlike the legacy
    // {line, column} + synthetic +10 end-column the regex parser emitted.
    if (activeDiagnostics.length > 0) {
      const markers = activeDiagnostics.map(diagnostic => ({
        severity: diagnostic.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Error,
        message: diagnostic.message,
        startLineNumber: diagnostic.span.start.line,
        startColumn: diagnostic.span.start.column,
        endLineNumber: diagnostic.span.end.line,
        endColumn: diagnostic.span.end.column
      }));

      monaco.editor.setModelMarkers(editor.getModel(), 'typedmind', markers);
    } else {
      monaco.editor.setModelMarkers(editor.getModel(), 'typedmind', []);
    }

    // Update problems panel (adapts diagnostic shape to the panel's
    // {message, line, column, severity} expectation).
    updateProblemsPanel(activeDiagnostics.map(diagnostic => ({
      message: diagnostic.message,
      line: diagnostic.span.start.line,
      column: diagnostic.span.start.column,
      severity: diagnostic.severity
    })));

    // Update AST panel
    updateASTPanel(currentParseResult);

  }, 500); // Debounce validation
}

function updateProblemsPanel(errors) {
  const problemsList = document.getElementById('problemsList');
  if (!problemsList) return;
  
  if (errors.length === 0) {
    problemsList.innerHTML = `
      <div class="no-problems">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>No problems detected</span>
      </div>
    `;
  } else {
    const problemsHtml = errors.map(error => {
      const isWarning = error.severity === 'warning';
      const icon = isWarning ? '⚠️' : '❌';
      const cssClass = isWarning ? 'warning' : 'error';
      
      return `
        <div class="problem-item">
          <div class="problem-icon ${cssClass}">${icon}</div>
          <div class="problem-content">
            <div class="problem-message">${error.message}</div>
            <div class="problem-location">Line ${error.line}, Column ${error.column}</div>
          </div>
        </div>
      `;
    }).join('');
    
    problemsList.innerHTML = problemsHtml;
  }
}

function updateASTPanel(result) {
  const astOutput = document.getElementById('astOutput');
  if (!astOutput) return;

  const entities = Array.from(result.entities.values());
  const astData = {
    entities: entities.map(entity => ({
      name: entity.name,
      type: entity.kind,
      position: entity.span ? entity.span.start : undefined,
      properties: Object.fromEntries(
        Object.entries(entity).filter(([key]) =>
          !['name', 'kind', 'span', 'raw', 'comment', 'sourceForm'].includes(key)
        )
      )
    })),
    imports: result.imports
  };

  astOutput.textContent = JSON.stringify(astData, null, 2);
}

// Language service providers
function registerLanguageProviders(monaco, editor) {
  if (!monaco.languages) {
    console.error('Monaco languages API not available');
    return;
  }
  console.log('registerLanguageProviders called with editor:', !!editor);
  
  // Ensure TypedMind language is registered before adding providers
  const languages = monaco.languages.getLanguages();
  const typedMindLanguage = languages.find(lang => lang.id === 'typedmind');
  if (!typedMindLanguage) {
    console.error('TypedMind language not registered, cannot add providers');
    return;
  }
  
  // Hover Provider
  console.log('Registering TypedMind hover provider for language:', typedMindLanguage.id);
  const hoverProvider = monaco.languages.registerHoverProvider('typedmind', {
    provideHover: function(model, position) {
      const word = model.getWordAtPosition(position);
      
      if (!word) {
        // Check for operators at the current position
        const lineContent = model.getLineContent(position.lineNumber);
        const operatorInfo = getOperatorAtPosition(lineContent, position.column);
        
        if (operatorInfo) {
          return {
            range: new monaco.Range(
              position.lineNumber,
              operatorInfo.startColumn,
              position.lineNumber,
              operatorInfo.endColumn
            ),
            contents: [
              { value: operatorInfo.hoverContent, supportHtml: true, isTrusted: true }
            ]
          };
        }
        return null;
      }
      
      // First check if it's a keyword
      const keywordInfo = getKeywordHoverInfo(word.word);
      
      if (keywordInfo) {
        return {
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn
          ),
          contents: [
            { value: keywordInfo, supportHtml: true, isTrusted: true }
          ]
        };
      }
      
      // Then check parsed entities
      if (currentParseResult && currentParseResult.entities) {
        const entity = currentParseResult.entities.get(word.word);
        
        if (entity) {
          const hoverContent = buildHoverContent(entity);
          
          return {
            range: new monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            ),
            contents: [
              { value: hoverContent, supportHtml: true, isTrusted: true }
            ]
          };
        }
      }
      
      return null;
    }
  });
  console.log('TypedMind hover provider registered successfully');
  
  // Completion Provider
  monaco.languages.registerCompletionItemProvider('typedmind', {
    triggerCharacters: ['-', '<', '@', ':', '~', '!', '=', '#', ' '],
    provideCompletionItems: function(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };
      
      const suggestions = getCompletionSuggestions(model, position, range);
      return { suggestions };
    }
  });
  
  // Definition Provider
  monaco.languages.registerDefinitionProvider('typedmind', {
    provideDefinition: function(model, position) {
      if (!currentParseResult || !currentParseResult.entities) return null;
      
      const word = model.getWordAtPosition(position);
      if (!word) return null;
      
      const entity = currentParseResult.entities.get(word.word);
      if (!entity || !entity.span) return null;

      return {
        uri: model.uri,
        range: new monaco.Range(
          entity.span.start.line,
          1,
          entity.span.start.line,
          100
        )
      };
    }
  });
  
  // Signature Help Provider
  monaco.languages.registerSignatureHelpProvider('typedmind', {
    signatureHelpTriggerCharacters: ['(', ','],
    provideSignatureHelp: function(model, position) {
      // For function signature help
      const lineContent = model.getLineContent(position.lineNumber);
      const match = lineContent.match(/signature:\s*"([^"]+)"/); 
      
      if (match) {
        return {
          value: {
            signatures: [{
              label: match[1],
              documentation: 'Function signature',
              parameters: []
            }],
            activeSignature: 0,
            activeParameter: 0
          },
          dispose: function() {}
        };
      }
      
      return null;
    }
  });
}

function getKeywordHoverInfo(keyword) {
  const keywordInfo = {
    // Entity types
    'program': '**program** - Defines the root program entity\n\nDefines a top-level application or system with entry points and version information.',
    'file': '**file** - Defines a file or module\n\nRepresents a source code file with imports, exports, and implementation details.',
    'function': '**function** - Defines a function or method\n\nRepresents a callable function with input/output parameters and side effects.',
    'class': '**class** - Defines a class or type\n\nRepresents an object-oriented class with methods, fields, and inheritance.',
    'dto': '**dto** - Defines a Data Transfer Object\n\nRepresents a data structure for transferring information between layers.',
    'component': '**component** - Defines a UI component\n\nRepresents a user interface component with properties and relationships.',
    'constants': '**constants** - Defines constant values\n\nRepresents a collection of immutable values used throughout the system.',
    'asset': '**asset** - Defines a static asset\n\nRepresents static files like images, documents, or other resources.',
    'dependency': '**dependency** - Defines an external dependency\n\nRepresents an external library, service, or system dependency.',
    'runParameter': '**runParameter** - Defines runtime parameters\n\nRepresents configuration values that can be set at runtime.',
    
    // Properties
    'entryPoint': '**entryPoint** - Entry point specification\n\nDefines the main entry point for program execution.',
    'version': '**version** - Version specification\n\nSpecifies the version number of the entity.',
    'path': '**path** - File path specification\n\nSpecifies the file system path for the entity.',
    'imports': '**imports** - Import declarations\n\nLists the dependencies imported by this entity.',
    'exports': '**exports** - Export declarations\n\nLists the items exported by this entity.',
    'signature': '**signature** - Function signature\n\nDefines the input and output types for a function.',
    'description': '**description** - Entity description\n\nProvides a human-readable description of the entity.',
    'input': '**input** - Function input\n\nSpecifies the input parameters for a function.',
    'output': '**output** - Function output\n\nSpecifies the return type for a function.',
    'calls': '**calls** - Function calls\n\nLists the functions called by this function.',
    'affects': '**affects** - Side effects\n\nLists the entities affected by this function.',
    'consumes': '**consumes** - Resource consumption\n\nLists the resources consumed by this function.',
    'extends': '**extends** - Inheritance\n\nSpecifies the parent class or interface.',
    'methods': '**methods** - Class methods\n\nLists the methods defined in this class.',
    'fields': '**fields** - Data fields\n\nLists the fields or properties of this entity.',
    'name': '**name** - Entity name\n\nSpecifies the name identifier for this entity.',
    'type': '**type** - Type specification\n\nSpecifies the data type for this field or parameter.',
    'optional': '**optional** - Optional flag\n\nIndicates whether this field or parameter is optional.',
    'root': '**root** - Root component flag\n\nIndicates whether this is a root-level UI component.',
    'contains': '**contains** - Component containment\n\nLists the child components contained by this component.',
    'containedBy': '**containedBy** - Parent container\n\nSpecifies the parent component that contains this component.',
    'schema': '**schema** - Data schema\n\nDefines the structure and validation rules for data.',
    'mimeTypes': '**mimeTypes** - MIME type specification\n\nSpecifies the supported MIME types for assets.',
    'sourceFile': '**sourceFile** - Source file reference\n\nReferences the original source file.',
    'targetFile': '**targetFile** - Target file reference\n\nReferences the output or target file.',
    
    // Boolean values
    'true': '**true** - Boolean true value',
    'false': '**false** - Boolean false value'
  };
  
  return keywordInfo[keyword] || null;
}

function getOperatorAtPosition(lineContent, column) {
  const operators = [
    { pattern: '->', description: '**->** - Entry point or export operator\n\nDefines entry points for programs or exports for files.' },
    { pattern: '<-', description: '**<-** - Import operator\n\nDefines dependencies or imports from other entities.' },
    { pattern: '@', description: '**@** - Location/path operator\n\nSpecifies file paths or locations for entities.' },
    { pattern: '::', description: '**::** - Function signature operator\n\nDefines function signatures with input and output types.' },
    { pattern: '<:', description: '**<:** - Extends operator\n\nDefines inheritance relationships between classes.' },
    { pattern: '~>', description: '**~>** - Function calls operator\n\nSpecifies which functions are called by this function.' },
    { pattern: '&!', description: '**&!** - Root UI component operator\n\nDefines a root-level UI component.' },
    { pattern: '&', description: '**&** - UI component operator\n\nDefines a UI component.' },
    { pattern: '%', description: '**%** - DTO operator\n\nDefines a Data Transfer Object.' },
    { pattern: '!', description: '**!** - Constants operator\n\nDefines constant values.' },
    { pattern: '=>', description: '**=>** - Methods operator\n\nDefines class methods.' },
    { pattern: '~', description: '**~** - Asset operator\n\nDefines static assets.' },
    { pattern: '^', description: '**^** - Dependency operator\n\nDefines external dependencies.' },
    { pattern: '$<', description: '**$<** - Run parameter import\n\nImports runtime parameters.' },
    { pattern: '$', description: '**$** - Run parameter operator\n\nDefines runtime parameters.' },
    { pattern: ':', description: '**:** - Type annotation\n\nSeparates names from types in field definitions.' }
  ];
  
  // Sort by length (longest first) to match multi-character operators first
  operators.sort((a, b) => b.pattern.length - a.pattern.length);
  
  for (const op of operators) {
    const startPos = column - op.pattern.length;
    const endPos = column;
    
    if (startPos >= 0 && lineContent.substring(startPos, endPos) === op.pattern) {
      return {
        startColumn: startPos + 1, // Monaco uses 1-based column indexing
        endColumn: endPos + 1,
        hoverContent: op.description
      };
    }
    
    // Also check if cursor is right after the operator
    const nextStartPos = column;
    const nextEndPos = column + op.pattern.length;
    
    if (nextEndPos <= lineContent.length && lineContent.substring(nextStartPos, nextEndPos) === op.pattern) {
      return {
        startColumn: nextStartPos + 1,
        endColumn: nextEndPos + 1,
        hoverContent: op.description
      };
    }
  }
  
  return null;
}

function buildHoverContent(entity) {
  const parts = [`**${entity.kind}**: ${entity.name}`];
  
  if (entity.comment) {
    parts.push(`💬 *${entity.comment}*`);
  }
  
  if (entity.description) {
    parts.push(`**Description**: ${entity.description}`);
  }
  
  if (entity.path) {
    parts.push(`**Path**: ${entity.path}`);
  }
  
  if (entity.signature) {
    parts.push(`**Signature**: \`${entity.signature}\``);
  }
  
  if (entity.purpose) {
    parts.push(`**Purpose**: ${entity.purpose}`);
  }
  
  if (entity.imports && entity.imports.length > 0) {
    parts.push(`**Imports**: ${entity.imports.join(', ')}`);
  }
  
  if (entity.exports && entity.exports.length > 0) {
    parts.push(`**Exports**: ${entity.exports.join(', ')}`);
  }
  
  if (entity.calls && entity.calls.length > 0) {
    parts.push(`**Calls**: ${entity.calls.join(', ')}`);
  }
  
  // DTO-specific information
  if (entity.kind === 'DTO' && entity.fields && entity.fields.length > 0) {
    const fieldList = entity.fields.map(field => {
      const optional = field.optional ? ' *(optional)*' : '';
      const desc = field.description ? ` - ${field.description}` : '';
      return `• \`${field.name}: ${field.type}\`${optional}${desc}`;
    }).join('\n');
    parts.push(`**Fields**:\n${fieldList}`);
  }
  
  // Function-specific information
  if (entity.kind === 'Function') {
    if (entity.input) {
      parts.push(`**Input**: ${entity.input}`);
    }
    if (entity.output) {
      parts.push(`**Output**: ${entity.output}`);
    }
    if (entity.affects && entity.affects.length > 0) {
      parts.push(`**Affects**: ${entity.affects.join(', ')}`);
    }
    if (entity.consumes && entity.consumes.length > 0) {
      parts.push(`**Consumes**: ${entity.consumes.join(', ')}`);
    }
  }
  
  // UIComponent-specific information
  if (entity.kind === 'UIComponent') {
    if (entity.root) {
      parts.push(`**Root Component**: ✓`);
    }
    if (entity.contains && entity.contains.length > 0) {
      parts.push(`**Contains**: ${entity.contains.join(', ')}`);
    }
    if (entity.containedBy && entity.containedBy.length > 0) {
      parts.push(`**Contained By**: ${entity.containedBy.join(', ')}`);
    }
  }
  
  return parts.join('\n\n');
}

function getCompletionSuggestions(model, position, range) {
  const suggestions = [];
  
  // Entity types
  const entityTypes = [
    { label: 'program', detail: 'Define a program', kind: monaco.languages.CompletionItemKind.Keyword },
    { label: 'file', detail: 'Define a file', kind: monaco.languages.CompletionItemKind.Keyword },
    { label: 'function', detail: 'Define a function', kind: monaco.languages.CompletionItemKind.Keyword },
    { label: 'class', detail: 'Define a class', kind: monaco.languages.CompletionItemKind.Keyword },
    { label: 'dto', detail: 'Define a DTO', kind: monaco.languages.CompletionItemKind.Keyword },
    { label: 'component', detail: 'Define a UI component', kind: monaco.languages.CompletionItemKind.Keyword },
    { label: 'constants', detail: 'Define constants', kind: monaco.languages.CompletionItemKind.Keyword },
    { label: 'asset', detail: 'Define an asset', kind: monaco.languages.CompletionItemKind.Keyword },
    { label: 'dependency', detail: 'Define a dependency', kind: monaco.languages.CompletionItemKind.Keyword }
  ];
  
  // Operators with descriptions
  const operators = [
    { label: '->', detail: 'Entry point or export operator', kind: monaco.languages.CompletionItemKind.Operator },
    { label: '<-', detail: 'Import operator', kind: monaco.languages.CompletionItemKind.Operator },
    { label: '@', detail: 'Location/path operator', kind: monaco.languages.CompletionItemKind.Operator },
    { label: '::', detail: 'Function signature operator', kind: monaco.languages.CompletionItemKind.Operator },
    { label: '~>', detail: 'Function calls operator', kind: monaco.languages.CompletionItemKind.Operator },
    { label: '<:', detail: 'Extends operator', kind: monaco.languages.CompletionItemKind.Operator },
    { label: '!', detail: 'Constants operator', kind: monaco.languages.CompletionItemKind.Operator },
    { label: '=>', detail: 'Methods operator', kind: monaco.languages.CompletionItemKind.Operator },
    { label: '%', detail: 'DTO operator', kind: monaco.languages.CompletionItemKind.Operator },
    { label: '~', detail: 'Asset operator', kind: monaco.languages.CompletionItemKind.Operator },
    { label: '&', detail: 'UIComponent operator', kind: monaco.languages.CompletionItemKind.Operator },
    { label: '&!', detail: 'Root UIComponent operator', kind: monaco.languages.CompletionItemKind.Operator },
    { label: '^', detail: 'Dependency operator', kind: monaco.languages.CompletionItemKind.Operator }
  ];
  
  // Add entity types and operators
  suggestions.push(...entityTypes.map(item => ({ ...item, range })));
  suggestions.push(...operators.map(item => ({ ...item, range })));
  
  // Add existing entity references if we have parse results
  if (currentParseResult && currentParseResult.entities) {
    for (const [name, entity] of currentParseResult.entities) {
      suggestions.push({
        label: name,
        detail: `${entity.kind}: ${name}`,
        kind: getCompletionItemKind(entity.kind),
        range
      });
    }
  }
  
  return suggestions;
}

function getCompletionItemKind(entityType) {
  switch (entityType) {
    case 'Program':
      return monaco.languages.CompletionItemKind.Module;
    case 'File':
      return monaco.languages.CompletionItemKind.File;
    case 'Function':
      return monaco.languages.CompletionItemKind.Function;
    case 'Class':
      return monaco.languages.CompletionItemKind.Class;
    case 'Constants':
      return monaco.languages.CompletionItemKind.Constant;
    case 'DTO':
      return monaco.languages.CompletionItemKind.Interface;
    case 'Asset':
      return monaco.languages.CompletionItemKind.File;
    case 'UIComponent':
      return monaco.languages.CompletionItemKind.Class;
    case 'RunParameter':
      return monaco.languages.CompletionItemKind.Property;
    case 'Dependency':
      return monaco.languages.CompletionItemKind.Module;
    default:
      return monaco.languages.CompletionItemKind.Variable;
  }
}

// Initialize editor
window.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    if (typeof require === 'undefined') {
      console.error('Monaco loader not available');
      return;
    }
    
    require.config({ 
      paths: { 'vs': 'vendor/monaco/vs' }
    });

    require(['vs/editor/editor.main'], function() {
      console.log('Monaco loaded, creating editor...');

      // Initialize parser once the browser build has finished loading —
      // may already be ready (typedmind-ready already fired) or may resolve
      // later, in which case the initial validation below re-runs once it does.
      whenTypedMindBrowserReady(function() {
        initializeParser();
        if (window.typedMindEditor) {
          validateCode(window.typedMindEditor);
        }
      });

      // Register language first
      registerTypedMindLanguage(monaco);
      console.log('TypedMind language registered');
      
      const container = document.getElementById('monaco-editor');
      if (!container) {
        console.error('Container not found');
        return;
      }
      
      // Ensure container has height
      if (container.offsetHeight === 0) {
        container.style.height = '500px';
      }
      
      // Create editor
      try {
        const editor = monaco.editor.create(container, {
          value: TYPEDMIND_EXAMPLES.longform,
          language: 'typedmind',
          theme: 'typedmind-dark',
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'JetBrains Mono, monospace',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          hover: {
            enabled: true,
            delay: 300,
            sticky: true
          }
        });
        
        console.log('Editor created successfully');
        window.typedMindEditor = editor;
        window.editor = editor; // Also store as window.editor for compatibility
        
        // Register language providers AFTER creating editor
        registerLanguageProviders(monaco, editor);
        console.log('Language providers registered after editor creation');
        
        // Enable hover and check if it's working
        const model = editor.getModel();
        console.log('Editor model language:', model.getLanguageId());
        
        // Set up content change validation
        editor.onDidChangeModelContent(() => {
          validateCode(editor);
        });
        
        // Initial validation
        validateCode(editor);
        
        // Handle syntax toggle
        document.querySelectorAll('.syntax-toggle .toggle-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const currentActive = document.querySelector('.syntax-toggle .toggle-btn.active');
            const currentSyntax = currentActive ? currentActive.getAttribute('data-syntax') : 'longform';
            const targetSyntax = btn.getAttribute('data-syntax');
            
            // Don't do anything if we're clicking the already active button
            if (currentSyntax === targetSyntax) return;
            
            document.querySelectorAll('.syntax-toggle .toggle-btn').forEach(function(b) {
              b.classList.remove('active');
            });
            btn.classList.add('active');

            // toggle-fidelity audit (2026-08-31): the toggle's primary path is
            // the real SyntaxEmitter via window.typedMindBrowser.toggleFormat,
            // reading the editor's own live text (not the stale entity map
            // from the last validateCode() pass) so an unsaved edit toggles
            // correctly. Falls back to the static examples ONLY when the
            // browser runtime itself isn't ready yet (there is no other way
            // to show anything). A genuinely empty document or a conversion
            // error are handled explicitly below — neither injects the
            // default sample (typed-mind-lang#128: an empty document used to
            // come back as the full default Todo-app sample with no
            // confirmation; typed-mind-lang#126: an emitter refusal, e.g. an
            // unresolved Program entry point, used to be caught here and
            // ALSO silently replaced with the default sample instead of
            // telling the user their toggle failed).
            if (window.typedMindEditor && window.typedMindBrowser) {
              const currentSource = window.typedMindEditor.getValue();

              // #128: an empty (or whitespace-only) document has nothing to
              // convert. Stay empty — never substitute unrelated content for
              // what the user had (which, for an empty editor, was nothing).
              if (currentSource.trim() === '') {
                window.typedMindEditor.setValue('');
                updateProblemsPanel([]);
                return;
              }

              try {
                const detected = window.typedMindBrowser.detectFormat(currentSource);
                const currentDetectedForm = detected.format === 'mixed' ? currentSyntax : detected.format;
                let convertedCode;
                if (currentDetectedForm === targetSyntax) {
                  // Document is already fully in the target form (or the
                  // button re-selects the form the toggle already produced);
                  // re-emit that exact form instead of calling toggleFormat
                  // (which always flips relative to detectFormat's verdict).
                  convertedCode = targetSyntax === 'longform'
                    ? window.typedMindBrowser.emitLongform(currentSource)
                    : window.typedMindBrowser.emitShortform(currentSource);
                } else {
                  convertedCode = window.typedMindBrowser.toggleFormat(currentSource);
                }
                window.typedMindEditor.setValue(convertedCode);
              } catch (error) {
                // #126/#128: the emitter refused the conversion (e.g. a
                // Program with an unresolved entry point — emit-shortform.ts
                // throws rather than emit a corrupted line) or some other
                // conversion failure. Leave the editor's existing content
                // untouched and surface the failure loudly instead of
                // silently swapping in the default sample.
                console.warn('Syntax conversion failed:', error);
                updateProblemsPanel([{
                  message: `Could not convert to ${targetSyntax}: ${error && error.message ? error.message : error}`,
                  line: 1,
                  column: 1,
                  severity: 'error'
                }]);
                document.querySelectorAll('.syntax-toggle .toggle-btn').forEach(function(b) {
                  b.classList.remove('active');
                });
                currentActive.classList.add('active');
              }
            } else {
              // Fallback to examples only because the browser runtime isn't
              // ready yet — there is no live parser to convert with, and an
              // empty/placeholder editor at this point is not user content.
              if (TYPEDMIND_EXAMPLES[targetSyntax]) {
                window.typedMindEditor.setValue(TYPEDMIND_EXAMPLES[targetSyntax]);
              }
            }
          });
        });
        
        // Handle example selector
        const exampleSelect = document.getElementById('exampleSelect');
        if (exampleSelect) {
          exampleSelect.addEventListener('change', function(e) {
            if (e.target.value && window.PLAYGROUND_EXAMPLES && window.PLAYGROUND_EXAMPLES[e.target.value]) {
              const currentSyntax = document.querySelector('.syntax-toggle .toggle-btn.active').getAttribute('data-syntax') || 'longform';
              const example = window.PLAYGROUND_EXAMPLES[e.target.value][currentSyntax];
              if (example && window.typedMindEditor) {
                window.typedMindEditor.setValue(example);
              }
            }
          });
        }
        
        // Handle tab switching
        document.querySelectorAll('.tab-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            const tabName = btn.getAttribute('data-tab');
            
            // Update active tab button
            document.querySelectorAll('.tab-btn').forEach(function(b) {
              b.classList.remove('active');
            });
            btn.classList.add('active');
            
            // Update active tab content
            document.querySelectorAll('.tab-content').forEach(function(content) {
              content.classList.remove('active');
            });
            const targetTab = document.getElementById(tabName + '-tab');
            if (targetTab) {
              targetTab.classList.add('active');
            }
          });
        });
        
        // Add test functions for debugging
        window.testHover = function() {
          console.log('Testing hover functionality...');
          if (window.typedMindEditor) {
            const model = window.typedMindEditor.getModel();
            const position = { lineNumber: 2, column: 1 }; // Second line should have "program"
            console.log('Testing hover at position:', position);
            
            // Test if hover provider is registered
            const providers = monaco.languages.getLanguages();
            console.log('Available languages:', providers.map(l => l.id));
            
            // Test manual hover
            const word = model.getWordAtPosition(position);
            console.log('Word at test position:', word);
            
            // Try to manually call hover provider
            if (word) {
              console.log('Manually calling hover provider...');
              const hoverProvider = {
                provideHover: function(model, position) {
                  console.log('Manual hover test called');
                  return {
                    range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                    contents: [{ value: '**TEST**: This is a test hover' }]
                  };
                }
              };
              const result = hoverProvider.provideHover(model, position);
              console.log('Manual hover result:', result);
            }
            
            // Test by positioning cursor and triggering hover
            window.typedMindEditor.setPosition(position);
            setTimeout(() => {
              window.typedMindEditor.trigger('keyboard', 'editor.action.showHover');
            }, 500);
            
          } else {
            console.log('Editor not available');
          }
        };
        
        window.testParser = function() {
          console.log('Testing parser functionality...');
          console.log('window.typedMindBrowser available:', typeof window.typedMindBrowser !== 'undefined');
          console.log('Parser instance:', parser);
          console.log('Current parse result:', currentParseResult);

          if (parser) {
            // Test longform syntax
            const longformCode = `program TodoApp {
  entryPoint: models
  version: "1.0.0"
}

file models {
  path: "models.ts"
  exports: [Todo, CreateTodoInput]
}

dto Todo {
  description: "Todo entity"
  fields: [
    { name: "id", type: "string", description: "Unique identifier" },
    { name: "title", type: "string", description: "Todo title" }
  ]
}`;
            console.log('Testing longform parse with:', longformCode);
            const longformResult = parser.parse(longformCode);
            console.log('Longform parse result:', longformResult);
            console.log('Longform entities found:', longformResult.entities.length);

            // Test shortform syntax
            const shortformCode = `TodoApp -> models v1.0.0

models @ models.ts:
  -> [Todo, CreateTodoInput]

Todo % "Todo entity"
  - id: string "Unique identifier"
  - title: string "Todo title"`;
            console.log('Testing shortform parse with:', shortformCode);
            const shortformResult = parser.parse(shortformCode);
            console.log('Shortform parse result:', shortformResult);
            console.log('Shortform entities found:', shortformResult.entities.length);
          }
        };
        
        // Setup URL synchronization AFTER editor is created
        setupUrlSync();
        
      } catch (error) {
        console.error('Failed to create editor:', error);
      }
    });
  }, 100);
});

// URL synchronization functionality
function setupUrlSync() {
  if (!window.editor) {
    console.warn('Editor not available for URL sync');
    return;
  }
  
  let updateTimeout;
  let isLoadingFromUrl = false;
  
  // Function to update URL
  function updateUrl() {
    if (isLoadingFromUrl) return;
    
    const code = window.editor.getValue();
    const compressed = LZString.compressToEncodedURIComponent(code);
    const newUrl = `${window.location.origin}${window.location.pathname}?code=${compressed}`;
    
    // Update URL without triggering page reload
    window.history.replaceState(null, '', newUrl);
  }
  
  // Listen for editor changes with debouncing
  window.editor.onDidChangeModelContent(() => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(updateUrl, 500); // Update URL 500ms after user stops typing
  });
  
  // Load code from URL on page load
  const urlParams = new URLSearchParams(window.location.search);
  const compressedCode = urlParams.get('code');
  if (compressedCode) {
    try {
      isLoadingFromUrl = true;
      const code = LZString.decompressFromEncodedURIComponent(compressedCode);
      if (code) {
        window.editor.setValue(code);
      }
    } catch (error) {
      console.error('Failed to load code from URL:', error);
    } finally {
      isLoadingFromUrl = false;
    }
  }
  
  // Listen for browser back/forward navigation
  window.addEventListener('popstate', (event) => {
    const urlParams = new URLSearchParams(window.location.search);
    const compressedCode = urlParams.get('code');
    if (compressedCode) {
      try {
        isLoadingFromUrl = true;
        const code = LZString.decompressFromEncodedURIComponent(compressedCode);
        if (code) {
          window.editor.setValue(code);
        }
      } catch (error) {
        console.error('Failed to load code from URL:', error);
      } finally {
        isLoadingFromUrl = false;
      }
    }
  });
  
  // Remove/hide share button since URL is always up to date
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) {
    shareBtn.style.display = 'none';
  }
  
  // Hide share modal if it exists
  const shareModal = document.getElementById('shareModal');
  if (shareModal) {
    shareModal.style.display = 'none';
  }
}

// LZString compression library (minified)
var LZString=function(){var r=String.fromCharCode,o="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",e={};function t(r,o){if(!e[r]){e[r]={};for(var n=0;n<r.length;n++)e[r][r.charAt(n)]=n}return e[r][o]}var i={compressToBase64:function(r){if(null==r)return"";var n=i._compress(r,6,function(r){return o.charAt(r)});switch(n.length%4){default:case 0:return n;case 1:return n+"===";case 2:return n+"==";case 3:return n+"="}},decompressFromBase64:function(r){return null==r?"":""==r?null:i._decompress(r.length,32,function(n){return t(o,r.charAt(n))})},compressToUTF16:function(o){return null==o?"":i._compress(o,15,function(o){return r(o+32)})+" "},decompressFromUTF16:function(r){return null==r?"":""==r?null:i._decompress(r.length,16384,function(o){return r.charCodeAt(o)-32})},compressToUint8Array:function(r){for(var o=i.compress(r),n=new Uint8Array(2*o.length),e=0,t=o.length;e<t;e++){var s=o.charCodeAt(e);n[2*e]=s>>>8,n[2*e+1]=s%256}return n},decompressFromUint8Array:function(o){if(null==o)return i.decompress(o);for(var n=new Array(o.length/2),e=0,t=n.length;e<t;e++)n[e]=256*o[2*e]+o[2*e+1];var s=[];return n.forEach(function(o){s.push(r(o))}),i.decompress(s.join(""))},compressToEncodedURIComponent:function(r){return null==r?"":i._compress(r,6,function(r){return n.charAt(r)})},decompressFromEncodedURIComponent:function(r){return null==r?"":""==r?null:(r=r.replace(/ /g,"+"),i._decompress(r.length,32,function(o){return t(n,r.charAt(o))}))},compress:function(o){return i._compress(o,16,function(o){return r(o)})},_compress:function(r,o,n){if(null==r)return"";var e,t,i,s={},u={},a="",p="",c="",l=2,f=3,h=2,d=[],m=0,v=0;for(i=0;i<r.length;i+=1)if(a=r.charAt(i),Object.prototype.hasOwnProperty.call(s,a)||(s[a]=f++,u[a]=!0),p=c+a,Object.prototype.hasOwnProperty.call(s,p))c=p;else{if(Object.prototype.hasOwnProperty.call(u,c)){if(c.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==o-1?(v=0,d.push(n(m)),m=0):v++;for(t=c.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;e<h;e++)m=m<<1|t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=c.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}0==--l&&(l=Math.pow(2,h),h++),delete u[c]}else for(t=s[c],e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;0==--l&&(l=Math.pow(2,h),h++),s[p]=f++,c=String(a)}if(""!==c){if(Object.prototype.hasOwnProperty.call(u,c)){if(c.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==o-1?(v=0,d.push(n(m)),m=0):v++;for(t=c.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;e<h;e++)m=m<<1|t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=c.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}0==--l&&(l=Math.pow(2,h),h++),delete u[c]}else for(t=s[c],e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;0==--l&&(l=Math.pow(2,h),h++)}for(t=2,e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;for(;;){if(m<<=1,v==o-1){d.push(n(m));break}v++}return d.join("")},decompress:function(r){return null==r?"":""==r?null:i._decompress(r.length,32768,function(o){return r.charCodeAt(o)})},_decompress:function(o,n,e){var t,i,s,u,a,p,c,l=[],f=4,h=4,d=3,m="",v=[],g={val:e(0),position:n,index:1};for(t=0;t<3;t+=1)l[t]=t;for(s=0,a=Math.pow(2,2),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;switch(s){case 0:for(s=0,a=Math.pow(2,8),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;c=r(s);break;case 1:for(s=0,a=Math.pow(2,16),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;c=r(s);break;case 2:return""}for(l[3]=c,i=c,v.push(c);;){if(g.index>o)return"";for(s=0,a=Math.pow(2,d),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;switch(c=s){case 0:for(s=0,a=Math.pow(2,8),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;l[h++]=r(s),c=h-1,f--;break;case 1:for(s=0,a=Math.pow(2,16),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;l[h++]=r(s),c=h-1,f--;break;case 2:return v.join("")}if(0==f&&(f=Math.pow(2,d),d++),l[c])m=l[c];else{if(c!==h)return null;m=i+i.charAt(0)}v.push(m),l[h++]=i+m.charAt(0),i=m,0==--f&&(f=Math.pow(2,d),d++)}}};return i}();