#!/usr/bin/env node
// RFC-TM-7 §3 (rfc-tm-7-diamond.md, S-CI-2) — the version-lockstep gate.
//
// The single documented version-bump procedure (RELEASING.md) is
// `version-bump.yml`, which bumps all published packages in lockstep via
// .github/scripts/version-sync.sh. This script is the drift detector: it
// asserts the published packages are ALREADY in lockstep on every PR, not
// only on release day, so a hand-edited package.json (bypassing the
// documented procedure) fails CI immediately instead of surfacing at
// `release.yml`'s "Verify versions match" step, days or weeks later.
//
// "Published" is resolved the same way scripts/check-engines.mjs resolves it
// (RFC-TM-4 §3, S-CORE-3): every non-private package.json directly under
// lib/. Per that doc, the five are core, cli, lsp, renderer, typescript —
// written generically here (not as a hardcoded list) so a future sixth
// published package is caught by construction, same rationale as
// check-engines.mjs. This intentionally excludes the VS Code extension
// (private: true) and the static-website / test-suite dev packages
// (also private): those follow their own release paths
// (vscode-publish.yml / no publish at all) and are not part of the npm
// lockstep version-sync.sh maintains.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const LIB_DIR = join(REPO_ROOT, 'lib');

class VersionLockstepError extends Error {}

const listPublishedPackages = () => {
  return readdirSync(LIB_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(LIB_DIR, entry.name, 'package.json'))
    .filter((packageJsonPath) => existsSync(packageJsonPath))
    .map((packageJsonPath) => {
      const parsed = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      return { path: packageJsonPath, name: parsed.name, version: parsed.version, private: parsed.private === true };
    })
    .filter((pkg) => !pkg.private);
};

const main = () => {
  const packages = listPublishedPackages();
  if (packages.length === 0) {
    throw new VersionLockstepError(`no non-private package.json files found under ${LIB_DIR}`);
  }

  for (const pkg of packages) {
    if (typeof pkg.version !== 'string' || pkg.version === '') {
      throw new VersionLockstepError(`${pkg.path} has no string "version" field`);
    }
  }

  const versions = new Set(packages.map((pkg) => pkg.version));
  if (versions.size > 1) {
    const report = packages.map((pkg) => `  - ${pkg.name} (${pkg.path}): ${pkg.version}`).join('\n');
    throw new VersionLockstepError(
      `published package versions have drifted out of lockstep:\n${report}\n` +
        `Bump all published packages together via the documented procedure in RELEASING.md (the version-bump.yml workflow).`,
    );
  }

  const [{ version }] = packages;
  console.log(`[check:version-lockstep] all ${packages.length} published packages at ${version}:`);
  for (const pkg of packages) {
    console.log(`[check:version-lockstep]   - ${pkg.name}`);
  }
  console.log('[check:version-lockstep] PASS');
};

try {
  main();
} catch (error) {
  if (error instanceof VersionLockstepError) {
    console.error(`[check:version-lockstep] FAIL: ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`[check:version-lockstep] FAIL: ${error.message}`);
  } else {
    console.error('[check:version-lockstep] FAIL: unknown error', error);
  }
  process.exit(1);
}
