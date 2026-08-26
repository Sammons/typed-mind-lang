// RFC-TM-3 §4 pin-lockstep test (rfc-tm-3-diamond.md, TM-1 paired-bump
// procedure): web-tree-sitter is exact-pinned in lib/typed-mind/package.json,
// the installed package resolves to that exact version, and both equal the
// mise.toml tree-sitter CLI pin. The three versions bump only together, in the
// single paired-bump PR — a drift in any leg fails here.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..', '..');
const repoRoot = join(packageDir, '..', '..');
const require = createRequire(import.meta.url);

describe('web-tree-sitter / tree-sitter CLI pin lockstep', () => {
  it('version-locks the declared pin, the resolved install, and the mise CLI pin', () => {
    const packageJson: { dependencies?: Record<string, string> } = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
    const declaredPin = packageJson.dependencies?.['web-tree-sitter'];

    const resolvedEntryPoint = require.resolve('web-tree-sitter');
    const resolvedPackageJson: { version: string } = JSON.parse(readFileSync(join(dirname(resolvedEntryPoint), 'package.json'), 'utf8'));

    const miseToml = readFileSync(join(repoRoot, 'mise.toml'), 'utf8');
    const cliPinMatch = miseToml.match(/^tree-sitter\s*=\s*"([^"]+)"/m);

    assert.deepEqual(
      {
        declaredPinIsExact: declaredPin !== undefined && /^\d+\.\d+\.\d+$/.test(declaredPin),
        declaredPin,
        resolvedVersion: resolvedPackageJson.version,
        miseCliPin: cliPinMatch?.[1],
      },
      {
        declaredPinIsExact: true,
        declaredPin: '0.26.13',
        resolvedVersion: '0.26.13',
        miseCliPin: '0.26.13',
      },
    );
  });
});
