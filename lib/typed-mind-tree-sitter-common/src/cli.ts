import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { TypedMind } from '@sammons/typed-mind';
import { ASSERTION_CODES, type AssertionCode } from './assertion-codes.ts';
import { AssertionEngine } from './assertion-engine.ts';
import type { ConversionOptions, ConversionResult, ProjectAnalysis } from './types.ts';

export interface Analyzer {
  analyzeFromEntrypoint(entrypoint: string): ProjectAnalysis;
}

export interface Converter {
  convert(analysis: ProjectAnalysis): ConversionResult;
}

export interface LanguageCliConfig {
  languageName: string;
  binaryName: string;
  createAnalyzer: (projectPath: string, configPath?: string) => Analyzer;
  createConverter: (options: ConversionOptions) => Converter;
  resolveProjectPath: (input: string) => { projectPath: string; configPath?: string };
  resolveEntrypoint: (projectPath: string, entrypoint: string) => string;
}

const CLI_OPTIONS = {
  help: { type: 'boolean' as const, short: 'h', description: 'Show help' },
  project: { type: 'string' as const, description: 'Project directory or config file path (required)' },
  input: { type: 'string' as const, description: 'Input TypedMind file for assert command' },
  entrypoint: { type: 'string' as const, description: 'Entry point file (required)' },
  output: { type: 'string' as const, short: 'o', description: 'Output file path for export' },
  'include-private': { type: 'boolean' as const, description: 'Include private members in analysis' },
  'no-programs': { type: 'boolean' as const, description: 'Do not generate Program entities' },
  version: { type: 'string' as const, description: 'Version for generated Program entities (default: 1.0.0)' },
  verbose: { type: 'boolean' as const, short: 'v', description: 'Verbose output' },
  format: { type: 'string' as const, description: 'Output format for assert command: human (default) or json' },
};

type CliValues = ReturnType<typeof parseArgs<{ options: typeof CLI_OPTIONS; allowPositionals: true }>>['values'];

function showHelp(config: LanguageCliConfig): void {
  console.log(`
TypedMind ${config.languageName} Bridge - Extract architecture from ${config.languageName} codebases

Usage: ${config.binaryName} <command> --project <dir> --entrypoint <file> [options]

Commands:
  export    Export ${config.languageName} project to TypedMind DSL
  assert    Assert ${config.languageName} project matches TypedMind file
  check     Check ${config.languageName} project with TypedMind validator
  explain   Print documentation for a diagnostic code (no --project/--entrypoint needed)

Required Options:
  --project <path>       Project directory or config file path
  --entrypoint <file>    Entry point file

Command-Specific Options:
  --input <file>         Input TypedMind file for assert command (required for assert)
  --output <file>        Output file for export command (optional, defaults to stdout)
  --format <fmt>         Output format for assert: human (default) or json

General Options:
  -h, --help             Show help
  --include-private      Include private members in analysis
  --no-programs          Do not generate Program entities
  --version <version>    Version for generated programs (default: 1.0.0)
  -v, --verbose          Verbose output
`);
}

function validateEntrypoint(resolvedPath: string, originalEntrypoint: string): void {
  if (!existsSync(resolvedPath)) {
    console.error(`Error: entrypoint '${originalEntrypoint}' does not exist (resolved to ${resolvedPath})`);
    process.exit(1);
  }
}

function buildConversionOptions(values: CliValues): ConversionOptions {
  return {
    includePrivateMembers: values['include-private'] || false,
    generatePrograms: !values['no-programs'],
    programVersion: (values.version as string) || '1.0.0',
    ignorePatterns: ['node_modules/**'],
  };
}

