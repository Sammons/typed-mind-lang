#!/usr/bin/env node
// The build-is-reproducible gate — the LAST step of `validate`.
//
// Every other check in `validate` asserts something about content. This one asserts
// something about the BUILD: running the full pipeline over a clean checkout must
// not modify a single tracked file. If it does, some step's output disagrees with
// what is committed, which means a fresh clone and a developer's tree disagree
// about what the repo builds — the exact failure that let the bundled grammar.wasm
// copies sit at bytes no pinned toolchain reproduces.
//
// This is deliberately broader than any single artifact check. check:generated
// covers the tree-sitter src/ + CST wrappers + grammar.md, check:bundled-wasm covers
// the tracked bundled wasm copies; this catches the next tracked build output that
// nobody thought to write a dedicated gate for.
//
// Scope: MODIFIED / DELETED / RENAMED TRACKED files only. Untracked files are
// ignored on purpose — builds legitimately drop untracked output (dist/,
// dist-bundled/cli.cjs, *.tsbuildinfo, the gitignored grammar.wasm) all over the
// tree, and failing on those would make the gate useless noise rather than signal.
// Staged-but-uncommitted changes are also reported, because a `validate` run that
// leaves the index dirty is the same reproducibility problem wearing a different
// hat.

import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

class CleanTreeCheckError extends Error {}

const run = (command, args, options = {}) => {
  return execFileSync(command, args, { encoding: 'utf8', cwd: REPO_ROOT, ...options });
};

const main = () => {
  // --porcelain=v1 gives the stable two-character XY status prefix. '??' is
  // untracked and '!!' is ignored (not emitted without --ignored); everything else
  // describes a tracked path that moved relative to HEAD.
  const status = run('git', ['status', '--porcelain=v1']);

  const dirtyTrackedEntries = status
    .split('\n')
    .filter((line) => line.trim() !== '')
    .filter((line) => {
      const statusCode = line.slice(0, 2);
      return statusCode !== '??' && statusCode !== '!!';
    });

  if (dirtyTrackedEntries.length > 0) {
    throw new CleanTreeCheckError(
      `the build modified tracked files — it is not reproducible from a clean checkout:\n` +
        dirtyTrackedEntries.map((entry) => `  ${entry}`).join('\n') +
        `\n\n  A tracked file that the build rewrites means the committed bytes disagree with\n` +
        `  what this toolchain produces. Either commit the regenerated output, or make the\n` +
        `  step that writes it stop writing into a tracked path.\n` +
        `\n  Inspect the drift with:\n` +
        `    git diff --stat\n` +
        `    git diff -- <path>\n`,
    );
  }

  console.log('[check:clean-tree] no tracked files modified by the build (OK)');
  console.log('[check:clean-tree] PASS');
};

try {
  main();
} catch (error) {
  if (error instanceof CleanTreeCheckError) {
    console.error(`[check:clean-tree] FAIL: ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`[check:clean-tree] FAIL: ${error.message}`);
    if (error.stdout) {
      console.error(error.stdout.toString());
    }
    if (error.stderr) {
      console.error(error.stderr.toString());
    }
  } else {
    console.error('[check:clean-tree] FAIL: unknown error', error);
  }
  process.exit(1);
}
