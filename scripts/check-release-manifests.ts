#!/usr/bin/env node
// RFC-TM-7 §3 (rfc-tm-7-diamond.md, S-CI-2) style gate, guarding the release
// path itself rather than a single package's tarball contents.
//
// Three prior releases (@sammons/typed-mind-renderer 0.2.1,
// @sammons/typed-mind-lsp 0.1.8, @sammons/typed-mind-cli 0.1.8) shipped to npm
// with a literal `workspace:*` in their `dependencies` — see
// knowledge/troubleshooting/npm-publish-ships-workspace-protocol.md in the
// claude-home vault. Root cause: `npm publish` copies package.json verbatim
// into the tarball and never rewrites pnpm's workspace protocol; only
// `pnpm publish` (and `pnpm pack`) does that rewrite, at pack time.
//
// This script packs every publishable package the same way `pnpm publish`
// would build its tarball (`pnpm pack --config.ignore-scripts=true`, which
// skips lifecycle scripts the same way `check:pack` does, so this check does
// not require the mise-pinned wasm toolchain to run), extracts the resulting
// `package/package.json`, and asserts:
//   1. no dependencies / peerDependencies / optionalDependencies value starts
//      with `workspace:` (the exact defect the three prior releases hit)
//   2. `publishConfig.access` is `"public"` (an npm publish of an
//      `@sammons/*` scoped package defaults to restricted otherwise, which
//      silently fails or silently ships private)
//
// Version equality across the five packages is already enforced by
// `pnpm run check:version-lockstep` (scripts/check-version-lockstep.mjs) —
// this script does not duplicate that check, it only reports the versions it
// observed in each packed tarball for the success summary line.
//
// Written in TypeScript per this repo's Node 26 native-type-stripping
// convention (erasable syntax only, no transform, run directly via `node`).

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const LIB_DIR = join(REPO_ROOT, 'lib');
const DEPENDENCY_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies'] as const;
const WORKSPACE_PROTOCOL_PREFIX = 'workspace:';
const REQUIRED_PUBLISH_ACCESS = 'public';

class ReleaseManifestError extends Error {}

type PublishedPackage = {
  dir: string;
  packageJsonPath: string;
};

type PackedManifest = {
  name?: unknown;
  version?: unknown;
  dependencies?: unknown;
  peerDependencies?: unknown;
  optionalDependencies?: unknown;
  publishConfig?: unknown;
};

const run = (command: string, args: string[]): string => {
  return execFileSync(command, args, { encoding: 'utf8', cwd: REPO_ROOT });
};

const listPublishablePackages = (): PublishedPackage[] => {
  return readdirSync(LIB_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(LIB_DIR, entry.name))
    .filter((dir) => existsSync(join(dir, 'package.json')))
    .map((dir) => ({ dir, packageJsonPath: join(dir, 'package.json') }))
    .filter(({ packageJsonPath }) => {
      const parsed = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { private?: unknown };
      return parsed.private !== true;
    });
};

const packToTarball = (packageDir: string, destinationDir: string): string => {
  const output = run('pnpm', ['--dir', packageDir, 'pack', '--config.ignore-scripts=true', '--pack-destination', destinationDir, '--json']);
  const jsonStart = output.indexOf('\n{');
  const jsonText = jsonStart === -1 ? output : output.slice(jsonStart + 1);
  let parsed: { filename?: unknown };
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ReleaseManifestError(`failed to parse \`pnpm pack --json\` output for ${packageDir}: ${message}\n${output}`);
  }
  if (typeof parsed.filename !== 'string' || parsed.filename === '') {
    throw new ReleaseManifestError(`\`pnpm pack --json\` for ${packageDir} did not report a tarball filename:\n${output}`);
  }
  return parsed.filename;
};

const extractPackedManifest = (tarballPath: string): PackedManifest => {
  const raw = run('tar', ['-xOf', tarballPath, 'package/package.json']);
  try {
    return JSON.parse(raw) as PackedManifest;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ReleaseManifestError(`failed to parse package/package.json extracted from ${tarballPath}: ${message}`);
  }
};

const findWorkspaceProtocolLeaks = (manifest: PackedManifest): string[] => {
  const leaks: string[] = [];
  for (const field of DEPENDENCY_FIELDS) {
    const value = manifest[field];
    if (typeof value !== 'object' || value === null) {
      continue;
    }
    for (const [depName, depRange] of Object.entries(value as Record<string, unknown>)) {
      if (typeof depRange === 'string' && depRange.startsWith(WORKSPACE_PROTOCOL_PREFIX)) {
        leaks.push(`${field}.${depName} = "${depRange}"`);
      }
    }
  }
  return leaks;
};

const checkPublishAccess = (manifest: PackedManifest): string | undefined => {
  const publishConfig = manifest.publishConfig;
  const access =
    typeof publishConfig === 'object' && publishConfig !== null ? (publishConfig as Record<string, unknown>)['access'] : undefined;
  if (access !== REQUIRED_PUBLISH_ACCESS) {
    return `publishConfig.access is ${JSON.stringify(access)}, expected ${JSON.stringify(REQUIRED_PUBLISH_ACCESS)}`;
  }
  return undefined;
};

const main = (): void => {
  const packages = listPublishablePackages();
  if (packages.length === 0) {
    throw new ReleaseManifestError(`no publishable (non-private) package.json files found under ${LIB_DIR}`);
  }

  const tmpDir = mkdtempSync(join(tmpdir(), 'check-release-manifests-'));
  try {
    for (const { dir } of packages) {
      const tarballPath = packToTarball(dir, tmpDir);
      const manifest = extractPackedManifest(tarballPath);
      const packageLabel = typeof manifest.name === 'string' ? manifest.name : dir;

      const workspaceLeaks = findWorkspaceProtocolLeaks(manifest);
      if (workspaceLeaks.length > 0) {
        throw new ReleaseManifestError(
          `${packageLabel} would publish with an unresolved workspace protocol dependency ` +
            `(this is the exact defect that broke the last three releases — see ` +
            `knowledge/troubleshooting/npm-publish-ships-workspace-protocol.md):\n` +
            workspaceLeaks.map((leak) => `  - ${leak}`).join('\n') +
            `\nRun \`pnpm publish\` (never \`npm publish\`) from ${dir} — only pnpm rewrites workspace:* at pack time.`,
        );
      }

      const accessProblem = checkPublishAccess(manifest);
      if (accessProblem !== undefined) {
        throw new ReleaseManifestError(
          `${packageLabel}: ${accessProblem}. Set "publishConfig": { "access": "public" } in ${join(dir, 'package.json')}.`,
        );
      }

      console.log(
        `[check:release-manifests] ${packageLabel}@${String(manifest.version)} OK (no workspace: leaks, publishConfig.access=public)`,
      );
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log(
    '[check:release-manifests] version equality across published packages is enforced separately by `pnpm run check:version-lockstep`',
  );
  console.log('[check:release-manifests] PASS');
};

try {
  main();
} catch (error) {
  if (error instanceof ReleaseManifestError) {
    console.error(`[check:release-manifests] FAIL: ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`[check:release-manifests] FAIL: ${error.message}`);
  } else {
    console.error('[check:release-manifests] FAIL: unknown error', error);
  }
  process.exit(1);
}
