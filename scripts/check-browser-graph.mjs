#!/usr/bin/env node
// RFC-TM-7 §2 (rfc-tm-7-diamond.md, S-CONS-WEB-1, I-8) — the named I-8
// bundle-analysis gate for the browser build. Reuses the shared
// module-graph-walker (extracted from TM-3's browser-boundary.test.ts
// precursor per this Quantum) against the REAL emitted dist-browser/browser.js
// entry point, rather than the .ts source the precursor test walks. Asserts
// two clauses:
//   (a) no `node:` specifier anywhere in the dist-browser/ graph — the
//       precursor's own check, re-run against the compiled bundle;
//   (b) no bare specifier outside the import-map allowlist (web-tree-sitter)
//       — the clause the precursor does not carry, added here because a
//       browser <script type="module"> import map only resolves specifiers
//       it explicitly lists; any other bare specifier is a runtime 404.
//
// Requires `pnpm --dir lib/typed-mind run build:browser` to have run first
// (dist-browser/ populated) — same precondition as check-pack.mjs needing a
// built dist/.

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walkModuleGraph } from '../lib/typed-mind/src/pipeline/module-graph-walker.ts';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BROWSER_ENTRY = join(REPO_ROOT, 'lib', 'typed-mind', 'dist-browser', 'browser.js');

// The only bare specifier the playground's import map resolves (doc §2):
// web-tree-sitter -> the same-origin vendored web-tree-sitter.js.
const BARE_SPECIFIER_ALLOWLIST = ['web-tree-sitter'];

class BrowserGraphCheckError extends Error {}

const main = () => {
  if (!existsSync(BROWSER_ENTRY)) {
    throw new BrowserGraphCheckError(
      `${BROWSER_ENTRY} does not exist. Run \`pnpm --dir lib/typed-mind run build:browser\` (tsc --build tsconfig.browser.json) before this check.`,
    );
  }

  const report = walkModuleGraph(BROWSER_ENTRY);

  if (report.bannedReaches.length > 0) {
    const lines = report.bannedReaches.map((reach) => `  - ${reach.file} imports ${reach.specifier}`);
    throw new BrowserGraphCheckError(`dist-browser/ graph reaches a banned node: specifier:\n${lines.join('\n')}`);
  }

  const disallowedBares = report.externalSpecifiers.filter((specifier) => !BARE_SPECIFIER_ALLOWLIST.includes(specifier));
  if (disallowedBares.length > 0) {
    throw new BrowserGraphCheckError(
      `dist-browser/ graph reaches bare specifiers outside the import-map allowlist (${BARE_SPECIFIER_ALLOWLIST.join(', ')}): ${disallowedBares.join(', ')}. ` +
        "Every bare specifier the browser bundle imports must resolve through the playground's import map, or the browser 404s at runtime.",
    );
  }

  console.log(`[check:browser-graph] visited ${report.visitedFiles.length} files from ${BROWSER_ENTRY}`);
  console.log(`[check:browser-graph] external specifiers: ${report.externalSpecifiers.join(', ') || '(none)'}`);
  console.log('[check:browser-graph] PASS — zero node: reaches, all bare specifiers allowlisted');
};

try {
  main();
} catch (error) {
  if (error instanceof BrowserGraphCheckError) {
    console.error(`[check:browser-graph] FAIL: ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`[check:browser-graph] FAIL: ${error.message}`);
  } else {
    console.error('[check:browser-graph] FAIL: unknown error', error);
  }
  process.exit(1);
}
