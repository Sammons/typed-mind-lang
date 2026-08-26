#!/usr/bin/env node
// RFC-TM-7 §3 (rfc-tm-7-diamond.md, S-CI-2) — the npm-pack tarball assertion.
//
// prepack (lib/typed-mind/package.json) already chains build-wasm.mjs and
// stage-published-wasm.mjs, and stage-published-wasm.mjs throws on a missing
// source wasm or a zero-byte copy. That guards the STAGING step. It does not
// guard the packaging step: a `files` array or `.npmignore` misconfiguration
// can still produce a tarball that omits grammar.wasm even though prepack
// staged it correctly on disk — a distinct failure mode from a failed stage.
//
// This script runs `npm pack --dry-run` (via pnpm's --dir, so pnpm invokes the
// package's own npm pack under the hood) against lib/typed-mind, parses the
// JSON file listing it emits, and asserts grammar.wasm is present. A
// wasm-less tarball becomes impossible at two layers: prepack throws first;
// this check catches a bypass of prepack (e.g. `npm publish --ignore-scripts`
// or a `files` misconfiguration that silently drops a staged file).

import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CORE_PACKAGE_DIR = join(REPO_ROOT, 'lib', 'typed-mind');
const REQUIRED_ENTRY = 'grammar.wasm';

class PackCheckError extends Error {}

const run = (command, args, options = {}) => {
  return execFileSync(command, args, { encoding: 'utf8', cwd: REPO_ROOT, ...options });
};

const main = () => {
  // --json on `pnpm pack --dry-run` prints the tarball's file listing without
  // writing a .tgz. pnpm's own prepack-hook output (build-wasm.mjs,
  // stage-published-wasm.mjs) lands on stdout ahead of the JSON, so this
  // finds the line where the JSON object opens and parses from there rather
  // than assuming the whole stdout is clean JSON. Note this is pnpm's own
  // `{ name, version, filename, files }` object shape, not npm's raw
  // `npm pack --json` array-of-one-object shape — pnpm does not simply
  // forward npm's pack output verbatim.
  const output = run('pnpm', ['--dir', CORE_PACKAGE_DIR, 'pack', '--dry-run', '--json']);

  const jsonStart = output.indexOf('\n{');
  if (jsonStart === -1 && !output.trimStart().startsWith('{')) {
    throw new PackCheckError(`could not find a JSON object in \`pnpm pack --dry-run --json\` output:\n${output}`);
  }
  const jsonText = jsonStart === -1 ? output : output.slice(jsonStart + 1);

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new PackCheckError(`failed to parse JSON from \`pnpm pack --dry-run --json\` output: ${error.message}\n${output}`);
  }
  if (!Array.isArray(parsed?.files)) {
    throw new PackCheckError(`unexpected \`pnpm pack --json\` shape (expected a top-level object with a .files array):\n${output}`);
  }

  const entries = parsed.files.map((entry) => entry.path);
  const hasWasm = entries.some((entryPath) => entryPath === REQUIRED_ENTRY);
  if (!hasWasm) {
    throw new PackCheckError(
      `${REQUIRED_ENTRY} is missing from the @sammons/typed-mind tarball. ` +
        `Tarball contained:\n${entries.map((entryPath) => `  - ${entryPath}`).join('\n')}\n` +
        `Check the "files" array in ${join(CORE_PACKAGE_DIR, 'package.json')} and prepack's staging step.`,
    );
  }
  console.log(`[check:pack] ${REQUIRED_ENTRY} present in tarball (${entries.length} files total)`);
  console.log('[check:pack] PASS');
};

try {
  main();
} catch (error) {
  if (error instanceof PackCheckError) {
    console.error(`[check:pack] FAIL: ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`[check:pack] FAIL: ${error.message}`);
    if (error.stdout) {
      console.error(error.stdout.toString());
    }
    if (error.stderr) {
      console.error(error.stderr.toString());
    }
  } else {
    console.error('[check:pack] FAIL: unknown error', error);
  }
  process.exit(1);
}
