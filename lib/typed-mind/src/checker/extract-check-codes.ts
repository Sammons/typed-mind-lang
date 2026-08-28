// RFC-TM-8 §9 (rfc-tm-8-diamond.md, X-SUPP-7) — the corpus-level extractor
// backing the stability test (check-codes.test.ts). Greps every `code: '...'`
// literal across src/checker/ and src/pipeline/ (doc §9's stated mechanism)
// PLUS two site shapes a literal-only grep would silently miss, which would
// make the stability test blind to exactly the kind of drift it exists to
// catch:
//   - the template-literal shape (`checker/${slot}-dto-not-found` /
//     `checker/${slot}-not-dto` in check-function-graph.ts, closed over
//     `slot: 'input' | 'output'`);
//   - the named-constant shape (apply-suppressions.ts's `code:
//     STALE_SUPPRESSION_CODE` / `code: META_SUPPRESSION_CODE`, resolved
//     per-file against that same file's own `const NAME = 'literal'`
//     bindings — the constant and its usage always live in the same module
//     in this codebase, so a per-file resolution pass is sufficient without
//     a full cross-module symbol table).
//
// This is a static source scan, not a runtime code-path exercise: it reads
// .ts source text directly so the registry can be verified without running
// every check against a corpus large enough to trigger every finding kind.
// This module and check-codes.ts itself are excluded from the scanned file
// list (via EXTRACTOR_EXCLUDED_FILENAMES below) — both contain check-code
// STRINGS as data (comments, the registry, deliberately-named example
// strings), not emission sites, and would otherwise self-match.
//
// Directories are caller-supplied rather than self-located via
// `import.meta.url`: this module builds under the package's `commonjs`
// tsconfig (lib/typed-mind/tsconfig.json), which does not enable the
// `import.meta` meta-property (TS1343) — only test files (excluded from that
// build, run directly via `node --test`'s native ESM stripping) can safely
// use it. check-codes.test.ts supplies the real checker/pipeline paths.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Plain string-literal sites: `code: 'foo/bar'` (single or double quoted).
const LITERAL_CODE_RE = /\bcode:\s*['"]([a-zA-Z]+\/[a-zA-Z0-9-]+)['"]/g;

// The one known template-literal shape: `code: \`checker/${slot}-SUFFIX\`.
// Captures the suffix half so the caller can cross the two known `slot`
// values ('input' | 'output', check-function-graph.ts's closed union).
const SLOT_TEMPLATE_CODE_RE = /\bcode:\s*`checker\/\$\{slot\}([a-zA-Z0-9-]+)`/g;
const KNOWN_SLOT_VALUES = ['input', 'output'] as const;

// A `code: IDENTIFIER` site (bare reference to a module-local constant,
// e.g. `code: STALE_SUPPRESSION_CODE`), resolved against CONST_BINDING_RE
// below within the same file's text.
const CODE_IDENTIFIER_RE = /\bcode:\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*[,}]/g;
const CONST_BINDING_RE = /\bconst\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*(?::\s*[^=]+)?=\s*['"]([a-zA-Z]+\/[a-zA-Z0-9-]+)['"]/g;

const EXTRACTOR_EXCLUDED_FILENAMES = new Set(['extract-check-codes.ts', 'check-codes.ts']);

const listTsFilesIn = (dir: string): string[] => {
  return readdirSync(dir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') && !EXTRACTOR_EXCLUDED_FILENAMES.has(entry.name),
    )
    .map((entry) => join(dir, entry.name));
};

// Resolves this one file's `const NAME = 'literal'` bindings so
// `code: NAME` sites can be looked up.
const buildConstBindings = (text: string): Map<string, string> => {
  const bindings = new Map<string, string>();
  for (const match of text.matchAll(CONST_BINDING_RE)) {
    const name = match[1];
    const value = match[2];
    if (name !== undefined && value !== undefined) {
      bindings.set(name, value);
    }
  }
  return bindings;
};

// Scans exactly the given directories (in production use: src/checker/*.ts
// and src/pipeline/*.ts, doc §9's named directories), excluding test files —
// production emission sites only.
export const extractCheckCodes = (directories: readonly string[]): string[] => {
  const files = directories.flatMap((directory) => listTsFilesIn(directory));
  const codes = new Set<string>();

  for (const file of files) {
    const text = readFileSync(file, 'utf8');

    for (const match of text.matchAll(LITERAL_CODE_RE)) {
      const code = match[1];
      if (code !== undefined) {
        codes.add(code);
      }
    }

    for (const match of text.matchAll(SLOT_TEMPLATE_CODE_RE)) {
      const suffix = match[1];
      if (suffix === undefined) {
        continue;
      }
      for (const slot of KNOWN_SLOT_VALUES) {
        codes.add(`checker/${slot}${suffix}`);
      }
    }

    const constBindings = buildConstBindings(text);
    for (const match of text.matchAll(CODE_IDENTIFIER_RE)) {
      const identifier = match[1];
      const resolved = identifier === undefined ? undefined : constBindings.get(identifier);
      if (resolved !== undefined) {
        codes.add(resolved);
      }
    }
  }

  return [...codes].sort();
};
