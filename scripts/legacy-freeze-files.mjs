// RFC-TM-4 §3 (rfc-tm-4-diamond.md) — the frozen legacy-engine file set, shared
// between generate-legacy-freeze-manifest.mjs and check-legacy-freeze.mjs so
// the two scripts can never drift on which files the freeze covers.

import { join } from 'node:path';

export const FROZEN_LEGACY_FILES = [
  'lib/typed-mind/src/parser.ts',
  'lib/typed-mind/src/longform-parser.ts',
  'lib/typed-mind/src/validator.ts',
  'lib/typed-mind/src/syntax-generator.ts',
  'lib/typed-mind/src/import-resolver.ts',
  'lib/typed-mind/src/formatter.ts',
  'lib/typed-mind/src/parser-patterns.ts',
  'lib/typed-mind/src/grammar-validator.ts',
];

export const MANIFEST_PATH = join(import.meta.dirname, 'legacy-freeze-manifest.json');
