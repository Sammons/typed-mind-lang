// RFC-TM-5 §2 (rfc-tm-5-diamond.md) — the bundled-cli stdio integration test.
// Check binding: "pnpm run build:bundled runs immediately before an
// integration test that spawns the freshly built dist-bundled/cli.js over
// stdio against a fixture document and asserts diagnostics arrive (proves
// both wasm resolutions in the bundle layout; the committed dist-bundled/
// cli.js is stale and must never be what the test exercises)."
//
// This test rebuilds dist-bundled/ itself (mirroring
// stdio-race-guard.test.ts's own `tsc --build` precondition for dist/) rather
// than trusting a stale committed artifact, then spawns the fresh cli.js and
// runs the same initialize + immediate hover exchange the dev-layout race
// guard test uses — the doc's Q2 check explicitly reuses that dev-layout test
// shape for the bundle layout, proving the ordered wasm-path candidates
// resolve grammar.wasm and web-tree-sitter.wasm correctly when both files sit
// bundle-adjacent to cli.js instead of in the core package's node_modules
// layout.

import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..');
const cliPath = join(packageDir, 'dist-bundled', 'cli.cjs');
// This package's own local bin — pnpm's strict node_modules does not hoist
// devDependency bins to the workspace root, so tsup lives at
// lib/typed-mind-lsp/node_modules/.bin/tsup, not the repo root's .bin/.
const tsupBinPath = join(packageDir, 'node_modules', '.bin', 'tsup');

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

// Minimal LSP-over-stdio client, same shape as stdio-race-guard.test.ts's —
// duplicated rather than shared because each test file owns its fixture
// wiring independently and the class is a handful of lines (no dependency,
// per the repo's dependency-minimalism stance for a hand-rollable wire
// format).
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

describe('TypedMindLanguageServer (bundled dist-bundled/ layout, stdio)', () => {
  it('answers initialize then an immediate hover with a correct non-error response, from a freshly built bundle', async () => {
    // The committed dist-bundled/cli.js is stale (doc §2) — this test rebuilds
    // it before spawning, exactly as the precondition requires. tsup's
    // onSuccess hook (tsup.bundled.config.ts) copies grammar.wasm and
    // web-tree-sitter.wasm bundle-adjacent as part of this build.
    execFileSync(tsupBinPath, ['--config', 'tsup.bundled.config.ts'], { cwd: packageDir, encoding: 'utf8' });

    const child = spawn(process.execPath, [cliPath, '--stdio'], { stdio: ['pipe', 'pipe', 'pipe'] });
    const stderrChunks: string[] = [];
    child.stderr?.on('data', (chunk: Buffer) => stderrChunks.push(chunk.toString('utf8')));
    const client = new StdioLspClient(child);

    try {
      const initializeResponse = await client.request('initialize', { processId: process.pid, rootUri: null, capabilities: {} });
      assert.equal(
        initializeResponse.error,
        undefined,
        `initialize returned an error: ${JSON.stringify(initializeResponse.error)}; stderr: ${stderrChunks.join('')}`,
      );
      const initResult = initializeResponse.result as { capabilities?: { hoverProvider?: boolean } } | undefined;
      assert.equal(initResult?.capabilities?.hoverProvider, true);

      client.notify('initialized', {});

      const uri = 'file:///bundled-stdio.tmd';
      const text = 'AppEntry @ src/index.ts:\n  -> [start]\n';
      client.notify('textDocument/didOpen', { textDocument: { uri, languageId: 'typedmind', version: 1, text } });

      // Immediate hover — no delay. This is the same race-guard proof as the
      // dev-layout test, exercised against the bundled cli.js so the wasm
      // artifacts under test are the ones tsup's onSuccess step just copied
      // bundle-adjacent, not the core package's node_modules layout.
      const hoverResponse = await client.request('textDocument/hover', { textDocument: { uri }, position: { line: 0, character: 1 } });
      assert.equal(
        hoverResponse.error,
        undefined,
        `hover returned an error: ${JSON.stringify(hoverResponse.error)}; stderr: ${stderrChunks.join('')}`,
      );
      const hoverResult = hoverResponse.result as { contents?: { value?: string } } | null;
      assert.notEqual(hoverResult, null);
      assert.match(hoverResult?.contents?.value ?? '', /AppEntry/);
    } finally {
      child.kill();
    }
  });
});
