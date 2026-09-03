#!/usr/bin/env node
// Worktree-isolation guard — reported against `pnpm run ci` inside a git
// worktree under .claude/worktrees/<slug> (see the PR body for
// fix/ci-worktree-isolation). `pnpm-workspace.yaml`'s `lib/*` glob is
// non-recursive and does not match `.claude/worktrees/<slug>/lib/*`, so `pnpm
// -r` / `--filter` / `--dir` already stay scoped to the current checkout by
// construction (verified empirically: an isolated single-glob-level pnpm
// workspace never lists a package nested three directories deeper under
// .claude/worktrees). The confirmed failure mode was `biome check .` finding
// a NESTED biome.json inside a sibling worktree and erroring with "Found a
// nested root configuration, but there's already a root configuration" —
// fixed by excluding `.claude` in biome.json's `files.includes` (belt) on
// top of `.gitignore`'s `.claude/worktrees/` entry honored via
// `useIgnoreFile: true` (suspenders).
//
// This check is the regression guard for BOTH failure classes at once: it
// asks pnpm itself, at CI time, where every workspace package actually
// lives, and fails loudly if pnpm ever resolves a package outside the
// current repo root — whether that's from a future workspace glob change,
// a pnpm upgrade with different glob semantics, or a `.claude` exclude that
// silently regresses.

import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

class WorkspaceScopeCheckError extends Error {}

const run = (command, args, options = {}) => {
  return execFileSync(command, args, { encoding: 'utf8', cwd: REPO_ROOT, ...options });
};

const listWorkspacePackagePaths = () => {
  const json = run('pnpm', ['-r', 'list', '--depth', '-1', '--json']);
  const packages = JSON.parse(json);
  return packages.map((pkg) => pkg.path);
};

const main = () => {
  const paths = listWorkspacePackagePaths();

  if (paths.length === 0) {
    throw new WorkspaceScopeCheckError('pnpm -r list returned zero workspace packages — the workspace glob is broken');
  }

  const outOfScope = paths.filter((path) => path !== REPO_ROOT && !path.startsWith(`${REPO_ROOT}/`));

  if (outOfScope.length > 0) {
    throw new WorkspaceScopeCheckError(
      `pnpm resolved ${outOfScope.length} workspace package(s) OUTSIDE the current repo root (${REPO_ROOT}):\n` +
        outOfScope.map((path) => `  - ${path}`).join('\n') +
        `\n\n  This is the worktree-isolation defect: a package outside the current checkout\n` +
        `  means a subsequent step (build, lint, publish) can read or write another\n` +
        `  worktree's files. Check pnpm-workspace.yaml's package globs and any script\n` +
        `  using an absolute or ../-relative path instead of one anchored at this\n` +
        `  script's REPO_ROOT.\n`,
    );
  }

  console.log(`[check:workspace-scope] PASS — ${paths.length} workspace package(s), all inside ${REPO_ROOT}`);
};

try {
  main();
} catch (error) {
  if (error instanceof WorkspaceScopeCheckError) {
    console.error(`[check:workspace-scope] FAIL: ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`[check:workspace-scope] FAIL: ${error.message}`);
    if (error.stdout) {
      console.error(error.stdout.toString());
    }
    if (error.stderr) {
      console.error(error.stderr.toString());
    }
  } else {
    console.error('[check:workspace-scope] FAIL: unknown error', error);
  }
  process.exit(1);
}
