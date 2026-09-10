#!/usr/bin/env node

import { existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ConversionOptions } from '@sammons/typed-mind-tree-sitter-common';
import { runCli, TreeSitterParser } from '@sammons/typed-mind-tree-sitter-common';
import { RustAnalyzer } from './rust-analyzer.ts';
import { RustConverter } from './rust-converter.ts';
import { findCargoToml } from './rust-project.ts';

const PACKAGE_DIR = dirname(dirname(fileURLToPath(import.meta.url)));

// Bridge: the shared CLI creates analyzer and converter separately, but the
// Rust converter needs the analyzer's Cargo.toml data. We capture the last
// created analyzer instance.
let lastAnalyzer: RustAnalyzer | undefined;

async function main(): Promise<void> {
  const wasmPath = join(PACKAGE_DIR, 'grammar', 'tree-sitter-rust.wasm');
  if (!existsSync(wasmPath)) {
    console.error(`WASM grammar not found at ${wasmPath} — run 'pnpm run build:wasm' first`);
    process.exit(1);
  }

  const parser = await TreeSitterParser.create(wasmPath);

  await runCli({
    languageName: 'Rust',
    binaryName: 'typed-mind-rs',
    createAnalyzer: (projectPath: string, _configPath?: string) => {
      lastAnalyzer = new RustAnalyzer(projectPath, parser);
      return lastAnalyzer;
    },
    createConverter: (options: ConversionOptions) => {
      return new RustConverter(options, lastAnalyzer);
    },
    resolveProjectPath: (input: string) => {
      const inputPath = resolve(input);
      if (!existsSync(inputPath)) {
        throw new Error(`Project path does not exist: ${inputPath}`);
      }
      const stats = statSync(inputPath);
      if (stats.isFile()) {
        if (inputPath.endsWith('Cargo.toml')) {
          return { projectPath: dirname(inputPath) };
        }
        throw new Error(`File must be a Cargo.toml: ${inputPath}`);
      }
      if (stats.isDirectory()) {
        const cargoPath = findCargoToml(inputPath);
        if (cargoPath === undefined) {
          throw new Error(`No Cargo.toml found at or above ${inputPath}`);
        }
        return { projectPath: inputPath };
      }
      throw new Error(`Invalid project path: ${inputPath}`);
    },
    resolveEntrypoint: (projectPath: string, entrypoint: string) => {
      const projectRelative = resolve(projectPath, entrypoint);
      if (existsSync(projectRelative)) return projectRelative;

      const cwdRelative = resolve(process.cwd(), entrypoint);
      if (existsSync(cwdRelative)) return cwdRelative;

      const libRs = join(projectPath, 'src', 'lib.rs');
      if (existsSync(libRs)) return libRs;

      const mainRs = join(projectPath, 'src', 'main.rs');
      if (existsSync(mainRs)) return mainRs;

      throw new Error(`Entry point not found: ${entrypoint}. Tried ${projectRelative} and ${cwdRelative}`);
    },
  });
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
