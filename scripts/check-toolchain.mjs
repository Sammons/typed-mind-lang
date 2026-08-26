#!/usr/bin/env node
// RFC-TM-1 (rfc-tm-1-diamond.md) leaf L3.
//
// Verifies the pinned tree-sitter CLI + mise-provisioned wasi-sdk actually produce a wasm build,
// AND that the CLI's own unverified auto-downloader (curl -f -L, no checksum; see
// crates/loader/src/loader.rs:1427-1445 at tag v0.26.13) never fired. A populated fallback cache
// dir after the build means the mise-pinned TREE_SITTER_WASI_SDK_PATH was NOT what got used.
//
// Precondition: `mise install` has already run (satisfied by CI's "Install toolchain" step and by
// convention on dev machines) — this script does not install tools, only resolves and exercises them.
//
// The tree-sitter and wasi-sdk binaries are invoked directly via their `mise where`-resolved paths
// rather than through `mise exec --`, so this script's own ambient `node` (the repo's pinned Node,
// invoked to run this .mjs file) is what tree-sitter's `generate` step uses to load grammar.js.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_TREE_SITTER_VERSION = '0.26.13';
const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

class ToolchainCheckError extends Error {}

const run = (command, args, options = {}) => {
  return execFileSync(command, args, { encoding: 'utf8', cwd: REPO_ROOT, ...options }).trim();
};

const resolveWasiSdkCacheDir = () => {
  // Doc L3: ~/.cache/tree-sitter/wasi-sdk on Linux/XDG, ~/Library/Caches/tree-sitter/wasi-sdk on macOS.
  const home = homedir();
  if (platform() === 'darwin') {
    return join(home, 'Library', 'Caches', 'tree-sitter', 'wasi-sdk');
  }
  return join(home, '.cache', 'tree-sitter', 'wasi-sdk');
};

const isAbsentOrEmpty = (dirPath) => {
  if (!existsSync(dirPath)) {
    return true;
  }
  const stats = statSync(dirPath);
  if (!stats.isDirectory()) {
    return true;
  }
  return readdirSync(dirPath).length === 0;
};

const resolveTreeSitterBin = () => {
  const installDir = run('mise', ['where', 'tree-sitter']);
  if (!installDir) {
    throw new ToolchainCheckError('mise where tree-sitter returned empty output');
  }
  const binPath = join(installDir, 'tree-sitter');
  if (!existsSync(binPath)) {
    throw new ToolchainCheckError(`tree-sitter binary not found at ${binPath}`);
  }
  const versionOutput = run(binPath, ['--version']);
  if (!versionOutput.includes(EXPECTED_TREE_SITTER_VERSION)) {
    throw new ToolchainCheckError(`expected tree-sitter ${EXPECTED_TREE_SITTER_VERSION}, got: ${versionOutput}`);
  }
  console.log(`[check:toolchain] tree-sitter --version OK: ${versionOutput}`);
  return binPath;
};

const resolveWasiSdkPath = () => {
  const wasiSdkPath = run('mise', ['where', 'http:wasi-sdk']);
  if (!wasiSdkPath) {
    throw new ToolchainCheckError('mise where http:wasi-sdk returned empty output');
  }
  const clangPath = join(wasiSdkPath, 'bin', 'clang');
  if (!existsSync(clangPath)) {
    throw new ToolchainCheckError(`clang not found at ${clangPath}`);
  }
  const clangVersion = run(clangPath, ['--version']);
  console.log(`[check:toolchain] wasi-sdk clang OK: ${clangVersion.split('\n')[0]}`);
  return wasiSdkPath;
};

const writeThrowawayGrammar = (grammarDir) => {
  // A local package.json pins CommonJS so grammar.js (which uses the CJS `module.exports` idiom
  // tree-sitter's grammar DSL expects) is not misread as ESM under the repo root's "type": "module".
  writeFileSync(join(grammarDir, 'package.json'), '{"type":"commonjs"}\n');
  const grammarJs = `module.exports = grammar({
  name: 'throwaway_toolchain_check',
  rules: {
    source_file: $ => 'ok',
  },
})
`;
  writeFileSync(join(grammarDir, 'grammar.js'), grammarJs);
};

