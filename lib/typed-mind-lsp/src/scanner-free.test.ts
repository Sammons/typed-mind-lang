// RFC-TM-5 §1 (rfc-tm-5-diamond.md) — "a grep check asserts
// lib/typed-mind-lsp/src/ contains no name-class regex" (the I-2 LSP-half
// exit). The four private scanners this RFC retires each hand-rolled a
// character class restating the grammar's name class: the semantic-token
// word regex (legacy server.ts:603, `/\b([A-Za-z][A-Za-z0-9@/_-]*)\b/g`),
// isEntityNameChar (legacy server.ts:565-569,
// `/[a-zA-Z0-9\-_/]/`), and isWordBoundary (legacy server.ts:571-574,
// `/[\s[\],<>@:~!=#-]/`). NameOccurrenceIndex reads name boundaries from the
// CST (entity_name/list_entry spans) instead — the grammar's name class is
// now the only definition.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const srcDir = dirname(fileURLToPath(import.meta.url));

// Character-class regex literals shaped like a hand-rolled identifier/name
// scanner: a bracket class built from letter/digit/word-boundary-punctuation
// ranges. Test source files are excluded — fixtures legitimately construct
// small regexes to assert against parsed output, not to scan raw text for
// names.
const NAME_CLASS_SHAPES = [/\[a-zA-Z0-9\\-_\/]/, /\[a-zA-Z0-9@\/_-]/, /\\b\(\[A-Za-z]/, /\[\\s\[\],<>@:~!=#-]/];

const listProductionSourceFiles = (dir: string): string[] => {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listProductionSourceFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
};

describe('scanner-free (RFC-TM-5 §1, I-2 LSP-half exit)', () => {
  it('no production source file under lib/typed-mind-lsp/src contains a hand-rolled name-class regex', () => {
    const files = listProductionSourceFiles(srcDir);
    for (const file of files) {
      const contents = readFileSync(file, 'utf8');
      for (const shape of NAME_CLASS_SHAPES) {
        assert.doesNotMatch(contents, shape, `${file} reintroduces a hand-rolled name-class regex matching ${shape}`);
      }
    }
  });
});
