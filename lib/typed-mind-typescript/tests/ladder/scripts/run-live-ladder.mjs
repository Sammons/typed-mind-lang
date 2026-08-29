#!/usr/bin/env node
// RFC-TM-9 §8, X-LADDER-2 — the mission-exit live re-evaluation script.
//
// This is NOT a CI-gated test. Per the RFC's resolved X-LADDER-2 shape,
// live tailnet clones of real target repos stay OUT of CI — this script
// is the documented, repeatable mechanism a human or an agent runs by
// hand at mission exit (and, per D-X3, at any future drift re-run) to
// produce the structured comparison table that lands in a vault note.
//
// It re-runs the extractor (this package's built CLI) against the same
// five real targets the 2026-08-27 census baseline used, using the
// CURRENT (post RFC-TM-8/RFC-TM-9) extractor + checker build, and prints
// a machine-readable JSON report plus a human-readable summary table to
// stdout. It does not write into any target repo; all `.tmd` output goes
// to a scratch directory the caller supplies.
//
// Usage:
//   node tests/ladder/scripts/run-live-ladder.mjs \
//     --webhookstorage-clone /path/to/fresh/webhookstorage/clone \
//     --claude-home /path/to/claude-home \
//     --typed-mind-lang /path/to/typed-mind-lang \
//     --out-dir /path/to/scratch/output/dir
//
// All four paths are required except --claude-home and --typed-mind-lang,
// which default to sibling/self locations when omitted (see
// worktreeAwareRepoRoot() below — issue #79, fixed: the --claude-home
// default now walks up past a `.claude/worktrees/<slug>` ancestor before
// computing the sibling path, so running the script from inside a worktree
// resolves the same real claude-home checkout a normal checkout would) —
// pass them explicitly when running from a different checkout shape (e.g.
// a fully separate clone rather than a sibling directory).
//
// Targets (fixed list, matches the 2026-08-27 baseline exactly):
//   1. self         — the extractor's own source (lib/typed-mind-typescript)
//   2. core         — the typed-mind core lib (lib/typed-mind)
//   3. claude-home  — claude-home tooling (.claude/skills/notion, the
//                     notion-client.ts entrypoint — the baseline's
//                     working v2 attempt, not the dynamic-import
//                     entrypoint.ts dispatcher, which is a KNOWN silent-
//                     degenerate-output case the baseline already isolated)
//   4. sammons-io   — SKIPPED, no valid target (Jekyll static site, zero
//                     .ts/.tsx files); recorded as a skip row, not run.
//   5. webhookstorage — 6 real entrypoints across the pnpm workspace,
//                     matching the baseline's rung-5 entrypoint list.
//
// Environment note carried over from the baseline run-log: this box's
// mise-installed pnpm binary is a macOS Mach-O binary that cannot install
// packages under this Linux environment's /tmp layout. The webhookstorage
// clone is installed with the system npm instead, via the same workaround
// documented in the baseline (catalog: -> concrete semver, workspace:* ->
// deleted, per-package installs, manual @webhookstorage/core symlinks).
// This script performs that workaround itself so a future re-run is fully
// automated — see installWebhookstorageDeps() below. It touches ONLY the
// caller-supplied clone directory, never the real webhookstorage repo.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const LADDER_DIR = dirname(SCRIPT_DIR);
const TS_PACKAGE_DIR = dirname(dirname(LADDER_DIR));
const REPO_ROOT = dirname(dirname(TS_PACKAGE_DIR));

// issue #79 — REPO_ROOT (above) is derived from the script's OWN file
// location, which is correct for --typed-mind-lang's default (the script
// always lives inside the repo it wants to point at, worktree or not) but
// WRONG for --claude-home's default when the script runs from inside a
// worktree (`.claude/worktrees/<slug>/`, the mandated flow per this repo's
// own `never_edit_files_on_main` rule): REPO_ROOT then resolves to the
// WORKTREE root, and `resolve(REPO_ROOT, '..', 'claude-home')` looks for a
// nonexistent sibling inside the worktrees directory, not the real
// claude-home checkout that sits beside the repo's TRUE root.
//
// Fix: walk up past any `.claude/worktrees/<slug>` ancestor segment before
// computing the sibling default. A normal (non-worktree) checkout has no
// such segment, so `worktreeAwareRepoRoot` returns REPO_ROOT unchanged and
// the default behaves exactly as before.
const worktreeAwareRepoRoot = (repoRoot) => {
  const segments = repoRoot.split('/');
  const worktreesIndex = segments.lastIndexOf('worktrees');
  if (worktreesIndex >= 2 && segments[worktreesIndex - 1] === '.claude') {
    // Walk up past `.claude/worktrees/<slug>` to the real repo root the
    // worktree was created from.
    return segments.slice(0, worktreesIndex - 1).join('/') || '/';
  }
  return repoRoot;
};

