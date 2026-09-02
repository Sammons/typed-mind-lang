import * as path from 'node:path';
import { type Diagnostic, TypedMind } from '@sammons/typed-mind';
import { AdvancedTypedMindRenderer } from '@sammons/typed-mind-renderer';
import type * as Vscode from 'vscode';
import { LanguageClient, type LanguageClientOptions, type ServerOptions, TransportKind } from 'vscode-languageclient/node';

// Use require for vscode to avoid __toESM issues
const vscode = require('vscode') as typeof Vscode;

let client: LanguageClient;

export function activate(context: Vscode.ExtensionContext): void {
  const fs = require('node:fs');

  // Try multiple paths for the LSP server module
  // 1. First try the bundled path (packaged extension)
  let serverModule = context.asAbsolutePath(path.join('lsp-bundled', 'cli.cjs'));

  if (!fs.existsSync(serverModule)) {
    // 2. Try the installed package path (production)
    serverModule = context.asAbsolutePath(path.join('node_modules', '@sammons', 'typed-mind-lsp', 'dist', 'cli.js'));
  }

  if (!fs.existsSync(serverModule)) {
    // 3. Try the workspace relative path (development)
    const workspacePath = path.join(__dirname, '..', '..', '..', 'typed-mind-lsp', 'dist', 'cli.js');
    if (fs.existsSync(workspacePath)) {
      serverModule = workspacePath;
    }
  }

  // Verify the server module exists
  if (!fs.existsSync(serverModule)) {
    const errorMsg = `TypedMind LSP server module not found`;
    console.error(errorMsg);
    console.error('Searched paths:', {
      bundled: context.asAbsolutePath(path.join('lsp-bundled', 'cli.cjs')),
      installed: context.asAbsolutePath(path.join('node_modules', '@sammons', 'typed-mind-lsp', 'dist', 'cli.js')),
      workspace: path.join(__dirname, '..', '..', '..', 'typed-mind-lsp', 'dist', 'cli.js'),
    });

    vscode.window.showErrorMessage(errorMsg);
    return;
  }

  // The debug options for the server
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for TypedMind documents
    documentSelector: [{ scheme: 'file', language: 'typedmind' }],
    synchronize: {
      // Notify the server about file changes to '.tmd' files contained in the workspace
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.tmd'),
    },
  };

  // Create the language client and start the client.
  client = new LanguageClient('typedmindLanguageServer', 'TypedMind Language Server', serverOptions, clientOptions);

  // Start the client. This will also launch the server
  client.start().catch((error) => {
    console.error('Failed to start TypedMind Language Server:', error);
    vscode.window.showErrorMessage(`TypedMind Language Server failed to start: ${error.message}`);
  });

  // Register format toggle command
  const toggleFormatCommand = vscode.commands.registerCommand('typedmind.toggleFormat', async () => {
    await handleToggleFormat(client);
  });

  // Register preview command
  const previewCommand = vscode.commands.registerCommand('typedmind.preview', async () => {
    await handlePreview(context);
  });

  // Store subscriptions in the context
  context.subscriptions.push(client, toggleFormatCommand, previewCommand);
}

/**
 * Handle the preview command - renders TypedMind visualization
 */
async function handlePreview(_context: Vscode.ExtensionContext): Promise<void> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showErrorMessage('No active editor found');
    return;
  }

  // Check if this is a TypedMind file
  if (editor.document.languageId !== 'typedmind') {
    vscode.window.showErrorMessage('Preview only works with TypedMind (.tmd) files');
    return;
  }

  // Get the document content
  const content = editor.document.getText();
  const fileName = path.basename(editor.document.fileName);
  const filePath = editor.document.fileName;

  try {
    // RFC-TM-5 §3 Q4 (rfc-tm-5-diamond.md) — the preview consumes the AST
    // surface directly: TypedMind.create() + parse()/check() replace the
    // legacy DSLChecker require, and the renderer's setGraph/setValidationResult
    // entry point (rfc-tm-6-diamond.md §2) replaces setProgramGraph. filePath
    // is passed through so @import-resolved multi-file documents preview
    // correctly, matching the main CLI's --render path (lib/typed-mind-cli/src/cli.ts).
    const typedMind = await TypedMind.create();

    // Parse and validate the TypedMind content
    const { diagnostics } = typedMind.check(content, filePath);
    const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === 'error');

    if (hasErrors) {
      // Show validation errors
      const errorMessages = diagnostics
        .filter((diagnostic) => diagnostic.severity === 'error')
        .map((diagnostic) => `Line ${diagnostic.span.start.line}: ${diagnostic.message}`)
        .join('\n');

      vscode.window.showErrorMessage(`TypedMind validation errors:\n${errorMessages}`);

      // Still allow preview with errors
      const answer = await vscode.window.showWarningMessage('The TypedMind file has validation errors. Preview anyway?', 'Yes', 'No');

      if (answer !== 'Yes') {
        return;
      }
    }

    // Parse the content into a graph
    const graph = typedMind.parse(content, filePath);

    // Create a webview panel
    const panel = vscode.window.createWebviewPanel('typedmindPreview', `TypedMind Preview: ${fileName}`, vscode.ViewColumn.Beside, {
      enableScripts: true,
      retainContextWhenHidden: true,
    });

    // Generate the HTML content using the advanced renderer
    // Note: `enableInteractiveFeatures` was passed here pre-migration but is
    // not (and never was) a member of AdvancedRendererOptions — the legacy
    // `require()` call erased the type, which hid the mistake. Dropped as
    // part of RFC-TM-5 Q4's AST migration (rfc-tm-5-diamond.md §3); the
    // renderer's actual interactive-feature options are its `enable*`
    // fields already listed below plus `enableDeepLinking`, unrelated to the
    // removed key.
    const renderer = new AdvancedTypedMindRenderer({
      enableVirtualization: true,
      enablePatternRecognition: true,
      themePreference: vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ? 'dark' : 'light',
    });

    await renderer.setGraph(graph);
    await renderer.setValidationResult(diagnostics);
    const html = renderer.generateStaticHTML();

    // Set the webview content
    panel.webview.html = html;

    // Update preview when document changes
    const changeSubscription = vscode.workspace.onDidChangeTextDocument((e: Vscode.TextDocumentChangeEvent) => {
      if (e.document === editor.document) {
        // Debounce updates
        if (panel.visible) {
          updatePreview();
        }
      }
    });

    let updateTimeout: NodeJS.Timeout | undefined;
    const updatePreview = () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      updateTimeout = setTimeout(async () => {
        const newContent = editor.document.getText();
        const newGraph = typedMind.parse(newContent, filePath);
        const { diagnostics: newDiagnostics } = typedMind.check(newContent, filePath);
        await renderer.setGraph(newGraph);
        await renderer.setValidationResult(newDiagnostics);
        const newHtml = renderer.generateStaticHTML();
        panel.webview.html = newHtml;
      }, 500); // Debounce for 500ms
    };

    // Clean up subscriptions when panel is closed
    panel.onDidDispose(() => {
      changeSubscription.dispose();
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Preview error:', error);
    vscode.window.showErrorMessage(`TypedMind preview failed: ${errorMessage}`);
  }
}

