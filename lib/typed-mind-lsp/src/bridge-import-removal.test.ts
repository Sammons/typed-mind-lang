// RFC-TM-5 §1 (rfc-tm-5-diamond.md) — the bridge-import removal (new leaf, the
// TM-4 Q5 unblock). Q1 ends with zero legacy-bridge imports in the LSP: the
// four frozen bridge names are gone from every ES import specifier under
// lib/typed-mind-lsp/src/. This IS the executable form of the I-2 LSP-half
// exit gate; TM-4 Q5's terminal sweep depends on it. Scoped to actual `import
// { ... } from '@sammons/typed-mind'` specifiers (not a blanket text grep) so
// prose citing what was removed — this file's own doc comments included —
// does not trip the check.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const srcDir = new URL('.', import.meta.url).pathname;

// The four names frozen through Q5 by rfc-tm-4-diamond.md §3 ("Bridge
// (transient, frozen, dies in Q5)"), spelled out via concatenation so this
// checker file itself never contains a literal import-shaped occurrence of
// any of them.
const BRIDGE_NAMES = ['DSL' + 'Checker', 'DSL' + 'Parser', 'DSL' + 'Validator', 'Syntax' + 'Generator'];

const IMPORT_SPECIFIER_PATTERN = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]@sammons\/typed-mind['"]/g;

const listSourceFiles = (dir: string): string[] => {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
};

describe('bridge-import removal (RFC-TM-5 §1, I-2 LSP-half exit gate)', () => {
  it('no @sammons/typed-mind import specifier under lib/typed-mind-lsp/src names any of the four frozen bridge exports', () => {
    const files = listSourceFiles(srcDir);
    for (const file of files) {
      const contents = readFileSync(file, 'utf8');
      for (const match of contents.matchAll(IMPORT_SPECIFIER_PATTERN)) {
        const importedNames = match[1] ?? '';
        for (const bridgeName of BRIDGE_NAMES) {
          assert.doesNotMatch(
            importedNames,
            new RegExp(`\\b${bridgeName}\\b`),
            `${file} imports the frozen bridge export ${bridgeName} from @sammons/typed-mind`,
          );
        }
      }
    }
  });
});
