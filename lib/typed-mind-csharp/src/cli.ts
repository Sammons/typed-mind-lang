#!/usr/bin/env node
// CLI entry point for typed-mind-cs.

import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runCli, TreeSitterParser } from '@sammons/typed-mind-tree-sitter-common';
import { CSharpAnalyzer } from './csharp-analyzer.ts';
import { CSharpConverter } from './csharp-converter.ts';
import { resolveProjectConfig } from './csharp-project.ts';

const GRAMMAR_PATH = new URL('../grammar/tree-sitter-c_sharp.wasm', import.meta.url).pathname;

// Initialize tree-sitter parser once before CLI dispatch.
const parser = await TreeSitterParser.create(GRAMMAR_PATH);

await runCli({
  languageName: 'C#',
  binaryName: 'typed-mind-cs',
  createAnalyzer: (projectPath: string, configPath?: string) => new CSharpAnalyzer(projectPath, parser, configPath),
  createConverter: (options) => new CSharpConverter(options),
  resolveProjectPath: (input: string) => {
    const { projectPath, configPath } = resolveProjectConfig(input);
    return { projectPath, configPath };
  },
  resolveEntrypoint: (projectPath: string, entrypoint: string) => {
    const absPath = resolve(projectPath, entrypoint);
    if (existsSync(absPath)) return absPath;

    // Try finding the file in the project directory
    if (entrypoint.endsWith('.cs')) return resolve(projectPath, entrypoint);

    // Look for Program.cs or the entrypoint name as a .cs file
    const candidates = [
      join(projectPath, `${entrypoint}.cs`),
      join(projectPath, 'Program.cs'),
      join(projectPath, `${entrypoint}/Program.cs`),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate;
    }
    return resolve(projectPath, entrypoint);
  },
});
