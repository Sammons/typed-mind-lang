// RFC-TM-5 §1 leaf b check binding — "an integration test spawns the built
// dist/cli.js over stdio, sends initialize and an immediate
// textDocument/hover, and asserts a correct non-error response." This is the
// race-guard proof: startServer() awaits TypedMind.create() (one wasm load)
// before connection.listen() ever runs, so the very first request the
// connection sees cannot observe an uninitialized parser. A naive synchronous
// bootstrap would either crash on the first request or hang past the wasm
// load; this test sends hover immediately after didOpen with no delay.

import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..');
const repoRoot = join(packageDir, '..', '..');
const cliPath = join(packageDir, 'dist', 'cli.js');

interface JsonRpcMessage {
  readonly jsonrpc: '2.0';
  readonly id?: number;
  readonly method?: string;
  readonly params?: unknown;
  readonly result?: unknown;
  readonly error?: unknown;
}

const frame = (message: JsonRpcMessage): string => {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`;
};

// Minimal LSP-over-stdio client: buffers stdout, splits on Content-Length
// framing, resolves a promise per response id. No vscode-jsonrpc dependency —
// the wire format is small enough to hand-roll for a test harness (per the
// repo's dependency-minimalism stance).
class StdioLspClient {
  private readonly child: ReturnType<typeof spawn>;
  private buffer = '';
  private nextId = 1;
  private readonly pending = new Map<number, { resolve: (message: JsonRpcMessage) => void }>();

  constructor(child: ReturnType<typeof spawn>) {
    this.child = child;
    this.child.stdout?.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString('utf8');
      this.drain();
    });
  }

  private drain(): void {
    for (;;) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) {
        return;
      }
      const header = this.buffer.slice(0, headerEnd);
      const lengthMatch = /Content-Length: (\d+)/.exec(header);
      if (lengthMatch?.[1] === undefined) {
        return;
      }
      const contentLength = Number.parseInt(lengthMatch[1], 10);
      const bodyStart = headerEnd + 4;
      if (this.buffer.length < bodyStart + contentLength) {
        return;
      }
      const body = this.buffer.slice(bodyStart, bodyStart + contentLength);
      this.buffer = this.buffer.slice(bodyStart + contentLength);
      const message = JSON.parse(body) as JsonRpcMessage;
      if (typeof message.id === 'number') {
        this.pending.get(message.id)?.resolve(message);
        this.pending.delete(message.id);
      }
    }
  }

  request(method: string, params: unknown): Promise<JsonRpcMessage> {
    const id = this.nextId++;
    const responsePromise = new Promise<JsonRpcMessage>((resolve) => {
      this.pending.set(id, { resolve });
    });
    this.child.stdin?.write(frame({ jsonrpc: '2.0', id, method, params }));
    return responsePromise;
  }

  notify(method: string, params: unknown): void {
    this.child.stdin?.write(frame({ jsonrpc: '2.0', method, params }));
  }
}

describe('TypedMindLanguageServer (built dist layout, stdio race guard)', () => {
  it('answers initialize then an immediate hover with a correct non-error response', async () => {
    // Ensure dist/ reflects current sources; tsc --build is incremental.
    execFileSync(join(repoRoot, 'node_modules', '.bin', 'tsc'), ['--build'], { cwd: packageDir, encoding: 'utf8' });

    // --stdio tells vscode-languageserver's createConnection to bind
    // process.stdin/stdout as the JSON-RPC channel — the same flag the real
    // VS Code extension passes when it spawns this server.
    const child = spawn(process.execPath, [cliPath, '--stdio'], { stdio: ['pipe', 'pipe', 'pipe'] });
    const stderrChunks: string[] = [];
    child.stderr?.on('data', (chunk: Buffer) => stderrChunks.push(chunk.toString('utf8')));
    const client = new StdioLspClient(child);

    try {
      const initializeResponse = await client.request('initialize', { processId: process.pid, rootUri: null, capabilities: {} });
      assert.equal(initializeResponse.error, undefined);
      const initResult = initializeResponse.result as { capabilities?: { hoverProvider?: boolean } } | undefined;
      assert.equal(initResult?.capabilities?.hoverProvider, true);

      client.notify('initialized', {});

      const uri = 'file:///race-guard.tmd';
      const text = 'AppEntry @ src/index.ts:\n  -> [start]\n';
      client.notify('textDocument/didOpen', { textDocument: { uri, languageId: 'typedmind', version: 1, text } });

      // Immediate hover — no delay, no waiting for a settle event. If the
      // async race guard were missing, this request could race the wasm load
      // and either throw inside the handler or return against an
      // uninitialized parser.
      const hoverResponse = await client.request('textDocument/hover', { textDocument: { uri }, position: { line: 0, character: 1 } });
      assert.equal(hoverResponse.error, undefined, `hover returned an error: ${JSON.stringify(hoverResponse.error)}`);
      const hoverResult = hoverResponse.result as { contents?: { value?: string } } | null;
      assert.notEqual(hoverResult, null);
      assert.match(hoverResult?.contents?.value ?? '', /AppEntry/);
    } finally {
      child.kill();
    }
  });
});
