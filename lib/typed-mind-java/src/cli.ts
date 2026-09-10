#!/usr/bin/env node

import { existsSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { runCli } from '@sammons/typed-mind-tree-sitter-common';
import { JavaAnalyzer } from './java-analyzer.ts';
import { JavaConverter } from './java-converter.ts';

function resolveProjectPath(input: string): { projectPath: string; configPath?: string } {
  const inputPath = resolve(input);

  if (!existsSync(inputPath)) {
    throw new Error(`Project path does not exist: ${inputPath}`);
  }

  const stats = statSync(inputPath);

  if (stats.isFile()) {
    const name = inputPath.split('/').at(-1) ?? '';
    if (name === 'pom.xml' || name === 'build.gradle' || name === 'build.gradle.kts') {
      return {
        projectPath: dirname(inputPath),
        configPath: inputPath,
      };
    }
    throw new Error(`File must be a pom.xml or build.gradle file: ${inputPath}`);
  }

  if (stats.isDirectory()) {
    return { projectPath: inputPath };
  }

  throw new Error(`Invalid project path: ${inputPath}`);
}

function resolveEntrypoint(projectPath: string, entrypoint: string): string {
  const projectRelative = resolve(projectPath, entrypoint);
  if (existsSync(projectRelative)) return projectRelative;

  const cwdRelative = resolve(process.cwd(), entrypoint);
  if (existsSync(cwdRelative)) return cwdRelative;

  throw new Error(
    `Entry point file not found: ${entrypoint}\n` +
      `Attempted:\n` +
      `  1. Relative to project: ${projectRelative}\n` +
      `  2. Relative to cwd: ${cwdRelative}\n`,
  );
}

// Parse --project from argv before runCli so we can pre-init the async parser.
const args = process.argv.slice(2);
const projectIdx = args.indexOf('--project');
const projectArg = projectIdx >= 0 ? args[projectIdx + 1] : undefined;

async function main(): Promise<void> {
  // Pre-initialize the analyzer if --project is specified. The Analyzer
  // interface is sync but tree-sitter WASM init is async; pre-init here
  // so the sync createAnalyzer factory returns an already-initialized instance.
  let preInitialized: JavaAnalyzer | undefined;
  if (projectArg !== undefined) {
    const { projectPath, configPath } = resolveProjectPath(projectArg);
    preInitialized = await JavaAnalyzer.create(projectPath, configPath);
  }

  await runCli({
    languageName: 'Java',
    binaryName: 'typed-mind-java',
    createAnalyzer: (projectPath: string, configPath?: string) => {
      if (preInitialized !== undefined) return preInitialized;
      return new JavaAnalyzer(projectPath, configPath);
    },
    createConverter: (options) => new JavaConverter(options),
    resolveProjectPath,
    resolveEntrypoint,
  });
}

main().catch((error: unknown) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