const main = () => {
  const treeSitterBin = resolveTreeSitterBin();
  const wasiSdkPath = resolveWasiSdkPath();

  const wasiSdkCacheDir = resolveWasiSdkCacheDir();
  const cacheAbsentBefore = isAbsentOrEmpty(wasiSdkCacheDir);
  if (!cacheAbsentBefore) {
    throw new ToolchainCheckError(
      `fallback cache dir ${wasiSdkCacheDir} is already populated before the smoke build — cannot prove isolation`,
    );
  }
  console.log(`[check:toolchain] fallback cache dir ${wasiSdkCacheDir} absent/empty before build (OK)`);

  // Scratch dir lives under the repo root (not the OS tmpdir) so tree-sitter's grammar.js loader,
  // which resolves relative to the invoking process's cwd, sees a stable path.
  const scratchRoot = join(REPO_ROOT, '.tmp-check-toolchain');
  rmSync(scratchRoot, { recursive: true, force: true });
  mkdirSync(scratchRoot, { recursive: true });
  const grammarDir = mkdtempSync(join(scratchRoot, 'grammar-'));
  try {
    writeThrowawayGrammar(grammarDir);

    // Both generate and build run with cwd = grammarDir. tree-sitter's default `generate` (no
    // --output flag) writes parser.c/grammar.json/node-types.json under <cwd>/src/ — RELATIVE to
    // the invoking process's cwd, not relative to the grammar.js path given — matching the frozen
    // grammar directory contract (lib/typed-mind/grammar/ with generated sources under its src/).
    // `build --wasm` then internally chdirs into that src/ dir before spawning clang; skipping this
    // default and flattening the output makes that chdir target nonexistent, which surfaces as a
    // misleading "Failed to run wasi-sdk clang -- No such file or directory" at process-spawn time
    // instead of a clear "missing src/" error.
    run(treeSitterBin, ['generate', 'grammar.js'], { cwd: grammarDir });
    console.log('[check:toolchain] tree-sitter generate OK');

    const wasmPath = join(grammarDir, 'parser.wasm');
    const env = {
      ...process.env,
      TREE_SITTER_WASI_SDK_PATH: wasiSdkPath,
    };
    run(treeSitterBin, ['build', '--wasm', '.', '--output', 'parser.wasm'], { cwd: grammarDir, env });
    console.log('[check:toolchain] tree-sitter build --wasm OK');

    if (!existsSync(wasmPath)) {
      throw new ToolchainCheckError(`no .wasm file produced at ${wasmPath}`);
    }
    const wasmSize = statSync(wasmPath).size;
    if (wasmSize === 0) {
      throw new ToolchainCheckError(`${wasmPath} is empty`);
    }
    console.log(`[check:toolchain] produced nonempty wasm: ${wasmPath} (${wasmSize} bytes)`);

    const cachePopulatedAfter = !isAbsentOrEmpty(wasiSdkCacheDir);
    if (cachePopulatedAfter) {
      throw new ToolchainCheckError(
        `fallback cache dir ${wasiSdkCacheDir} was populated during the build — the CLI's unverified auto-downloader ran instead of the mise-pinned wasi-sdk`,
      );
    }
    console.log(
      `[check:toolchain] fallback cache dir ${wasiSdkCacheDir} still absent/empty after build (OK — mise-provisioned SDK was used)`,
    );
  } finally {
    rmSync(scratchRoot, { recursive: true, force: true });
  }

  console.log('[check:toolchain] PASS');
};

try {
  main();
} catch (error) {
  if (error instanceof ToolchainCheckError) {
    console.error(`[check:toolchain] FAIL: ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`[check:toolchain] FAIL: ${error.message}`);
    if (error.stdout) {
      console.error(error.stdout.toString());
    }
    if (error.stderr) {
      console.error(error.stderr.toString());
    }
  } else {
    console.error('[check:toolchain] FAIL: unknown error', error);
  }
  process.exit(1);
}
