#!/usr/bin/env node

import { existsSync, statSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { runCli } from '@sammons/typed-mind-tree-sitter-common';
import { PythonAnalyzer } from './python-analyzer.ts';
import { PythonConverter } from './python-converter.ts';
import { findProjectRoot } from './python-project.ts';

function resolveProjectPath(input: string): { projectPath: string; configPath?: string } {
  const inputPath = resolve(input);
  if (!existsSync(inputPath)) {
    throw new Error(`Project path does not exist: ${inputPath}`);
  }
  const stats = statSync(inputPath);
  if (stats.isFile()) {
    const ext = extname(inputPath);
    if (ext === '.toml' && inputPath.includes('pyproject')) {
      return { projectPath: dirname(inputPath), configPath: inputPath };
    }
    if (ext === '.py') {
      return { projectPath: findProjectRoot(inputPath) };
    }
    throw new Error(`File must be pyproject.toml or a .py file: ${inputPath}`);
  }
  return { projectPath: inputPath };
}

function resolveEntrypoint(projectPath: string, entrypoint: string): string {
  const projectRelative = resolve(projectPath, entrypoint);
  if (existsSync(projectRelative)) return projectRelative;
  const cwdRelative = resolve(process.cwd(), entrypoint);
  if (existsSync(cwdRelative)) return cwdRelative;
  throw new Error(`Entry point not found: ${entrypoint}\n  Tried: ${projectRelative}\n  Tried: ${cwdRelative}`);
}

const args = process.argv.slice(2);
const projectIdx = args.indexOf('--project');
const projectArg = projectIdx >= 0 ? args[projectIdx + 1] : undefined;

async function main(): Promise<void> {
  let preInitialized: PythonAnalyzer | undefined;
  if (projectArg !== undefined) {
    const { projectPath, configPath } = resolveProjectPath(projectArg);
    preInitialized = await PythonAnalyzer.create(projectPath, configPath);
  }

  await runCli({
    languageName: 'Python',
    binaryName: 'typed-mind-py',
    createAnalyzer: (projectPath, configPath) => {
      if (preInitialized !== undefined) return preInitialized;
      return new PythonAnalyzer(projectPath, configPath);
    },
    createConverter: (options) => new PythonConverter(options),
    resolveProjectPath,
    resolveEntrypoint,
  });
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
