#!/usr/bin/env node
// RFC-TM-4 §3 (rfc-tm-4-diamond.md) — the legacy-freeze CI guard. The staged
// flip keeps the legacy engine (parser.ts, longform-parser.ts, validator.ts,
// syntax-generator.ts, import-resolver.ts, formatter.ts, parser-patterns.ts,
// grammar-validator.ts) running UNCHANGED behind the bridge for its three
// named consumers (lsp, typescript converter, renderer) through Q5. This
// script hashes the current file contents against the committed manifest and
// fails the build on any drift — the freeze is a CI hash-guard, not prose.
//
// Exception procedure (RFC-TM-4 §3): a manifest update is legitimate ONLY
// after a scoped, justified review AND a re-run of the shadow-verdict harness
// over the 142 documents proving equivalence still holds. Regenerate via
// `node scripts/generate-legacy-freeze-manifest.mjs` as part of that review —
// never as a shortcut to make this check pass.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FROZEN_LEGACY_FILES, MANIFEST_PATH } from './legacy-freeze-files.mjs';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

class LegacyFreezeError extends Error {}

const sha256Of = (absolutePath) => {
  return createHash('sha256').update(readFileSync(absolutePath)).digest('hex');
};

const main = () => {
  if (!existsSync(MANIFEST_PATH)) {
    throw new LegacyFreezeError(`manifest not found at ${MANIFEST_PATH} — run scripts/generate-legacy-freeze-manifest.mjs`);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const manifestFiles = Object.keys(manifest.files).sort();
  const expectedFiles = [...FROZEN_LEGACY_FILES].sort();
  if (JSON.stringify(manifestFiles) !== JSON.stringify(expectedFiles)) {
    throw new LegacyFreezeError(
      `manifest file set does not match the frozen set named in scripts/legacy-freeze-files.mjs.\n` +
        `  manifest: ${manifestFiles.join(', ')}\n` +
        `  expected: ${expectedFiles.join(', ')}`,
    );
  }

  const drifted = [];
  for (const relativePath of FROZEN_LEGACY_FILES) {
    const absolutePath = join(REPO_ROOT, relativePath);
    if (!existsSync(absolutePath)) {
      drifted.push(`${relativePath}: MISSING (was live-referenced in the bridge; RFC-TM-4 §5 gates its deletion on TM-5+TM-6)`);
      continue;
    }
    const actualHash = sha256Of(absolutePath);
    const expectedHash = manifest.files[relativePath];
    if (actualHash !== expectedHash) {
      drifted.push(`${relativePath}: expected ${expectedHash}, got ${actualHash}`);
    }
  }

  if (drifted.length > 0) {
    throw new LegacyFreezeError(
      `legacy engine hash drift detected — RFC-TM-4 §3 (rfc-tm-4-diamond.md) freezes this file set unchanged through Q5:\n` +
        drifted.map((line) => `  - ${line}`).join('\n') +
        `\n\nException procedure: a scoped, justified review AND a re-run of the shadow-verdict harness over the 142 ` +
        `documents proving equivalence still holds, THEN \`node scripts/generate-legacy-freeze-manifest.mjs\` to update the manifest.`,
    );
  }

  console.log(`[check:legacy-freeze] PASS — ${FROZEN_LEGACY_FILES.length} frozen legacy files match the committed manifest`);
};

try {
  main();
} catch (error) {
  if (error instanceof LegacyFreezeError) {
    console.error(`[check:legacy-freeze] FAIL: ${error.message}`);
  } else {
    console.error('[check:legacy-freeze] FAIL:', error);
  }
  process.exit(1);
}