const { values: args } = parseArgs({
  options: {
    'webhookstorage-clone': { type: 'string' },
    'claude-home': { type: 'string', default: resolve(worktreeAwareRepoRoot(REPO_ROOT), '..', 'claude-home') },
    'typed-mind-lang': { type: 'string', default: REPO_ROOT },
    'out-dir': { type: 'string' },
  },
});

if (!args['webhookstorage-clone'] || !args['out-dir']) {
  console.error(
    'Usage: run-live-ladder.mjs --webhookstorage-clone <path> --out-dir <path> [--claude-home <path>] [--typed-mind-lang <path>]',
  );
  process.exit(1);
}

const WEBHOOKSTORAGE_CLONE = resolve(args['webhookstorage-clone']);
const CLAUDE_HOME = resolve(args['claude-home']);
const TM_LANG = resolve(args['typed-mind-lang']);
const OUT_DIR = resolve(args['out-dir']);
mkdirSync(OUT_DIR, { recursive: true });

const EXTRACTOR_CLI = join(TM_LANG, 'lib', 'typed-mind-typescript', 'dist', 'cli.js');
const CHECKER_CLI = join(TM_LANG, 'lib', 'typed-mind-cli', 'dist', 'cli.js');

if (!existsSync(EXTRACTOR_CLI) || !existsSync(CHECKER_CLI)) {
  console.error(`Build the CLIs first: pnpm run build (looked for ${EXTRACTOR_CLI} and ${CHECKER_CLI})`);
  process.exit(1);
}

/** @typedef {{ code: string; message: string; severity: 'error' | 'warning' }} DiagnosticSummary */
/** @typedef {{
 *   target: string;
 *   command: string;
 *   exportSuccess: boolean;
 *   exitCode: number;
 *   entityCount: number | null;
 *   checkerVerdict: 'pass' | 'fail' | 'not-run' | 'skipped';
 *   diagnostics: DiagnosticSummary[];
 *   suppressionCounts: Record<string, number>;
 *   notes: string[];
 * }} RungResult */

// Resolve the running node/npm via process.execPath / PATH lookup rather
// than a hardcoded /usr/bin/* path. The prior hardcode was a workaround for
// a specific host whose mise-installed pnpm was a macOS Mach-O binary that
// could not run under this Linux box's /tmp layout (see header note) — but
// /usr/bin/node and /usr/bin/npm are not guaranteed to exist at all on a
// mise-only host (e.g. crankshaft, where node/npm resolve only via mise
// shims on PATH). process.execPath is always the real node binary running
// this script; npm is resolved the same way node itself would be found on
// PATH, so both work whether the host uses a system install or mise shims.
const NODE_BIN = process.execPath;
const NPM_BIN = (() => {
  const found = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['npm'], { encoding: 'utf8' });
  const resolved = found.status === 0 ? found.stdout.split('\n')[0].trim() : '';
  return resolved || 'npm';
})();

const runNode = (scriptPath, cliArgs, cwd) => {
  const result = spawnSync(NODE_BIN, [scriptPath, ...cliArgs], { cwd, encoding: 'utf8' });
  return result;
};