async function handleExport(config: LanguageCliConfig, values: CliValues): Promise<void> {
  const { projectPath, configPath } = config.resolveProjectPath(values.project as string);
  const resolvedEntrypoint = config.resolveEntrypoint(projectPath, values.entrypoint as string);
  validateEntrypoint(resolvedEntrypoint, values.entrypoint as string);
  const outputPath = values.output as string | undefined;

  if (values.verbose) {
    console.log(`Analyzing ${config.languageName} project: ${projectPath}`);
    console.log(`Entry point: ${resolvedEntrypoint}`);
  }

  const analyzer = config.createAnalyzer(projectPath, configPath);
  const analysis = analyzer.analyzeFromEntrypoint(resolvedEntrypoint);

  if (values.verbose) {
    console.log(`Found ${analysis.modules.length} modules`);
    console.log(`Entry points: ${analysis.entryPoints.join(', ')}`);
  }

  const converter = config.createConverter(buildConversionOptions(values));
  const result = converter.convert(analysis);

  if (result.warnings.length > 0) {
    console.warn(`\nWarnings (${result.warnings.length}):`);
    for (const warning of result.warnings) {
      console.warn(`  ${warning.message}`);
      if (warning.suggestion) {
        console.warn(`    Suggestion: ${warning.suggestion}`);
      }
    }
  }

  if (!result.success) {
    console.error(`\nConversion failed with ${result.errors.length} error(s):`);
    for (const error of result.errors) {
      console.error(`  ${error.message}`);
      if (error.filePath) {
        console.error(`    File: ${error.filePath}`);
      }
    }

    if (outputPath) {
      writeFileSync(outputPath, result.tmdContent);
      console.error(`\nWrote partial output (${result.entities.length} entities) to ${outputPath}`);
    } else if (result.tmdContent.length > 0) {
      console.log(`\n${result.tmdContent}`);
    }

    process.exit(1);
  }

  if (outputPath) {
    writeFileSync(outputPath, result.tmdContent);
    console.log(`\nExported ${result.entities.length} entities to ${outputPath}`);
  } else {
    console.log(`\n${result.tmdContent}`);
  }

  if (values.verbose) {
    console.log(`\nEntity summary:`);
    const entityCounts = result.entities.reduce(
      (counts, entity) => {
        counts[entity.kind] = (counts[entity.kind] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>,
    );
    for (const [kind, count] of Object.entries(entityCounts)) {
      console.log(`  ${kind}: ${count}`);
    }
  }
}

async function handleAssert(config: LanguageCliConfig, values: CliValues): Promise<void> {
  if (!values.input) {
    throw new Error('Assert command requires --input <file> parameter');
  }

  const { projectPath, configPath } = config.resolveProjectPath(values.project as string);
  const tmdFilePath = resolve(values.input as string);
  const resolvedEntrypoint = config.resolveEntrypoint(projectPath, values.entrypoint as string);
  validateEntrypoint(resolvedEntrypoint, values.entrypoint as string);

  if (values.verbose) {
    console.log(`Comparing ${config.languageName} project ${projectPath} against ${tmdFilePath}`);
    console.log(`Entry point: ${resolvedEntrypoint}`);
  }

  const tmdContent = readFileSync(tmdFilePath, 'utf-8');

  const analyzer = config.createAnalyzer(projectPath, configPath);
  const analysis = analyzer.analyzeFromEntrypoint(resolvedEntrypoint);

  const converter = config.createConverter(buildConversionOptions(values));
  const conversionResult = converter.convert(analysis);

  if (!conversionResult.success) {
    console.error(`Conversion failed:`);
    for (const error of conversionResult.errors) {
      console.error(`  ${error.message}`);
    }
    process.exit(1);
  }

  const assertionEngine = new AssertionEngine();
  const assertionResult = await assertionEngine.assert(conversionResult, tmdFilePath, tmdContent);

  if (values.format && values.format !== 'human' && values.format !== 'json') {
    console.error(`Error: --format must be "human" or "json", got "${values.format}"`);
    process.exit(1);
  }
  const useJson = values.format === 'json';

  if (useJson) {
    for (const deviation of assertionResult.deviations) {
      console.log(JSON.stringify(deviation));
    }
    process.exit(assertionResult.success ? 0 : 1);
  }

  if (assertionResult.success) {
    console.log(`${config.languageName} project matches expected TypedMind architecture`);
    process.exit(0);
  }

  console.error(`${config.languageName} project deviates from expected architecture`);

  const errors = assertionResult.deviations.filter((d) => d.severity === 'error');
  const warnings = assertionResult.deviations.filter((d) => d.severity === 'warning');

  if (errors.length > 0) {
    console.error(`\nErrors (${errors.length}):`);
    for (const deviation of errors) {
      console.error(
        `  [${deviation.code}] ${deviation.entityName}.${deviation.property}: expected ${JSON.stringify(deviation.expected)}, actual ${JSON.stringify(deviation.actual)}`,
      );
      console.error(`    Suggestion: ${deviation.suggestion}`);
      console.error(`    Run \`${config.binaryName} explain ${deviation.code}\` for details.`);
    }
  }

  if (warnings.length > 0 && values.verbose) {
    console.warn(`\nWarnings (${warnings.length}):`);
    for (const deviation of warnings) {
      console.warn(
        `  [${deviation.code}] ${deviation.entityName}.${deviation.property}: expected ${JSON.stringify(deviation.expected)}, actual ${JSON.stringify(deviation.actual)}`,
      );
      console.warn(`    Suggestion: ${deviation.suggestion}`);
      console.warn(`    Run \`${config.binaryName} explain ${deviation.code}\` for details.`);
    }
  }

  process.exit(1);
}

function handleExplain(config: LanguageCliConfig, positionals: string[]): void {
  const [codeArg] = positionals;
  if (!codeArg) {
    console.error(`Usage: ${config.binaryName} explain <code>`);
    console.error('\nAvailable assertion codes:');
    for (const code of Object.keys(ASSERTION_CODES)) {
      console.error(`  ${code}`);
    }
    process.exit(1);
  }

  if (!Object.hasOwn(ASSERTION_CODES, codeArg)) {
    console.error(`Unknown diagnostic code: ${codeArg}`);
    console.error('\nAvailable assertion codes:');
    for (const code of Object.keys(ASSERTION_CODES)) {
      console.error(`  ${code}`);
    }
    process.exit(1);
  }

  const entry = ASSERTION_CODES[codeArg as AssertionCode];
  console.log(`${codeArg}\n`);
  console.log(`Severity: ${entry.severity}`);
  console.log(`Message:  ${entry.message}`);
  console.log(`\nSuggestion: ${entry.suggestion}`);
  console.log(`\n${entry.docBody}`);
}

async function handleCheck(config: LanguageCliConfig, values: CliValues): Promise<void> {
  const { projectPath, configPath } = config.resolveProjectPath(values.project as string);
  const resolvedEntrypoint = config.resolveEntrypoint(projectPath, values.entrypoint as string);
  validateEntrypoint(resolvedEntrypoint, values.entrypoint as string);

  if (values.verbose) {
    console.log(`Checking ${config.languageName} project: ${projectPath}`);
    console.log(`Entry point: ${resolvedEntrypoint}`);
  }

  const analyzer = config.createAnalyzer(projectPath, configPath);
  const analysis = analyzer.analyzeFromEntrypoint(resolvedEntrypoint);

  const converter = config.createConverter(buildConversionOptions(values));
  const conversionResult = converter.convert(analysis);

  if (conversionResult.warnings.length > 0) {
    console.warn(`Conversion warnings (${conversionResult.warnings.length}):`);
    for (const warning of conversionResult.warnings) {
      console.warn(`  ${warning.message}`);
      if (warning.suggestion) {
        console.warn(`    Suggestion: ${warning.suggestion}`);
      }
    }
    console.warn('');
  }

  if (!conversionResult.success) {
    console.error(`Conversion failed with ${conversionResult.errors.length} error(s):`);
    for (const error of conversionResult.errors) {
      console.error(`  ${error.message}`);
    }
    console.error('');
  }

  const typedMind = await TypedMind.create();
  const validationResult = typedMind.check(conversionResult.tmdContent);

  if (validationResult.valid) {
    console.log(`${config.languageName} project architecture is valid`);

    if (values.verbose) {
      console.log(`\nValidated ${conversionResult.entities.length} entities:`);
      const entityCounts = conversionResult.entities.reduce(
        (counts, entity) => {
          counts[entity.kind] = (counts[entity.kind] || 0) + 1;
          return counts;
        },
        {} as Record<string, number>,
      );
      for (const [kind, count] of Object.entries(entityCounts)) {
        console.log(`  ${kind}: ${count}`);
      }
    }

    process.exit(0);
  } else {
    const errorCount = validationResult.diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length;
    console.error(`Architecture validation failed with ${errorCount} error(s):`);

    const entityToFile = new Map<string, string>();
    for (const entity of conversionResult.entities) {
      const path = 'path' in entity ? entity.path : undefined;
      if (typeof path === 'string' && path.length > 0) {
        entityToFile.set(entity.name, path);
      }
    }

    for (const diagnostic of validationResult.diagnostics) {
      const severity = diagnostic.severity === 'warning' ? 'WARNING' : 'ERROR';
      const entityMatch = diagnostic.message.match(/entity '([^']+)'|'([^']+)'.*is not defined/);
      const entityName = entityMatch ? entityMatch[1] || entityMatch[2] : null;
      const sourceFile = entityName ? entityToFile.get(entityName) : null;

      if (sourceFile) {
        console.error(`  ${severity} in ${sourceFile}: ${diagnostic.message}`);
      } else {
        console.error(`  ${severity}: ${diagnostic.message}`);
      }
    }

    process.exit(1);
  }
}

export async function runCli(config: LanguageCliConfig): Promise<void> {
  let parsed: ReturnType<typeof parseArgs<{ options: typeof CLI_OPTIONS; allowPositionals: true }>>;

  try {
    parsed = parseArgs({
      options: CLI_OPTIONS,
      allowPositionals: true,
    });
  } catch (error) {
    console.error('Error parsing arguments:', error);
    showHelp(config);
    process.exit(1);
  }

  const { values, positionals } = parsed;

  if (values.help) {
    showHelp(config);
    process.exit(0);
  }

  const [command, ...restPositionals] = positionals;

  if (!command) {
    console.error('Error: No command specified');
    showHelp(config);
    process.exit(1);
  }

  if (command === 'explain') {
    handleExplain(config, restPositionals);
    return;
  }

  if (!values.project) {
    console.error('Error: --project parameter is required');
    showHelp(config);
    process.exit(1);
  }

  if (!values.entrypoint) {
    console.error('Error: --entrypoint parameter is required');
    showHelp(config);
    process.exit(1);
  }

  try {
    switch (command) {
      case 'export':
        await handleExport(config, values);
        break;
      case 'assert':
        await handleAssert(config, values);
        break;
      case 'check':
        await handleCheck(config, values);
        break;
      default:
        console.error(`Error: Unknown command '${command}'`);
        showHelp(config);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    if (values.verbose) {
      console.error('Stack trace:', error instanceof Error ? error.stack : String(error));
    }
    process.exit(1);
  }
}
