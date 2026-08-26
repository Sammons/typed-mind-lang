#!/usr/bin/env node
// RFC-TM-4 §3 (rfc-tm-4-diamond.md) — regenerates scripts/legacy-freeze-manifest.json
// from the current contents of the frozen legacy engine files. Run this ONLY as
// part of the documented exception procedure (RFC-TM-4 §3): a scoped, justified
// review PLUS a re-run of the shadow-verdict harness over the 142 documents
// proving equivalence still holds. Never run this to silence a failing
// check:legacy-freeze without following that procedure — the manifest is the
// enforcement mechanism, not a suggestion.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FROZEN_LEGACY_FILES, MANIFEST_PATH } from './legacy-freeze-files.mjs';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const sha256Of = (absolutePath) => {
  return createHash('sha256').update(readFileSync(absolutePath)).digest('hex');
};

const manifest = {
  $comment:
    'RFC-TM-4 §3 (rfc-tm-4-diamond.md) legacy-freeze manifest. sha256 per file over the frozen bridge-engine set. ' +
    'Update ONLY via the documented exception procedure: a scoped, justified review AND a re-run of the shadow-verdict ' +
    'harness over the 142 documents proving equivalence still holds. See scripts/check-legacy-freeze.mjs.',
  files: Object.fromEntries(FROZEN_LEGACY_FILES.map((relativePath) => [relativePath, sha256Of(join(REPO_ROOT, relativePath))])),
};

writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`[generate-legacy-freeze-manifest] wrote ${MANIFEST_PATH} (${FROZEN_LEGACY_FILES.length} files)`);
