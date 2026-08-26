// RFC-TM-5 §3 (rfc-tm-5-diamond.md), goal-scope IE-8 — the vsix must carry the
// bundled LSP server plus both wasm artifacts. Check binding: "vsce package
// --no-dependencies dry-run, unzip the .vsix, assert lsp-bundled/cli.js,
// lsp-bundled/grammar.wasm, and lsp-bundled/web-tree-sitter.wasm are present
// with non-zero sizes (mirroring stage-published-wasm.mjs:30-33's emptiness
// guard)." This test rebuilds lsp-bundled/ (via bundle-lsp) and the extension
// itself before packaging, then reads the packaged .vsix directly (see
// read-vsix-entries.ts) rather than trusting a stale committed .vsix or
// lsp-bundled/ directory.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { readVsixEntries } from './read-vsix-entries.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..');
const vsceBinPath = join(packageDir, 'node_modules', '.bin', 'vsce');
const vsixOutputPath = join(packageDir, 'tm5-q3-packaging-check.vsix');

const REQUIRED_LSP_BUNDLED_FILES = [
  'extension/lsp-bundled/cli.js',
  'extension/lsp-bundled/grammar.wasm',
  'extension/lsp-bundled/web-tree-sitter.wasm',
];

describe('vsix packaging (RFC-TM-5 §3, IE-8)', () => {
  it('carries lsp-bundled/cli.js, grammar.wasm, and web-tree-sitter.wasm with non-zero sizes', () => {
    // bundle-lsp rebuilds the LSP's bundled output (dist-bundled/, incl. both
    // wasms per RFC-TM-5 §2) and copies it to ./lsp-bundled/ — the committed
    // lsp-bundled/cli.js predates this RFC's wasm-copy step and must never be
    // what this check exercises.
    execFileSync('pnpm', ['run', 'bundle-lsp'], { cwd: packageDir, encoding: 'utf8' });

    if (existsSync(vsixOutputPath)) {
      rmSync(vsixOutputPath);
    }
    try {
      execFileSync(vsceBinPath, ['package', '--no-dependencies', '-o', vsixOutputPath], { cwd: packageDir, encoding: 'utf8' });

      const vsixContents = readFileSync(vsixOutputPath);
      const entries = readVsixEntries(vsixOutputPath, vsixContents);
      const entriesByPath = new Map(entries.map((entry) => [entry.path, entry]));

      for (const requiredPath of REQUIRED_LSP_BUNDLED_FILES) {
        const entry = entriesByPath.get(requiredPath);
        assert.notEqual(entry, undefined, `${requiredPath} is missing from the packaged .vsix`);
        assert.ok(entry !== undefined && entry.uncompressedSize > 0, `${requiredPath} is present but has zero uncompressed size`);
        assert.ok(
          entry !== undefined && entry.data.length === entry.uncompressedSize,
          `${requiredPath} decompressed length does not match its declared uncompressed size`,
        );
      }
    } finally {
      if (existsSync(vsixOutputPath)) {
        rmSync(vsixOutputPath);
      }
    }
  });
});
