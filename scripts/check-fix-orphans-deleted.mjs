#!/usr/bin/env node
// RFC-TM-4 §3 (rfc-tm-4-diamond.md, S-CONS-CLI-1) — fix-orphans.cjs (repo root)
// had zero live references (grep-verified) and was deleted in the flip PR.
// Named CI check per the doc's stated check binding: `test ! -f fix-orphans.cjs`.

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FIX_ORPHANS_PATH = join(REPO_ROOT, 'fix-orphans.cjs');

if (existsSync(FIX_ORPHANS_PATH)) {
  console.error(
    `[check:fix-orphans-deleted] FAIL: ${FIX_ORPHANS_PATH} exists — RFC-TM-4 §3 (S-CONS-CLI-1) deletes it in the flip and this check enforces it stays deleted.`,
  );
  process.exit(1);
}
console.log('[check:fix-orphans-deleted] PASS — fix-orphans.cjs is absent');