const countEntities = (tmdPath) => {
  if (!existsSync(tmdPath)) return null;
  const content = readFileSync(tmdPath, 'utf8');
  // Declaration sigils per lib/typed-mind/grammar/grammar.js: Program `->`,
  // Dependency `^`, File `@`, ClassFile `#:`, Class `<:`, DTO `%`,
  // Function `::` (bare-name shortform) or `!` (arrow/typed-Constants
  // shortform), TypeDef `=`. `::` must be checked before the single-char
  // sigils so it is not mistaken for two separate matches.
  const sigilLines = content.split('\n').filter((line) => /^[A-Za-z_][A-Za-z0-9_]*\s*(::|->|<:|#:|%|!|@|=)/.test(line.trim()));
  return sigilLines.length;
};

const parseCheckerOutput = (stdout, stderr) => {
  const text = `${stdout}\n${stderr}`;
  /** @type {DiagnosticSummary[]} */
  const diagnostics = [];
  for (const line of text.split('\n')) {
    const errorMatch = line.match(/^(ERROR|WARNING) at line \d+, col \d+: (.+)$/);
    if (errorMatch) {
      diagnostics.push({
        code: 'unclassified',
        message: errorMatch[2].trim(),
        severity: errorMatch[1] === 'ERROR' ? 'error' : 'warning',
      });
    }
  }
  return diagnostics;
};

const runChecker = (tmdPath) => {
  if (!existsSync(tmdPath)) {
    return { verdict: /** @type {const} */ ('not-run'), diagnostics: [] };
  }
  const result = runNode(CHECKER_CLI, ['--check', tmdPath], TM_LANG);
  const diagnostics = parseCheckerOutput(result.stdout ?? '', result.stderr ?? '');
  return { verdict: result.status === 0 ? 'pass' : 'fail', diagnostics };
};

const countSuppressions = (tmdPath) => {
  if (!existsSync(tmdPath)) return {};
  const content = readFileSync(tmdPath, 'utf8');
  /** @type {Record<string, number>} */
  const counts = {};
  // Shortform per lib/typed-mind/src/emitter/emit-suppression.ts:
  // `suppress Target checker/code "reason"` — no colon after `suppress`,
  // the reason is the trailing quoted string. Longform block entries omit
  // the leading `suppress` keyword; this scan covers the shortform only,
  // matching what the extractor's CLI emits per RFC-TM-9 X-SUPP-6.
  const suppressionRe = /^suppress\s+\S+\s+\S+\s+"([^"]*)"/gm;
  for (const match of content.matchAll(suppressionRe)) {
    counts[match[1]] = (counts[match[1]] ?? 0) + 1;
  }
  return counts;
};

/**
 * Runs one extraction and returns a structured RungResult.
 * @returns {RungResult}
 */
const runExtraction = (target, command, cliArgs, cwd, outputName, extraNotes = []) => {
  const outputPath = join(OUT_DIR, outputName);
  const fullArgs = ['export', ...cliArgs, '--output', outputPath];
  const result = runNode(EXTRACTOR_CLI, fullArgs, cwd);
  const exportSuccess = result.status === 0 && existsSync(outputPath);
  const entityCount = exportSuccess ? countEntities(outputPath) : null;
  const checker = exportSuccess ? runChecker(outputPath) : { verdict: /** @type {const} */ ('not-run'), diagnostics: [] };
  const suppressionCounts = exportSuccess ? countSuppressions(outputPath) : {};
  const notes = [...extraNotes];
  if (!exportSuccess) {
    // result.error is set instead of result.status when spawnSync itself
    // fails to launch the process (e.g. ENOENT on a missing /usr/bin/node);
    // surface that reason explicitly rather than silently reporting a null
    // exit code with empty stdout/stderr.
    const reason = result.error ? result.error.message : (result.stderr || result.stdout || '').split('\n').slice(0, 3).join(' | ');
    notes.push(`extractor exit ${result.status}: ${reason}`);
  }
  return {
    target,
    command,
    exportSuccess,
    exitCode: result.status ?? -1,
    entityCount,
    checkerVerdict: checker.verdict,
    diagnostics: checker.diagnostics,
    suppressionCounts,
    notes,
  };
};

// --- Webhookstorage dependency install workaround (see header note) -----