/**
 * Handle the toggle format command
 */
async function handleToggleFormat(client: LanguageClient): Promise<void> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showErrorMessage('No active editor found');
    return;
  }

  // Check if this is a TypedMind file
  if (editor.document.languageId !== 'typedmind') {
    vscode.window.showErrorMessage('Toggle format only works with TypedMind (.tmd) files');
    return;
  }

  try {
    // Show progress indication
    await vscode.window.withProgress(
      {
        location: { viewId: 'workbench.view.explorer' },
        title: 'Toggling TypedMind format...',
        cancellable: false,
      },
      async (progress: Vscode.Progress<{ message?: string; increment?: number }>) => {
        progress.report({ increment: 0 });

        // Determine if we have a selection or process the entire document
        const selection = editor.selection;
        const hasSelection = !selection.isEmpty;

        let range: { start: number; end: number } | undefined;
        let textRange: Vscode.Range;

        if (hasSelection) {
          // Process only the selected lines
          const startLine = selection.start.line;
          const endLine = selection.end.line;
          range = { start: startLine, end: endLine };
          textRange = new vscode.Range(
            new vscode.Position(startLine, 0),
            new vscode.Position(endLine, editor.document.lineAt(endLine).text.length),
          );
        } else {
          // Process the entire document
          textRange = new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(editor.document.lineCount - 1, editor.document.lineAt(editor.document.lineCount - 1).text.length),
          );
        }

        progress.report({ increment: 30 });

        // Send request to LSP server
        const response = await client.sendRequest<{ newText: string; error?: string; diagnostics?: Diagnostic[] }>(
          'typedmind/toggleFormat',
          {
            uri: editor.document.uri.toString(),
            range: range,
          },
        );

        progress.report({ increment: 70 });

        if (response.error) {
          vscode.window.showErrorMessage(`Format toggle failed: ${response.error}`);
          return;
        }

        // Apply the changes
        const edit = new vscode.WorkspaceEdit();
        edit.replace(editor.document.uri, textRange, response.newText);

        const success = await vscode.workspace.applyEdit(edit);

        if (success) {
          // Preserve cursor position if possible
          if (!hasSelection) {
            // For full document replacement, try to keep cursor at roughly the same line
            const currentLine = Math.min(editor.selection.active.line, editor.document.lineCount - 1);
            const newPosition = new vscode.Position(currentLine, 0);
            editor.selection = new vscode.Selection(newPosition, newPosition);
          }

          // Issue #130, PR #141 review blocker 2 — `response.diagnostics`
          // (emitter/quote-swap warnings, populated via
          // `typedMind.toggleFormatWithDiagnostics` on the server side) was
          // computed and silently dropped here before this fix. Surfaced via
          // `showWarningMessage`, matching the existing pattern this file
          // already uses for one-off command-triggered notices (e.g. the
          // preview command's "validation errors, preview anyway?" warning
          // above) rather than publishing to the Problems panel via
          // `sendDiagnostics`: the `applyEdit` above re-triggers the
          // server's own `validateTextDocument`, which republishes ONLY
          // `typedMind.check(text).diagnostics` (a check-pipeline result
          // that never runs the emitter) and would immediately clear any
          // Problems-panel entry this command tried to publish itself — a
          // one-shot message survives that race, a published diagnostic
          // would not.
          if (response.diagnostics !== undefined && response.diagnostics.length > 0) {
            const summary = response.diagnostics.map((diagnostic) => diagnostic.message).join('\n');
            vscode.window.showWarningMessage(`TypedMind format toggled with warnings:\n${summary}`);
          } else {
            vscode.window.showInformationMessage('TypedMind format toggled successfully');
          }
        } else {
          vscode.window.showErrorMessage('Failed to apply format changes');
        }

        progress.report({ increment: 100 });
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Toggle format error:', error);
    vscode.window.showErrorMessage(`Format toggle failed: ${errorMessage}`);
  }
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