const installWebhookstorageDeps = (cloneDir) => {
  const catalogYaml = readFileSync(join(cloneDir, 'pnpm-workspace.yaml'), 'utf8');
  /** @type {Record<string, string>} */
  const catalog = {};
  let inCatalog = false;
  for (const line of catalogYaml.split('\n')) {
    if (/^catalog:/.test(line)) {
      inCatalog = true;
      continue;
    }
    if (inCatalog) {
      const entryMatch = line.match(/^\s{2}['"]?([\w@/.-]+)['"]?:\s*['"]?([^'"\n]+?)['"]?\s*$/);
      if (entryMatch) {
        catalog[entryMatch[1]] = entryMatch[2].trim();
        continue;
      }
      if (!/^\s/.test(line) && line.trim() !== '') inCatalog = false;
    }
  }

  const patchPackageJson = (pkgPath) => {
    const raw = readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(raw);
    for (const depField of ['dependencies', 'devDependencies']) {
      const deps = pkg[depField];
      if (!deps) continue;
      for (const [name, version] of Object.entries(deps)) {
        if (version === 'catalog:' && catalog[name]) {
          deps[name] = catalog[name];
        } else if (typeof version === 'string' && version.startsWith('workspace:')) {
          delete deps[name];
        }
      }
    }
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  };

  patchPackageJson(join(cloneDir, 'package.json'));
  const packagesDir = join(cloneDir, 'packages');
  const packageDirs = existsSync(packagesDir) ? readdirSync(packagesDir) : [];
  for (const pkgName of packageDirs) {
    const pkgJsonPath = join(packagesDir, pkgName, 'package.json');
    if (existsSync(pkgJsonPath)) patchPackageJson(pkgJsonPath);
  }

  spawnSync(NPM_BIN, ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--legacy-peer-deps'], {
    cwd: cloneDir,
    stdio: 'inherit',
  });
  for (const pkgName of packageDirs) {
    const pkgDir = join(packagesDir, pkgName);
    if (existsSync(join(pkgDir, 'package.json'))) {
      spawnSync(NPM_BIN, ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--legacy-peer-deps'], {
        cwd: pkgDir,
        stdio: 'inherit',
      });
    }
  }
  // Replicate workspace hoisting for @webhookstorage/core consumers.
  for (const pkgName of ['functions', 'ingest', 'outbound-delivery', 'web']) {
    const consumerNodeModules = join(packagesDir, pkgName, 'node_modules', '@webhookstorage');
    const linkTarget = join(packagesDir, 'core');
    const linkPath = join(consumerNodeModules, 'core');
    if (existsSync(linkTarget) && !existsSync(linkPath)) {
      mkdirSync(consumerNodeModules, { recursive: true });
      try {
        symlinkSync(linkTarget, linkPath, 'dir');
      } catch {
        // best-effort; a missing symlink surfaces as an extraction defect,
        // which is itself an accurate signal, not a script bug to hide.
      }
    }
  }
};

// --- Run the five targets -------------------------------------------------

/** @type {RungResult[]} */
const results = [];

// 1. Self-extraction
results.push(
  runExtraction(
    'self (typed-mind-typescript)',
    `export --project lib/typed-mind-typescript/tsconfig.json --entrypoint src/cli.ts`,
    [
      '--project',
      join(TM_LANG, 'lib/typed-mind-typescript/tsconfig.json'),
      '--entrypoint',
      join(TM_LANG, 'lib/typed-mind-typescript/src/cli.ts'),
    ],
    TM_LANG,
    'live-01-self-extraction.tmd',
  ),
);

// 2. typed-mind core
results.push(
  runExtraction(
    'core (typed-mind)',
    `export --project lib/typed-mind/tsconfig.json --entrypoint src/typed-mind.ts`,
    ['--project', join(TM_LANG, 'lib/typed-mind/tsconfig.json'), '--entrypoint', join(TM_LANG, 'lib/typed-mind/src/typed-mind.ts')],
    TM_LANG,
    'live-02-typed-mind-core.tmd',
  ),
);

// 3. claude-home tooling (notion-client.ts — the baseline's successful v2
// entrypoint; entrypoint.ts is a KNOWN dynamic-import degenerate case,
// unrelated to this re-run's purpose of measuring fixed-defect delta).
const synthTsconfigPath = join(OUT_DIR, 'claude-home-synth-tsconfig.json');
const claudeHomeNotionScripts = join(CLAUDE_HOME, '.claude/skills/notion/scripts');
writeFileSync(
  synthTsconfigPath,
  JSON.stringify(
    {
      compilerOptions: {
        target: 'es2022',
        module: 'nodenext',
        moduleResolution: 'nodenext',
        strict: true,
        skipLibCheck: true,
        allowJs: false,
        noEmit: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        types: ['node'],
      },
      include: [join(claudeHomeNotionScripts, '**/*.ts')],
    },
    null,
    2,
  ),
);
results.push(
  runExtraction(
    'claude-home (.claude/skills/notion)',
    `export --project <synth-tsconfig> --entrypoint notion-client.ts`,
    ['--project', synthTsconfigPath, '--entrypoint', join(claudeHomeNotionScripts, 'notion-client.ts')],
    TM_LANG,
    'live-03-claude-home-tooling.tmd',
  ),
);

// 4. sammons.io UI — SKIPPED (no TS/TSX source; static Jekyll site).
results.push({
  target: 'sammons.io UI (Sammons.github.io)',
  command: '(skipped — no .ts/.tsx files)',
  exportSuccess: false,
  exitCode: 0,
  entityCount: null,
  checkerVerdict: 'skipped',
  diagnostics: [],
  suppressionCounts: {},
  notes: ['Static Jekyll site (index.html, javascripts/*.js). No TypeScript source exists. Baseline (2026-08-27) recorded the same skip.'],
});

// 5. webhookstorage — six real entrypoints across the workspace.
installWebhookstorageDeps(WEBHOOKSTORAGE_CLONE);

const webhookstorageEntrypoints = [
  {
    name: 'webhookstorage/ingest (packages/ingest/src/app.ts)',
    project: 'packages/ingest/tsconfig.json',
    entry: 'packages/ingest/src/app.ts',
    output: 'live-05a-webhookstorage-ingest.tmd',
  },
  {
    name: 'webhookstorage/functions-api (packages/functions/src/api/index.ts)',
    project: 'packages/functions/tsconfig.json',
    entry: 'packages/functions/src/api/index.ts',
    output: 'live-05b-webhookstorage-api.tmd',
  },
  {
    name: 'webhookstorage/web-main (packages/web/src/main.tsx)',
    project: 'packages/web/tsconfig.json',
    entry: 'packages/web/src/main.tsx',
    output: 'live-05c-webhookstorage-web-main.tmd',
  },
  {
    name: 'webhookstorage/web-app (packages/web/src/App.tsx)',
    project: 'packages/web/tsconfig.json',
    entry: 'packages/web/src/App.tsx',
    output: 'live-05d-webhookstorage-web-app.tmd',
  },
  {
    name: 'webhookstorage/ops-cli (packages/ops/src/cli.ts)',
    project: 'packages/ops/tsconfig.json',
    entry: 'packages/ops/src/cli.ts',
    output: 'live-05e-webhookstorage-ops-cli.tmd',
  },
  {
    name: 'webhookstorage/outbound-delivery (packages/outbound-delivery/src/index.ts)',
    project: 'packages/outbound-delivery/tsconfig.json',
    entry: 'packages/outbound-delivery/src/index.ts',
    output: 'live-05f-webhookstorage-outbound.tmd',
  },
];

for (const ep of webhookstorageEntrypoints) {
  const args = [
    '--project',
    join(WEBHOOKSTORAGE_CLONE, ep.project),
    '--entrypoint',
    join(WEBHOOKSTORAGE_CLONE, ep.entry),
    '--recognize',
    'sst-handler',
  ];
  results.push(
    runExtraction(ep.name, `export --project ${ep.project} --entrypoint ${ep.entry} --recognize sst-handler`, args, TM_LANG, ep.output),
  );
}

// sst.config.ts — same environmental-prerequisite skip the baseline hit
// (.sst/platform/config.d.ts only materializes after a live `sst` run,
// which this script correctly never attempts).
results.push({
  target: 'webhookstorage/sst-config (sst.config.ts)',
  command: '(skipped — .sst/platform/config.d.ts requires a live `sst` CLI run against real AWS credentials)',
  exportSuccess: false,
  exitCode: 0,
  entityCount: null,
  checkerVerdict: 'skipped',
  diagnostics: [],
  suppressionCounts: {},
  notes: [
    'sst.config.ts references ./.sst/platform/config.d.ts via a triple-slash directive; .sst/ is generated lazily by `sst dev`/`sst deploy`, which this script does not run (would touch live AWS infra under the webhookstorage-prod account guard). Baseline (2026-08-27) hit the same environmental prerequisite.',
  ],
});

// --- Report ---------------------------------------------------------------

writeFileSync(join(OUT_DIR, 'live-ladder-report.json'), JSON.stringify(results, null, 2));

console.log('\n=== RFC-TM-9 X-LADDER-2 live re-run report ===\n');
for (const r of results) {
  console.log(`--- ${r.target} ---`);
  console.log(`  command: ${r.command}`);
  console.log(`  export success: ${r.exportSuccess}  entities: ${r.entityCount ?? 'n/a'}`);
  console.log(`  checker verdict: ${r.checkerVerdict}`);
  if (r.diagnostics.length > 0) {
    console.log(`  diagnostics (${r.diagnostics.length}):`);
    for (const d of r.diagnostics.slice(0, 20)) console.log(`    [${d.severity}] ${d.message}`);
    if (r.diagnostics.length > 20) console.log(`    ... and ${r.diagnostics.length - 20} more`);
  }
  if (Object.keys(r.suppressionCounts).length > 0) {
    console.log(`  suppressions: ${JSON.stringify(r.suppressionCounts)}`);
  }
  for (const note of r.notes) console.log(`  note: ${note}`);
  console.log('');
}
console.log(`Full JSON report: ${join(OUT_DIR, 'live-ladder-report.json')}`);
